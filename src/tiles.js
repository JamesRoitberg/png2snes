export function sliceTiles({
  pixels,
  width,
  height,
  tileW,
  tileH,
  palette,
}) {
  const tiles = [];
  const tilesX = width / tileW;
  const tilesY = height / tileH;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tilePixels = [];

      // vamos descobrir qual subpaleta este tile usa
      let tilePalette = null;

      for (let y = 0; y < tileH; y++) {
        const row = [];
        for (let x = 0; x < tileW; x++) {
          const px = tx * tileW + x;
          const py = ty * tileH + y;
          const p = pixels[py * width + px];

          const colorIndex = palette.findColorIndex(p);

          // deduz subpaleta a partir do índice absoluto
          const subPalette = Math.floor(
            colorIndex / palette.colorsPerSub
          );

          // fixa a paleta do tile (1ª cor válida decide)
          if (tilePalette === null && p.a !== 0) {
            tilePalette = subPalette;
          }

          row.push(colorIndex);
        }
        tilePixels.push(row);
      }

      // fallback seguro
      if (tilePalette === null) {
        tilePalette = palette.subBase;
      }

      tiles.push({
        tilePixels,
        mapX: tx,
        mapY: ty,
        palette: tilePalette, // AGORA EXISTE
      });
    }
  }

  return {
    tiles,
    tilesX,
    tilesY,
  };
}
