import { Buffer } from "node:buffer";

export function buildTilemap({
  width,
  height,
  tileW,
  tileH,
  tileRefs,
  tipo,
}) {
  const tilesX = width / tileW;
  const tilesY = height / tileH;

  const words = new Uint16Array(tilesX * tilesY);

  for (const ref of tileRefs) {
    const {
      tileIndex,
      hflip,
      vflip,
      palette = 0, // fallback seguro
      mapX,
      mapY,
    } = ref;
    const priority = 0;

    let word = 0;
    word |= tileIndex & 0x03ff;
    if (hflip) word |= 1 << 10;
    if (vflip) word |= 1 << 11;
    if (priority) word |= 1 << 12;
    word |= (palette & 0x7) << 13;

    const index = mapY * tilesX + mapX;
    words[index] = word;
  }

  const buf = Buffer.alloc(words.length * 2);
  for (let i = 0; i < words.length; i++) {
    buf.writeUInt16LE(words[i], i * 2);
  }
  return buf;
}

export function buildMetatileMap({
  width,
  height,
  tileW,
  tileH,
  metaW,
  metaH,
  tileRefs,
}) {
  if (metaW % tileW !== 0 || metaH % tileH !== 0) {
    throw new Error("Metatile não é múltipla do tile base.");
  }
  const tilesX = width / tileW;
  const tilesY = height / tileH;

  const metaTilesX = tilesX / (metaW / tileW);
  const metaTilesY = tilesY / (metaH / tileH);

  const grid = Array.from({ length: tilesY }, () =>
    new Array(tilesX).fill(null)
  );
  for (const r of tileRefs) {
    grid[r.mapY][r.mapX] = {
      tileIndex: r.tileIndex,
      hflip: r.hflip,
      vflip: r.vflip,
    };
  }

  const metas = [];
  for (let my = 0; my < metaTilesY; my++) {
    for (let mx = 0; mx < metaTilesX; mx++) {
      const tiles = [];
      for (let y = 0; y < metaH / tileH; y++) {
        const row = [];
        for (let x = 0; x < metaW / tileW; x++) {
          const gx = mx * (metaW / tileW) + x;
          const gy = my * (metaH / tileH) + y;
          row.push(grid[gy][gx]);
        }
        tiles.push(row);
      }
      metas.push({
        x: mx,
        y: my,
        tiles,
      });
    }
  }

  return {
    metaW,
    metaH,
    tileW,
    tileH,
    metaTilesX,
    metaTilesY,
    metas,
  };
}
