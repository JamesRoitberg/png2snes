#!/usr/bin/env node
/**
 * combine-indexed.js
 *
 * Junta vários PNGs indexados (color type 3) preservando índices/paletas:
 * - Cada entrada (parte) tem até 16 cores (índices 0..15).
 * - A paleta final é a concatenação das paletas das partes (blocos de 16).
 * - Os pixels da parte i são deslocados por i*16 (offset), sem reordenar cores.
 * - Composição por “camadas” no mesmo (0,0): índice 0 de cada parte é tratado como transparente (não pinta).
 * - Saída sempre como PNG indexado 8bpp (até 256 cores), para simplificar.
 *
 * Limitações:
 * - Aceita apenas PNGs palettized (IHDR colorType=3), NÃO interlaced (interlace=0).
 * - Mantém PLTE/tRNS e índices exatos; não usa decodificadores RGBA (ex.: pngjs), pois eles perdem os índices.
 *
 * Uso:
 *   node combine-indexed.js stage-part1.png stage-part2.png stage-part3.png
 *   -> gera stage-final.png na mesma pasta do primeiro arquivo (ou <primeiro>-final.png)
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ------------------------- utils -------------------------

function die(msg) {
  console.error("combine-indexed - erro:", msg);
  process.exit(1);
}

function readU32BE(buf, off) {
  return buf.readUInt32BE(off);
}

function writeU32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

// CRC32 (PNG chunk CRC) — polinômio padrão 0xEDB88320
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type4, data) {
  if (type4.length !== 4) die("chunk type inválido");
  const typeBuf = Buffer.from(type4, "ascii");
  const lenBuf = writeU32BE(data.length);
  const crcBuf = writeU32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

// ------------------------- PNG decode (indexed) -------------------------

function parsePngIndexed(fileBuf, fileNameForErrors = "input.png") {
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (fileBuf.length < 8 || !fileBuf.subarray(0, 8).equals(sig)) {
    die(`${fileNameForErrors} não parece ser PNG (assinatura inválida)`);
  }

  let off = 8;
  let ihdr = null;
  let plte = null;
  let trns = null;
  const idatParts = [];

  while (off + 8 <= fileBuf.length) {
    const len = readU32BE(fileBuf, off); off += 4;
    const type = fileBuf.subarray(off, off + 4).toString("ascii"); off += 4;
    if (off + len + 4 > fileBuf.length) die(`${fileNameForErrors} PNG truncado no chunk ${type}`);
    const data = fileBuf.subarray(off, off + len); off += len;
    const crcRead = readU32BE(fileBuf, off); off += 4;

    // (Opcional) validar CRC
    const crcCalc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
    if ((crcCalc >>> 0) !== (crcRead >>> 0)) {
      die(`${fileNameForErrors} CRC inválido no chunk ${type} (esperado ${crcCalc >>> 0}, veio ${crcRead >>> 0})`);
    }

    if (type === "IHDR") {
      if (len !== 13) die(`${fileNameForErrors} IHDR com tamanho inválido`);
      ihdr = {
        width: readU32BE(data, 0),
        height: readU32BE(data, 4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "PLTE") {
      plte = Buffer.from(data); // RGB triplets
    } else if (type === "tRNS") {
      trns = Buffer.from(data); // alpha per palette entry (only for indexed)
    } else if (type === "IDAT") {
      idatParts.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
  }

  if (!ihdr) die(`${fileNameForErrors} sem IHDR`);
  if (ihdr.colorType !== 3) die(`${fileNameForErrors} não é palettized (colorType=${ihdr.colorType}). Precisa ser indexado.`);
  if (ihdr.compression !== 0 || ihdr.filter !== 0) die(`${fileNameForErrors} PNG com parâmetros incomuns (compression/filter)`);
  if (ihdr.interlace !== 0) die(`${fileNameForErrors} PNG interlaced não suportado (interlace=1). Exporte sem interlace.`);
  if (!plte) die(`${fileNameForErrors} sem PLTE (paleta)`);
  if (idatParts.length === 0) die(`${fileNameForErrors} sem IDAT`);

  const paletteSize = plte.length / 3;
  if (plte.length % 3 !== 0) die(`${fileNameForErrors} PLTE inválido`);
  if (paletteSize > 256) die(`${fileNameForErrors} PLTE > 256 cores (inválido)`);
  if (![1, 2, 4, 8].includes(ihdr.bitDepth)) {
    die(`${fileNameForErrors} bitDepth ${ihdr.bitDepth} não suportado (somente 1,2,4,8 em indexed)`);
  }

  // Inflate image data
  const idat = Buffer.concat(idatParts);
  let inflated;
  try {
    inflated = zlib.inflateSync(idat);
  } catch (e) {
    die(`${fileNameForErrors} falha ao descompactar IDAT: ${e.message}`);
  }

  const { width, height, bitDepth } = ihdr;
  const rowPackedBytes = ceilDiv(width * bitDepth, 8);
  const expected = height * (1 + rowPackedBytes);
  if (inflated.length !== expected) {
    // Alguns PNGs podem ter chunks extras; mas aqui o formato normal bate.
    die(
      `${fileNameForErrors} tamanho inesperado após inflate: ${inflated.length}, esperado ${expected}. ` +
      `Talvez PNG com filtro/interlace diferente.`
    );
  }

  // Unfilter scanlines -> packed indices per row
  const packed = Buffer.alloc(height * rowPackedBytes);
  let inOff = 0;
  let prev = Buffer.alloc(rowPackedBytes, 0);

  for (let y = 0; y < height; y++) {
    const filterType = inflated[inOff++];

    const cur = Buffer.from(inflated.subarray(inOff, inOff + rowPackedBytes));
    inOff += rowPackedBytes;

    // bytes-per-pixel (em bytes) para filtros = 1 para indexed (independente de bitDepth), mas o “Sub” usa 1 byte à esquerda
    const bpp = 1;

    if (filterType === 0) {
      // None
    } else if (filterType === 1) {
      // Sub
      for (let i = 0; i < rowPackedBytes; i++) {
        const left = i >= bpp ? cur[i - bpp] : 0;
        cur[i] = (cur[i] + left) & 0xFF;
      }
    } else if (filterType === 2) {
      // Up
      for (let i = 0; i < rowPackedBytes; i++) {
        cur[i] = (cur[i] + prev[i]) & 0xFF;
      }
    } else if (filterType === 3) {
      // Average
      for (let i = 0; i < rowPackedBytes; i++) {
        const left = i >= bpp ? cur[i - bpp] : 0;
        const up = prev[i];
        cur[i] = (cur[i] + Math.floor((left + up) / 2)) & 0xFF;
      }
    } else if (filterType === 4) {
      // Paeth
      function paeth(a, b, c) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) return a;
        if (pb <= pc) return b;
        return c;
      }
      for (let i = 0; i < rowPackedBytes; i++) {
        const a = i >= bpp ? cur[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        cur[i] = (cur[i] + paeth(a, b, c)) & 0xFF;
      }
    } else {
      die(`${fileNameForErrors} filterType ${filterType} não suportado`);
    }

    cur.copy(packed, y * rowPackedBytes);
    prev = cur;
  }

  // Unpack indices to 8-bit per pixel
  const indices = new Uint8Array(width * height);
  if (bitDepth === 8) {
    for (let y = 0; y < height; y++) {
      const row = packed.subarray(y * rowPackedBytes, y * rowPackedBytes + rowPackedBytes);
      indices.set(row.subarray(0, width), y * width);
    }
  } else {
    const mask = (1 << bitDepth) - 1;
    for (let y = 0; y < height; y++) {
      const row = packed.subarray(y * rowPackedBytes, y * rowPackedBytes + rowPackedBytes);
      let px = 0;
      for (let i = 0; i < row.length && px < width; i++) {
        const byte = row[i];
        // extrai do MSB para LSB
        for (let shift = 8 - bitDepth; shift >= 0 && px < width; shift -= bitDepth) {
          const idx = (byte >> shift) & mask;
          indices[y * width + px] = idx;
          px++;
        }
      }
    }
  }

  // Build palette RGBA, preservando ordem
  const alphas = new Uint8Array(Math.max(0, paletteSize));
  alphas.fill(255);
  if (trns) {
    for (let i = 0; i < Math.min(trns.length, paletteSize); i++) {
      alphas[i] = trns[i];
    }
  }

  return {
    width,
    height,
    bitDepth,
    paletteSize,
    plte,         // RGB triplets
    trns: trns || Buffer.alloc(0),
    alphas,
    indices,
  };
}

// ------------------------- PNG encode (indexed 8bpp) -------------------------

function encodePngIndexed8({ width, height, paletteRGB, paletteA, indices }) {
  if (paletteRGB.length % 3 !== 0) die("paletteRGB inválida");
  const nColors = paletteRGB.length / 3;
  if (nColors < 1 || nColors > 256) die("paleta final precisa ter 1..256 cores");
  if (paletteA.length !== nColors) die("paletteA precisa ter o mesmo tamanho da paleta");

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width >>> 0, 0);
  ihdr.writeUInt32BE(height >>> 0, 4);
  ihdr[8] = 8;   // bit depth = 8
  ihdr[9] = 3;   // color type = indexed
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const chunks = [];
  chunks.push(makeChunk("IHDR", ihdr));
  chunks.push(makeChunk("PLTE", Buffer.from(paletteRGB)));
  // Sempre escrever tRNS completo (nColors bytes). OK para indexed.
  chunks.push(makeChunk("tRNS", Buffer.from(paletteA)));

  // IDAT: filtro 0 por linha
  const raw = Buffer.alloc(height * (1 + width));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter byte
    const rowStart = y * width;
    for (let x = 0; x < width; x++) raw[o++] = indices[rowStart + x];
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  chunks.push(makeChunk("IDAT", compressed));
  chunks.push(makeChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat([signature, ...chunks]);
}

// ------------------------- combining logic -------------------------

function suggestOutputName(firstPath) {
  const dir = path.dirname(firstPath);
  const base = path.basename(firstPath, path.extname(firstPath));

  // tenta cortar sufixos comuns: -part1, _part2, part3, etc.
  const m = base.match(/^(.*?)([-_]?part\d+)?$/i);
  const stem = m && m[1] ? m[1] : base;

  return path.join(dir, `${stem}-final.png`);
}

function ensureTileAligned(w, h, name) {
  if (w % 8 !== 0 || h % 8 !== 0) {
    die(`${name} não está alinhado em tiles 8x8 (w=${w}, h=${h}). Ajuste para múltiplos de 8.`);
  }
}

function fixZeroPerTile(outIdx, outW, outH) {
  const tilesX = outW >> 3;
  const tilesY = outH >> 3;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * 8;
      const y0 = ty * 8;

      let base = -1;
      for (let y = 0; y < 8 && base < 0; y++) {
        const row = (y0 + y) * outW;
        for (let x = 0; x < 8; x++) {
          const v = outIdx[row + (x0 + x)];
          if (v !== 0) { base = v & 0xF0; break; }
        }
      }
      if (base < 0) continue;

      for (let y = 0; y < 8; y++) {
        const row = (y0 + y) * outW;
        for (let x = 0; x < 8; x++) {
          const p = row + (x0 + x);
          if (outIdx[p] === 0) outIdx[p] = base;
        }
      }
    }
  }
}

function main(argv) {
  const args = argv.slice(2).filter(a => !a.startsWith("-"));
  if (args.length < 1) {
    die("uso: node combine-indexed.js part1.png part2.png ...");
  }
  if (args.length > 16) {
    die("máximo de 16 partes (16*16 = 256 cores).");
  }

  const parts = args.map((p) => {
    const buf = fs.readFileSync(p);
    const png = parsePngIndexed(buf, p);

    ensureTileAligned(png.width, png.height, p);

    if (png.paletteSize > 16) die(`${p} tem ${png.paletteSize} cores na paleta (precisa ser <= 16)`);
    // valida índices usados
    let maxIdx = 0;
    for (let i = 0; i < png.indices.length; i++) {
      const v = png.indices[i];
      if (v > maxIdx) maxIdx = v;
      if (v > 15) die(`${p} tem pixel com índice ${v} (precisa ser 0..15)`);
    }
    if (maxIdx >= png.paletteSize) {
      die(`${p} usa índice ${maxIdx}, mas PLTE tem só ${png.paletteSize} entradas. Reexporte garantindo paleta completa.`);
    }

    // Normaliza paleta para exatamente 16 entradas, sem reordenar:
    // - se vier com menos de 16, pad com (0,0,0) e alpha 255
    const palRGB = Buffer.alloc(16 * 3, 0);
    const palA = Buffer.alloc(16, 255);

    // copia as entradas existentes
    png.plte.copy(palRGB, 0, 0, png.paletteSize * 3);
    for (let i = 0; i < png.paletteSize; i++) palA[i] = png.alphas[i];

    return {
      path: p,
      width: png.width,
      height: png.height,
      palRGB,
      palA,
      indices: png.indices, // 0..15
    };
  });

  // Canvas final: maior largura/altura
  let outW = 0, outH = 0;
  for (const part of parts) {
    outW = Math.max(outW, part.width);
    outH = Math.max(outH, part.height);
  }
  ensureTileAligned(outW, outH, "canvas final");

  // Paleta global = concatenação (16 por parte)
  const nParts = parts.length;
  const nColors = nParts * 16;
  if (nColors > 256) die("paleta final excede 256 cores (reduza número de partes).");

  const paletteRGB = Buffer.alloc(nColors * 3);
  const paletteA = Buffer.alloc(nColors);

  for (let i = 0; i < nParts; i++) {
    parts[i].palRGB.copy(paletteRGB, i * 16 * 3);
    parts[i].palA.copy(paletteA, i * 16);
  }

  // Índices finais 8bpp
  const outIdx = new Uint8Array(outW * outH);
  outIdx.fill(0);

  // - trata índice 0 de cada parte como transparente: não pinta
  // - partes posteriores sobrescrevem anteriores quando índice != 0
  for (let pi = 0; pi < nParts; pi++) {
    const part = parts[pi];
    const offset = pi * 16;

    const w = part.width;
    const h = part.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const src = part.indices[y * w + x]; // 0..15
        if (src === 0) continue;             // transparente no merge
        outIdx[y * outW + x] = (src + offset) & 0xFF;
      }
    }
  }

  fixZeroPerTile(outIdx, outW, outH);

  const outPath = suggestOutputName(args[0]);
  const outPng = encodePngIndexed8({
    width: outW,
    height: outH,
    paletteRGB,
    paletteA,
    indices: outIdx,
  });

  fs.writeFileSync(outPath, outPng);
  console.log("OK:", outPath);
}

main(process.argv);
