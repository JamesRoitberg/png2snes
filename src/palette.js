import fs from "node:fs";

// Converte RGB 0-255 para SNES BGR555 (15 bits)
function rgbToBgr555(r, g, b) {
  const R = (r >> 3) & 0x1f;
  const G = (g >> 3) & 0x1f;
  const B = (b >> 3) & 0x1f;
  return (B << 10) | (G << 5) | R;
}

export async function buildPalette({
  pixels,
  maxColors,
  bpp,
  paletteFile,
  tipo,
  palIndex,
}) {
  // =========================================================
  // 1) COLETA DE CORES (PNG INDEXADO → ORDEM SAGRADA)
  // =========================================================

  let colors = [];

  if (paletteFile) {
    const ext = paletteFile.split(".").pop().toLowerCase();
    const buf = await fs.promises.readFile(paletteFile);

    if (ext === "pal") {
      if (buf.length % 2 !== 0) {
        throw new Error(".pal inválido.");
      }
      for (let i = 0; i < buf.length; i += 2) {
        const value = buf[i] | (buf[i + 1] << 8);
        colors.push({
          r: (value & 0x1f) << 3,
          g: ((value >> 5) & 0x1f) << 3,
          b: ((value >> 10) & 0x1f) << 3,
          a: 255,
          snes: value,
        });
      }
    } else if (ext === "txt") {
      const lines = buf
        .toString("utf8")
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"));

      for (const line of lines) {
        const m = line.match(/(\d+)\s+(\d+)\s+(\d+)/);
        if (!m) continue;
        const r = +m[1], g = +m[2], b = +m[3];
        colors.push({
          r, g, b, a: 255,
          snes: rgbToBgr555(r, g, b)
        });
      }
    } else {
      throw new Error("Paleta deve ser .pal ou .txt");
    }
  } else {
    // PNG indexado: coleta na ordem do GIMP
    const seen = new Set();
    for (const p of pixels) {
      const key = `${p.r},${p.g},${p.b},${p.a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      colors.push({
        r: p.r,
        g: p.g,
        b: p.b,
        a: p.a,
        snes: rgbToBgr555(p.r, p.g, p.b),
      });
    }
  }

  if (colors.length > maxColors) {
    throw new Error(
      `Imagem tem ${colors.length} cores, máximo permitido é ${maxColors}`
    );
  }

  // =========================================================
  // 2) CONFIGURAÇÃO SNES
  // =========================================================

  const colorsPerSub =
    bpp === 2 ? 4 :
    bpp === 4 ? 16 :
    256;

  const subBase =
    typeof palIndex === "number"
      ? palIndex
      : tipo === "bg"
      ? 0
      : 8;

  // =========================================================
  // 3) CONSTRUÇÃO DA PALETA (CÓPIA 1:1 DO GIMP)
  // =========================================================

  const palette = [];
  const colorIndexMap = new Map();

  const base = subBase * colorsPerSub;

  // copia exatamente os índices do GIMP
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i];
    const idx = base + i;

    palette[idx] = {
      r: c.r,
      g: c.g,
      b: c.b,
      a: c.a,
      snes: c.snes,
    };

    colorIndexMap.set(
      `${c.r},${c.g},${c.b},${c.a}`,
      idx
    );
  }

  // padding até fechar a subpaleta (não é transparência!)
  for (let i = colors.length; i < colorsPerSub; i++) {
    const idx = base + i;
    palette[idx] = {
      r: 0,
      g: 0,
      b: 0,
      a: 0,
      snes: 0x0000,
    };
  }

  // =========================================================
  // 4) LOOKUP DE ÍNDICE (SEM ADIVINHAR)
  // =========================================================

  function findColorIndex(p) {
    const key = `${p.r},${p.g},${p.b},${p.a}`;
    const idx = colorIndexMap.get(key);
    if (typeof idx === "number") return idx;

    // fallback seguro → índice 0 da subpaleta
    return base;
  }

  return {
    entries: palette,
    findColorIndex,
    colorsPerSub,
    subBase,
    subPalCount: 1,
    bpp,
  };
}
