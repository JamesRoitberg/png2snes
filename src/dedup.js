// src/dedup.js

function tilesEqual(a, b) {
  const h = a.length;
  const w = a[0].length;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const av = a[y][x] ?? 0;
      const bv = b[y][x] ?? 0;

      // BG 4bpp: compara apenas padrão local (0..15). Se ambos parecem 4bpp, mascare.
      // Se aparecer valor > 15 em algum lado (ex.: 8bpp), cai no compare exato.
      const aLooks4bpp = av >= 0 && av <= 15;
      const bLooks4bpp = bv >= 0 && bv <= 15;

      if (aLooks4bpp && bLooks4bpp) {
        if ( (av & 0x0f) !== (bv & 0x0f) ) return false;
      } else {
        if (av !== bv) return false;
      }
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

    // Fonte da verdade (PNG indexado):
    // tileSubpal = (idx >> 4) ignorando cor 0 (tiles.js já entrega isso em t.srcPalette)
    const tileSubpal =
      typeof t?.srcPalette === "number" ? t.srcPalette : 0;

    let foundIndex = -1;
    let hflip = 0;
    let vflip = 0;

    for (let i = 0; i < uniqueTiles.length; i++) {
      const u = uniqueTiles[i].tilePixels;

      // DEDUPE: compara somente padrão local 4bpp (quando aplicável)
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
      uniqueTiles.push({
        tilePixels: base,

        // Para o preview do tileset (exporters.js), mantém a subpaleta “de origem”.
        // Observação: se a mesma forma existir em subpaletas diferentes, o tile único
        // ficará com a srcPalette da primeira ocorrência (o MAP é quem seleciona a paleta).
        srcPalette: tileSubpal,
      });
    }

    tileRefs.push({
      tileIndex: foundIndex,
      hflip,
      vflip,
      mapX: t.mapX,
      mapY: t.mapY,

      // Metadado por ENTRADA do tilemap:
      // NÃO participa da chave de dedupe.
      tileSubpal,

      // Subpaleta FINAL para o tilemap (destino CGRAM):
      // tiles.js já calcula palette = srcPalette + palBase (e palBase para tile vazio).
      // Se não vier, cai num fallback seguro: tileSubpal (sem palBase).
      palette:
        typeof t?.palette === "number" ? t.palette : tileSubpal,
    });
  }

  return {
    uniqueTiles,
    tileRefs,
  };
}
