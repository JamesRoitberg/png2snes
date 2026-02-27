// tools/splitIndexedByEmptyTiles.js
// Split de uma folha PNG INDEXADA (colorType=3, 8-bit) em vários PNGs INDEXADOS,
// separando por "ilhas" de tiles 8x8 não-vazios.
// Um tile é vazio se TODOS os 64 pixels == sepIndex.
// Objetos só se separam se houver pelo menos 1 tile 8x8 vazio entre eles.
// Flood fill usa conectividade 8-direções (diagonais contam como conectado).
//
// Uso:
// node tools/splitIndexedByEmptyTiles.js --in sheet.png --outdir out --name torches --sepIndex 0
// Ex: node split-png/splitPng.js --in ../combine-pngs/bgs/torches.png --outdir ../to-convert/ --name torches --sepIndex 0

//
// Opções:
// --tile 8        (default 8)
// --sepIndex 0    (índice do fundo "vazio"; default 0)
// --pad 2         (zeros no número; default 2)

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// -----------------------------
// CLI
// -----------------------------
function parseArgs(argv) {
  const out = {
    inPath: null,
    outDir: "out",
    name: "split",
    tile: 8,
    sepIndex: 0,
    pad: 2,
    // novo (modo curto)
    dir: null,
    stem: null,
    _outDirSet: false,
    _nameSet: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in") out.inPath = argv[++i];
    else if (a === "--outdir") out.outDir = argv[++i];
    else if (a === "--name") out.name = argv[++i];
    else if (a === "--tile") out.tile = Number(argv[++i]);
    else if (a === "--sepIndex") out.sepIndex = Number(argv[++i]);
    else if (a === "--pad") out.pad = Number(argv[++i]);
    else if (a === "--dir") out.dir = argv[++i];
    else if (a === "--stem") out.stem = argv[++i];
    else throw new Error(`Arg desconhecido: ${a}`);
  }

  // ---- modo curto: --dir + --stem ----
  if (out.stem) {
    const baseDir = out.dir || ".";
    const stemClean = String(out.stem).endsWith(".png")
      ? String(out.stem).slice(0, -4)
      : String(out.stem);

    if (!out.inPath) out.inPath = path.join(baseDir, `${stemClean}.png`);
    if (!out._outDirSet) out.outDir = baseDir;
    if (!out._nameSet) out.name = stemClean;
  }
// ------------------------------------

  if (!out.inPath) {
    throw new Error("Faltou --in <arquivo.png> (ou use --dir <dir> --stem <stem>)");
  }
  if (!Number.isFinite(out.tile) || out.tile <= 0) throw new Error("--tile inválido");
  if (!Number.isFinite(out.sepIndex) || out.sepIndex < 0 || out.sepIndex > 255) throw new Error("--sepIndex inválido");
  if (!Number.isFinite(out.pad) || out.pad < 1) throw new Error("--pad inválido");

  return out;
}

// -----------------------------
// CRC32 (para chunks PNG)
// -----------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function readU32BE(b, o) {
  return (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);

  return Buffer.concat([len, t, data, crc]);
}

// -----------------------------
// PNG parse (indexado, 8-bit, não interlaced)
// -----------------------------
function parsePngIndexed(fileBuf) {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!fileBuf.subarray(0, 8).equals(PNG_SIG)) throw new Error("PNG signature inválida");

  let off = 8;

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let compression = 0;
  let filter = 0;
  let interlace = 0;

  let plte = null;
  let trns = null;
  const idats = [];

  while (off < fileBuf.length) {
    const len = readU32BE(fileBuf, off);
    const type = fileBuf.subarray(off + 4, off + 8).toString("ascii");
    const data = fileBuf.subarray(off + 8, off + 8 + len);
    off = off + 12 + len;

    if (type === "IHDR") {
      width = readU32BE(data, 0);
      height = readU32BE(data, 4);
      bitDepth = data[8];
      colorType = data[9];
      compression = data[10];
      filter = data[11];
      interlace = data[12];

      if (bitDepth !== 8) throw new Error(`bitDepth ${bitDepth} não suportado (precisa 8)`);
      if (colorType !== 3) throw new Error(`colorType ${colorType} não suportado (precisa 3 = indexed)`);
      if (compression !== 0 || filter !== 0) throw new Error("PNG com compression/filter method não suportado");
      if (interlace !== 0) throw new Error("PNG interlaced não suportado");
    } else if (type === "PLTE") {
      plte = Buffer.from(data);
    } else if (type === "tRNS") {
      trns = Buffer.from(data);
    } else if (type === "IDAT") {
      idats.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height) throw new Error("IHDR ausente/ inválido");
  if (!plte) throw new Error("PLTE ausente (PNG indexado precisa PLTE)");
  if (!idats.length) throw new Error("IDAT ausente");

  const compressed = Buffer.concat(idats);
  const raw = zlib.inflateSync(compressed);

  const stride = width; // indexed 8-bit: 1 byte/pixel
  const expected = height * (1 + stride);
  if (raw.length < expected) throw new Error(`IDAT raw menor que esperado: ${raw.length} < ${expected}`);

  function paethPredictor(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  const indices = new Uint8Array(width * height);
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);

  let inOff = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[inOff++];
    raw.copy(cur, 0, inOff, inOff + stride);
    inOff += stride;

    if (f === 0) {
      // None
    } else if (f === 1) {
      for (let x = 0; x < stride; x++) {
        const left = x > 0 ? cur[x - 1] : 0;
        cur[x] = (cur[x] + left) & 0xff;
      }
    } else if (f === 2) {
      for (let x = 0; x < stride; x++) {
        cur[x] = (cur[x] + prev[x]) & 0xff;
      }
    } else if (f === 3) {
      for (let x = 0; x < stride; x++) {
        const left = x > 0 ? cur[x - 1] : 0;
        const up = prev[x];
        cur[x] = (cur[x] + ((left + up) >> 1)) & 0xff;
      }
    } else if (f === 4) {
      for (let x = 0; x < stride; x++) {
        const left = x > 0 ? cur[x - 1] : 0;
        const up = prev[x];
        const upLeft = x > 0 ? prev[x - 1] : 0;
        cur[x] = (cur[x] + paethPredictor(left, up, upLeft)) & 0xff;
      }
    } else {
      throw new Error(`Filtro PNG não suportado: ${f}`);
    }

    indices.set(cur, y * width);
    prev.set(cur);
  }

  return { width, height, plte, trns, indices };
}

// -----------------------------
// PNG write (indexado, filtro 0)
// -----------------------------
function writePngIndexed(outPath, width, height, plte, trns, indices) {
  const parts = [];
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  parts.push(sig);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  parts.push(chunk("IHDR", ihdr));
  parts.push(chunk("PLTE", plte));
  if (trns && trns.length) parts.push(chunk("tRNS", trns));

  const stride = width;
  const raw = Buffer.alloc(height * (1 + stride));
  let o = 0;

  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    const row = indices.subarray(y * width, y * width + width);
    Buffer.from(row).copy(raw, o);
    o += stride;
  }

  const deflated = zlib.deflateSync(raw, { level: 9 });
  parts.push(chunk("IDAT", deflated));
  parts.push(chunk("IEND", Buffer.alloc(0)));

  fs.writeFileSync(outPath, Buffer.concat(parts));
}

function padNum(n, width) {
  const s = String(n);
  if (s.length >= width) return s;
  return "0".repeat(width - s.length) + s;
}

// -----------------------------
// Core split: componentes de tiles não-vazios
// -----------------------------
function splitByNonEmptyTileComponents(src, tile, sepIndex) {
  const { width, height, indices } = src;

  if (width % tile !== 0 || height % tile !== 0) {
    throw new Error(`Imagem precisa ser múltipla de ${tile} (atual: ${width}x${height})`);
  }

  const tilesX = width / tile;
  const tilesY = height / tile;

  function tileIsEmpty(tx, ty) {
    const x0 = tx * tile;
    const y0 = ty * tile;
    for (let y = 0; y < tile; y++) {
      const rowOff = (y0 + y) * width;
      for (let x = 0; x < tile; x++) {
        if (indices[rowOff + (x0 + x)] !== sepIndex) return false;
      }
    }
    return true;
  }

  // máscara: 1 = não-vazio
  const solid = new Uint8Array(tilesX * tilesY);
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      solid[ty * tilesX + tx] = tileIsEmpty(tx, ty) ? 0 : 1;
    }
  }

  const visited = new Uint8Array(tilesX * tilesY);
  const comps = [];

  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1],
  ];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const idx = ty * tilesX + tx;
      if (!solid[idx]) continue;
      if (visited[idx]) continue;

      // BFS
      visited[idx] = 1;
      const queue = [tx, ty];

      let minX = tx;
      let maxX = tx;
      let minY = ty;
      let maxY = ty;

      while (queue.length) {
        const cy = queue.pop();
        const cx = queue.pop();

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= tilesX || ny >= tilesY) continue;

          const ni = ny * tilesX + nx;
          if (!solid[ni]) continue;
          if (visited[ni]) continue;

          visited[ni] = 1;
          queue.push(nx, ny);

          if (nx < minX) minX = nx;
          if (nx > maxX) maxX = nx;
          if (ny < minY) minY = ny;
          if (ny > maxY) maxY = ny;
        }
      }

      comps.push({ tx0: minX, tx1: maxX, ty0: minY, ty1: maxY });
    }
  }

  // ordem: top->bottom, left->right
  comps.sort((a, b) => (a.ty0 - b.ty0) || (a.tx0 - b.tx0));

  // recorta cada bounding box
  const outputs = [];
  for (const c of comps) {
    const outW = (c.tx1 - c.tx0 + 1) * tile;
    const outH = (c.ty1 - c.ty0 + 1) * tile;

    const outIdx = new Uint8Array(outW * outH);
    outIdx.fill(sepIndex);

    const srcX0 = c.tx0 * tile;
    const srcY0 = c.ty0 * tile;

    for (let y = 0; y < outH; y++) {
      const srcRow = (srcY0 + y) * width;
      const dstRow = y * outW;
      for (let x = 0; x < outW; x++) {
        outIdx[dstRow + x] = indices[srcRow + (srcX0 + x)];
      }
    }

    outputs.push({ width: outW, height: outH, indices: outIdx });
  }

  return outputs;
}

// -----------------------------
// Main
// -----------------------------
function main() {
  const args = parseArgs(process.argv);
  fs.mkdirSync(args.outDir, { recursive: true });

  const buf = fs.readFileSync(args.inPath);
  const src = parsePngIndexed(buf);

  const outList = splitByNonEmptyTileComponents(src, args.tile, args.sepIndex);
  if (!outList.length) throw new Error("Nenhum objeto encontrado (confira --sepIndex).");

  for (let i = 0; i < outList.length; i++) {
    const n = padNum(i + 1, args.pad);
    const outPath = path.join(args.outDir, `${args.name}-${n}.png`);
    writePngIndexed(outPath, outList[i].width, outList[i].height, src.plte, src.trns, outList[i].indices);
    console.log("OK:", outPath);
  }
}

main();
