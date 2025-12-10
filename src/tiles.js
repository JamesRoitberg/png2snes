export function sliceTiles({ pixels, width, height, tileW, tileH, palette }) {
  const tiles = [];
  const tilesX = width / tileW;
  const tilesY = height / tileH;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tilePixels = [];
      for (let y = 0; y < tileH; y++) {
        const row = [];
        for (let x = 0; x < tileW; x++) {
          const px = tx * tileW + x;
          const py = ty * tileH + y;
          const p = pixels[py * width + px];
          const idx = palette.findColorIndex(p);
          row.push(idx);
        }
        tilePixels.push(row);
      }
      tiles.push({
        tilePixels,
        mapX: tx,
        mapY: ty,
      });
    }
  }

  return {
    tiles,
    tilesX,
    tilesY,
  };
}
