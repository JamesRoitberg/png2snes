// src/tiles.js

export function sliceTiles({
  pixels,
  indices, // <- NOVO: índices reais do PNG indexado (Uint8Array) quando disponíveis
  width,
  height,
  tileW,
  tileH,
  palette,
  tipo = "bg",
  bpp = 4,

  // Base de subpaleta (0-7 BG, 8-15 sprites). Se não vier, usa palette.subBase ou 0.
  palBase = palette?.subBase ?? 0,
}) {
  const tiles = [];
  const tilesX = width / tileW;
  const tilesY = height / tileH;

  // Detecta se temos índices reais (PNG indexado)
  const hasIndices =
    indices &&
    (indices instanceof Uint8Array || ArrayBuffer.isView(indices)) &&
    indices.length === width * height;

  // Mantém fallback antigo: tenta extrair índice se vier como number / {idx}
  const getRealIndexFromPixel = (p) => {
    if (typeof p === "number") return p;
    if (p && typeof p === "object" && Number.isInteger(p.idx)) return p.idx;
    return null;
  };

  // Quantas cores por subpaleta dependendo do bpp (para decompor idx -> (srcPal, local))
  const colorsPerSub = bpp === 2 ? 4 : bpp === 4 ? 16 : 256;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tilePixels = [];

      // - srcPalette: subpaleta original do PNG (idx / colorsPerSub)
      // - palette: subpaleta final para o tilemap (srcPalette + palBase)
      let tileSrcPalette = null;

      // Se o tile for totalmente vazio (só índice 0 local), fica true
      let allZeroLocal = true;

      for (let y = 0; y < tileH; y++) {
        const row = [];
        for (let x = 0; x < tileW; x++) {
          const px = tx * tileW + x;
          const py = ty * tileH + y;
          const i = py * width + px;

          // =========================================
          // Caminho preferido: índices reais do PNG
          // =========================================
          let idx = null;

          if (hasIndices) {
            idx = indices[i] & 0xff;
          } else {
            // fallback compat: tenta puxar idx de pixels (number/{idx})
            const p = pixels[i];
            idx = getRealIndexFromPixel(p);
          }

          if (idx !== null) {
            // idx é índice "absoluto" no PNG
            // - Em 4bpp BG multi-sub: idx 0..127, srcPal = idx>>4, local = idx&15
            // - Em 2bpp (se usar multi-sub): srcPal = idx>>2, local = idx&3
            // - Em 8bpp: não há subpaleta; local = idx
            let local;
            let srcPal;

            if (bpp === 8) {
              local = idx; // 0..255
              srcPal = 0;
            } else {
              // colorsPerSub é 4 (2bpp) ou 16 (4bpp)
              local = idx & (colorsPerSub - 1);
              srcPal = idx >> (bpp === 2 ? 2 : 4);
            }

            if (local !== 0) allZeroLocal = false;

            // Mantém sua regra atual: 1º pixel não-zero fixa a srcPalette
            if (tileSrcPalette === null && local !== 0) {
              tileSrcPalette = srcPal;
            }

            row.push(local);
          } else {
            // =========================================
            // Fallback antigo: RGBA -> índice via palette.findColorIndex
            // =========================================
            const p = pixels[i];

            const colorIndex = palette.findColorIndex(p);

            // deduz subpaleta a partir do índice absoluto
            const subPalette = Math.floor(colorIndex / palette.colorsPerSub);

            if (tileSrcPalette === null && p?.a !== 0) {
              tileSrcPalette = subPalette;
            }

            // no modo fallback, tilePixels continua sendo "colorIndex" como era antes
            row.push(colorIndex);
          }
        }
        tilePixels.push(row);
      }

      // Regras para tile totalmente vazio (só índice 0 local):
      // srcPalette = 0
      // palette = palBase
      if (tileSrcPalette === null) {
        tileSrcPalette = 0;
      }

      const tilePalette = allZeroLocal ? palBase : tileSrcPalette + palBase;

      tiles.push({
        tilePixels,
        mapX: tx,
        mapY: ty,
        srcPalette: tileSrcPalette,
        palette: tilePalette,
      });
    }
  }

  return {
    tiles,
    tilesX,
    tilesY,
  };
}
