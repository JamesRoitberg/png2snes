function tilesEqual(a, b) {
  const h = a.length;
  const w = a[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }
  return true;
}

function flipH(tile) {
  const h = tile.length;
  const w = tile[0].length;
  const out = [];
  for (let y = 0; y < h; y++) {
    const row = new Array(w);
    for (let x = 0; x < w; x++) {
      row[x] = tile[y][w - 1 - x];
    }
    out.push(row);
  }
  return out;
}

function flipV(tile) {
  const h = tile.length;
  const out = [];
  for (let y = 0; y < h; y++) {
    out[y] = tile[h - 1 - y].slice();
  }
  return out;
}

export function dedupeTiles(sliceResult, mode = "simple", tipo = "bg") {
  const { tiles } = sliceResult;
  const uniqueTiles = [];
  const tileRefs = [];

  // NORMALIZAÇÃO DO MODO (antes de tudo)
  if (tipo === "bg") {
    if (mode === "v" || mode === "full") {
      mode = "h";
    }
  }

  for (const t of tiles) {
    const base = t.tilePixels;
    let foundIndex = -1;
    let hflip = 0;
    let vflip = 0;

    for (let i = 0; i < uniqueTiles.length; i++) {
      const u = uniqueTiles[i].tilePixels;

      if (tilesEqual(base, u)) {
        foundIndex = i;
        break;
      }

      if (mode === "h" || mode === "full") {
        const fh = flipH(u);
        if (tilesEqual(base, fh)) {
          foundIndex = i;
          hflip = 1;
          break;
        }
      }

      if (mode === "full" && tipo !== "bg") {
        const fhv = flipV(flipH(u));
        if (tilesEqual(base, fhv)) {
          foundIndex = i;
          hflip = 1;
          vflip = 1;
          break;
        }
      }
    }

    if (foundIndex === -1 || mode === "none") {
      foundIndex = uniqueTiles.length;
      uniqueTiles.push({ tilePixels: base });
    }

    tileRefs.push({
      tileIndex: foundIndex,
      hflip,
      vflip,
      mapX: t.mapX,
      mapY: t.mapY,
    });
  }

  return {
    uniqueTiles,
    tileRefs,
  };
}
