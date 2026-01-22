// src/tiles.js

export function sliceTiles({
  pixels,
  width,
  height,
  tileW,
  tileH,
  palette,
  // Base de subpaleta (0-7 BG, 8-15 sprites). Se não vier, usa palette.subBase ou 0.
  palBase = palette?.subBase ?? 0,
}) {
  const tiles = [];
  const tilesX = width / tileW;
  const tilesY = height / tileH;

  // Detecta se "pixels" vem com índice real do PNG (ex.: Uint8Array com índices,
  // ou objeto com .idx). Mantém fallback RGBA usando palette.findColorIndex.
  const getRealIndex = (p) => {
    if (typeof p === "number") return p;
    if (p && typeof p === "object" && Number.isInteger(p.idx)) return p.idx;
    return null;
  };

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tilePixels = [];

      // Novos campos:
      // - srcPalette: subpaleta original do PNG (idx >> 4)
      // - palette: subpaleta final para o tilemap (srcPalette + palBase)
      let tileSrcPalette = null;

      // Se o tile for totalmente vazio (só índice 0 local), fica true
      let allZeroLocal = true;

      for (let y = 0; y < tileH; y++) {
        const row = [];
        for (let x = 0; x < tileW; x++) {
          const px = tx * tileW + x;
          const py = ty * tileH + y;
          const p = pixels[py * width + px];

          const idx = getRealIndex(p);

          if (idx !== null) {
            // PNG indexado via índice real:
            const local = idx & 0x0f; // 0..15 (4bpp)
            const srcPal = idx >> 4; // subpaleta original no PNG

            if (local !== 0) allZeroLocal = false;

            // A fonte da verdade da subpaleta é o idx real.
            // A 1ª ocorrência de pixel não-zero fixa a srcPalette do tile.
            if (tileSrcPalette === null && local !== 0) {
              tileSrcPalette = srcPal;
            }

            row.push(local);
          } else {
            // Fallback atual (RGBA -> índice absoluto via palette.findColorIndex)
            const colorIndex = palette.findColorIndex(p);

            // deduz subpaleta a partir do índice absoluto
            const subPalette = Math.floor(colorIndex / palette.colorsPerSub);

            // fixa a "srcPalette" por compatibilidade do preview (aqui equivale à subpaleta deduzida)
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
