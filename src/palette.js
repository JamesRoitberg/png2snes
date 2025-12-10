import fs from "node:fs";

// Converte RGB 0-255 para valor SNES BGR555 (15 bits) em inteiro (0-0x7FFF)
function rgbToBgr555(r, g, b) {
  const R = (r >> 3) & 0x1f;
  const G = (g >> 3) & 0x1f;
  const B = (b >> 3) & 0x1f;
  return (B << 10) | (G << 5) | R;
}

// Antes de montar subpaletas, decidimos se devemos ou não inserir a cor zero.
function adjustColorZero({ colors, colorZero }) {
  const realColorCount = colors.length;

  // Caso 1: já possui 16 cores → NÃO adicionar color zero
  if (realColorCount === 16) {
    return false; // não coloca cor zero
  }

  // Caso 2: possui 15 cores → adicionar color zero automaticamente
  if (realColorCount === 15) {
    return true; // coloca cor zero
  }

  // Caso 3: qualquer outro caso → usa o valor default enviado pelo usuário
  return colorZero;
}

export async function buildPalette({
  pixels,
  maxColors,
  bpp,
  paletteFile,
  tipo,
  palIndex,
  colorZero = true,
}) {
  let colors = [];

  if (paletteFile) {
    const ext = paletteFile.split(".").pop().toLowerCase();
    const buf = await fs.promises.readFile(paletteFile);
    if (ext === "pal") {
      if (buf.length % 2 !== 0) {
        throw new Error(".pal inválido (tamanho não é múltiplo de 2).");
      }
      for (let i = 0; i < buf.length; i += 2) {
        const value = buf[i] | (buf[i + 1] << 8);
        const R = (value & 0x1f) << 3;
        const G = ((value >> 5) & 0x1f) << 3;
        const B = ((value >> 10) & 0x1f) << 3;
        colors.push({ r: R, g: G, b: B, a: 255, snes: value });
      }
    } else if (ext === "txt") {
      const text = buf.toString("utf-8");
      const lines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"));
      for (const line of lines) {
        const m = line.match(/(\d+)\s+(\d+)\s+(\d+)/);
        if (!m) continue;
        const r = Number(m[1]);
        const g = Number(m[2]);
        const b = Number(m[3]);
        const snes = rgbToBgr555(r, g, b);
        colors.push({ r, g, b, a: 255, snes });
      }
    } else {
      throw new Error("Formato de paleta não suportado (use .pal ou .txt).");
    }
  } else {
    const map = new Map();
    for (const p of pixels) {
      const key = `${p.r},${p.g},${p.b},${p.a}`;
      if (!map.has(key)) {
        map.set(key, p);
      }
    }
    for (const p of map.values()) {
      if (p.a === 0) continue;
      const snes = rgbToBgr555(p.r, p.g, p.b);
      colors.push({ r: p.r, g: p.g, b: p.b, a: p.a, snes });
    }
  }

  if (colors.length > maxColors - 1) {
    throw new Error(
      `Imagem/paleta tem ${colors.length} cores, máximo permitido é ${
        maxColors - 1
      } (reservando uma para transparência).`
    );
  }

  colorZero = adjustColorZero({ colors, colorZero });

  // Continuação do código original de construção de paleta:
  const colorsPerSub = bpp === 2 ? 4 : bpp === 4 ? 16 : 256;
  const totalNeeded = colors.length + (colorZero ? 1 : 0);
  const subPalCount = Math.ceil(totalNeeded / colorsPerSub);

  if (tipo === "bg" && subPalCount > 8) {
    throw new Error("BG: máximo de 8 subpaletas de 16 cores (128 cores).");
  }

  const subBase =
    typeof palIndex === "number"
      ? palIndex
      : tipo === "bg"
      ? 0
      : 8; // sprites padrão começam em 8

  const palette = [];
  const colorIndexMap = new Map();

  let globalIndex = subBase * colorsPerSub;

  for (let s = 0; s < subPalCount; s++) {
    if (colorZero) {
      const snesBlack = rgbToBgr555(0, 0, 0);
      palette[globalIndex] = {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
        snes: snesBlack,
      };
      globalIndex++;
    }

    while (globalIndex < (subBase + s + 1) * colorsPerSub) {
      const colorIdx = colorIndexMap.size;
      if (colorIdx >= colors.length) break;

      const color = colors[colorIdx];
      const snes = color.snes ?? rgbToBgr555(color.r, color.g, color.b);

      palette[globalIndex] = { ...color, snes };
      colorIndexMap.set(
        `${color.r},${color.g},${color.b},${color.a}`,
        globalIndex
      );
      globalIndex++;

      if (colorIndexMap.size >= colors.length) break;
    }
  }

  // preencher buracos com preto (não afeta estrutura)
  for (let i = 0; i < palette.length; i++) {
    if (!palette[i]) {
      const snesBlack = rgbToBgr555(0, 0, 0);
      palette[i] = { r: 0, g: 0, b: 0, a: 0, snes: snesBlack };
    }
  }

  function findColorIndex(p) {
    if (p.a === 0) return subBase * colorsPerSub;
    const key = `${p.r},${p.g},${p.b},${p.a}`;
    const idx = colorIndexMap.get(key);
    if (typeof idx === "number") return idx;

    let bestIdx = subBase * colorsPerSub;
    let bestDist = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const c = palette[i];
      const dr = c.r - p.r;
      const dg = c.g - p.g;
      const db = c.b - p.b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  return {
    entries: palette,
    findColorIndex,
    colorsPerSub,
    subBase,
    subPalCount,
    bpp,
  };
}
