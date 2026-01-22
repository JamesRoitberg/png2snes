// src/palette.js
import fs from "node:fs";

// Converte RGB 0-255 para SNES BGR555 (15 bits)
function rgbToBgr555(r, g, b) {
  const R = (r >> 3) & 0x1f;
  const G = (g >> 3) & 0x1f;
  const B = (b >> 3) & 0x1f;
  return (B << 10) | (G << 5) | R;
}

function rgbaKey(r, g, b, a) {
  return `${r},${g},${b},${a}`;
}

// Tenta iterar pixels RGBA de vários formatos possíveis vindos do loader.
// Chama cb(r,g,b,a) para cada pixel.
function forEachPixelRgba(pixels, cb) {
  // Caso 1: pixels.pixels = Array<{r,g,b,a}>
  if (pixels && Array.isArray(pixels.pixels) && pixels.pixels.length) {
    for (const p of pixels.pixels) cb(p.r | 0, p.g | 0, p.b | 0, (p.a ?? 255) | 0);
    return true;
  }

  // Caso 2: pixels.data / pixels.rgba = Uint8Array/Buffer (RGBA8888)
  const buf =
    (pixels && pixels.data && typeof pixels.data.length === "number" && pixels.data) ||
    (pixels && pixels.rgba && typeof pixels.rgba.length === "number" && pixels.rgba) ||
    null;

  if (buf && buf.length >= 4) {
    for (let i = 0; i + 3 < buf.length; i += 4) {
      cb(buf[i] | 0, buf[i + 1] | 0, buf[i + 2] | 0, buf[i + 3] | 0);
    }
    return true;
  }

  return false;
}

// Coleta cores usadas observando pixels RGBA (sem ordenar/reindexar).
function collectUsedColorKeys(pixels) {
  const used = new Set();
  const ok = forEachPixelRgba(pixels, (r, g, b, a) => {
    used.add(rgbaKey(r, g, b, a));
  });
  return { used, ok };
}

// Decide se pode filtrar "apenas cores usadas" com segurança para BG multi-subpal.
// Regra: se queremos múltiplas subpaletas 4bpp (blocos de 16) estáveis,
// NÃO filtramos, para não colapsar índices e quebrar o MAP.
function shouldFilterUsedColors({ tipo, bpp, sourceColorsLen, maxColors }) {
  // sprites 4bpp geralmente querem compacto (1 subpal)
  if (tipo === "sprite") return true;

  // 8bpp: normalmente o índice é absoluto 0..255; filtrar pode quebrar
  if (bpp === 8) return false;

  // BG 2bpp: raramente multi-subpal; ainda assim, conservador:
  if (bpp === 2) return false;

  // BG 4bpp:
  // se a imagem tem mais que 16 cores (multi-subpal), NÃO filtrar
  // (mantém a ordem e preserva o índice dentro de cada subpaleta)
  if (bpp === 4) {
    if (sourceColorsLen > 16) return false;
    // se for <=16, pode filtrar com segurança (continua 0..N-1)
    return true;
  }

  // fallback conservador
  return false;
}

export async function buildPalette({
  pixels,
  maxColors,
  bpp,
  paletteFile,
  tipo,     // "bg" | "sprite"
  palIndex, // legado (NÃO usado como offset)
}) {
  // =========================================================
  // 1) COLETA DE CORES (ORDEM SAGRADA: PLTE/GIMP OU ARQUIVO)
  // =========================================================

  const sourceColors = [];

  if (paletteFile) {
    const ext = paletteFile.split(".").pop().toLowerCase();
    const buf = await fs.promises.readFile(paletteFile);

    if (ext === "pal") {
      if (buf.length % 2 !== 0) throw new Error(".pal inválido.");
      for (let i = 0; i < buf.length; i += 2) {
        const value = buf[i] | (buf[i + 1] << 8); // LE
        const r = (value & 0x1f) << 3;
        const g = ((value >> 5) & 0x1f) << 3;
        const b = ((value >> 10) & 0x1f) << 3;
        sourceColors.push({ r, g, b, a: 255, snes: value });
      }
    } else if (ext === "txt") {
      const lines = buf
        .toString("utf8")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));

      for (const line of lines) {
        const m = line.match(/(\d+)\s+(\d+)\s+(\d+)/);
        if (!m) continue;
        const r = +m[1], g = +m[2], b = +m[3];
        sourceColors.push({ r, g, b, a: 255, snes: rgbToBgr555(r, g, b) });
      }
    } else {
      throw new Error("Paleta deve ser .pal ou .txt");
    }
  } else {
    // PNG indexado: usar EXATAMENTE a paleta do PNG (PLTE)
    if (!pixels || !pixels.palette || !Array.isArray(pixels.palette)) {
      throw new Error("PNG indexado esperado, mas a paleta não foi fornecida pelo loader.");
    }

    for (const c of pixels.palette) {
      sourceColors.push({
        r: c.r,
        g: c.g,
        b: c.b,
        a: c.a ?? 255,
        snes: rgbToBgr555(c.r, c.g, c.b),
      });
    }
  }

  if (sourceColors.length === 0) {
    throw new Error("Nenhuma cor encontrada para construir a paleta.");
  }

  if (sourceColors.length > maxColors) {
    throw new Error(
      `Imagem tem ${sourceColors.length} cores, máximo permitido é ${maxColors}`
    );
  }

  // =========================================================
  // 2) “APENAS CORES USADAS” (SÓ QUANDO NÃO QUEBRA ÍNDICES DO MAP)
  //    - Para BG 4bpp multi-subpal (ex.: 64 cores), NÃO filtra.
  //    - Para sprite (ou BG <=16), filtra mantendo ordem sagrada.
  // =========================================================

  const { used: usedKeys, ok: gotPixels } = collectUsedColorKeys(pixels);

  const canFilter =
    gotPixels &&
    usedKeys.size > 0 &&
    shouldFilterUsedColors({
      tipo,
      bpp,
      sourceColorsLen: sourceColors.length,
      maxColors,
    });

  const filteredColors = canFilter
    ? sourceColors.filter((c) => usedKeys.has(rgbaKey(c.r, c.g, c.b, c.a)))
    : sourceColors.slice();

  if (filteredColors.length === 0) {
    // fallback: mantém a cor 0 (ordem sagrada)
    filteredColors.push(sourceColors[0]);
  }

  // =========================================================
  // 3) METADADOS SNES (SEM OFFSET ABSOLUTO NA PALETA)
  // =========================================================

  const colorsPerSub = bpp === 2 ? 4 : bpp === 4 ? 16 : 256;
  const subPalCount = Math.max(1, Math.ceil(filteredColors.length / colorsPerSub));

  // =========================================================
  // 4) ENTRIES COMPACTO (0..N-1) + MAPA RGBA->INDEX COMPACTO
  // =========================================================

  const entries = new Array(filteredColors.length);
  const colorIndexMap = new Map();

  for (let i = 0; i < filteredColors.length; i++) {
    const c = filteredColors[i];
    entries[i] = { r: c.r, g: c.g, b: c.b, a: c.a, snes: c.snes };
    colorIndexMap.set(rgbaKey(c.r, c.g, c.b, c.a), i);
  }

  // =========================================================
  // 5) LOOKUP DE ÍNDICE (COMPACTO, SEM DESLOCAMENTO)
  // =========================================================

  function findColorIndex(p) {
    const key = rgbaKey(p.r | 0, p.g | 0, p.b | 0, (p.a ?? 255) | 0);
    const idx = colorIndexMap.get(key);
    return typeof idx === "number" ? idx : 0;
  }

  // =========================================================
  // 6) METADATA ÚTIL PRO EXPORT/ASM (SEM AFETAR ÍNDICES)
  // =========================================================
  // - numColors: quantas cores serão exportadas no .pal
  // - numSubpals: quantas subpaletas (4bpp => 16 cores cada)
  // - didFilterUsedColors: se compactou por "usadas"
  const numColors = entries.length;
  const numSubpals = subPalCount;

  return {
    entries,
    findColorIndex,
    colorsPerSub,
    subPalCount,
    bpp,

    // metadata extra (não quebra compatibilidade e ajuda no asm)
    numColors,
    numSubpals,
    didFilterUsedColors: canFilter,

    // legados (não usar como offset!)
    subBase: 0,
    tipo,
    palIndex,
  };
}
