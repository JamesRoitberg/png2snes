// src/imageLoader.js (ESM)
// Carrega PNG (indexado ou RGBA) e retorna:
// { width, height, pixels, palette, indices }
//
// - Se PNG for indexado (colorType=3): extrai os índices reais (Uint8Array)
//   + palette (PLTE + tRNS) e também gera pixels RGBA derivados (compat).
// - Se PNG NÃO for indexado: usa pngjs (RGBA) e mantém o comportamento antigo,
//   retornando indices: null e palette (se pngjs expuser).

import fs from "node:fs";
import zlib from "node:zlib";
import { PNG } from "pngjs";

/**
 * Parseia PNG indexado (colorType=3) sem depender do pngjs para índices.
 * Suporta bitDepth 1/2/4/8, sem interlace (Adam7).
 * Retorna { width, height, bitDepth, indices: Uint8Array, palette: Array<{r,g,b,a}> }.
 */
export function parsePngIndexed(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);

  // PNG signature
  if (
    buf.length < 8 ||
    buf.readUInt32BE(0) !== 0x89504e47 ||
    buf.readUInt32BE(4) !== 0x0d0a1a0a
  ) {
    throw new Error("Não é um PNG válido.");
  }

  let off = 8;

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;

  let plte = null; // Buffer
  let trns = null; // Buffer
  const idats = [];

  while (off + 8 <= buf.length) {
    const length = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;

    if (crcEnd > buf.length) break;

    const chunk = buf.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk.readUInt8(8);
      colorType = chunk.readUInt8(9);
      interlace = chunk.readUInt8(12);
    } else if (type === "PLTE") {
      plte = Buffer.from(chunk);
    } else if (type === "tRNS") {
      trns = Buffer.from(chunk);
    } else if (type === "IDAT") {
      idats.push(Buffer.from(chunk));
    } else if (type === "IEND") {
      break;
    }

    off = crcEnd;
  }

  if (colorType !== 3) {
    throw new Error("PNG não é indexado (colorType != 3).");
  }
  if (!plte) {
    throw new Error("PNG indexado sem chunk PLTE.");
  }
  if (interlace !== 0) {
    throw new Error("PNG indexado interlaçado (Adam7) não suportado.");
  }
  if (bitDepth !== 1 && bitDepth !== 2 && bitDepth !== 4 && bitDepth !== 8) {
    throw new Error(`bitDepth ${bitDepth} não suportado para PNG indexado.`);
  }

  // Palette (PLTE + tRNS)
  const paletteCount = Math.floor(plte.length / 3);
  const palette = new Array(paletteCount);
  for (let i = 0; i < paletteCount; i++) {
    const r = plte[i * 3 + 0];
    const g = plte[i * 3 + 1];
    const b = plte[i * 3 + 2];
    const a = trns && i < trns.length ? trns[i] : 255;
    palette[i] = { r, g, b, a };
  }

  // Inflate IDAT
  const idatAll = Buffer.concat(idats);
  const inflated = zlib.inflateSync(idatAll);

  // Cada scanline: 1 byte de filtro + rowBytes bytes de dados "packed"
  const rowBytes = Math.ceil((width * bitDepth) / 8);
  const expected = height * (1 + rowBytes);
  if (inflated.length < expected) {
    throw new Error("IDAT inflado menor que o esperado (arquivo corrompido?).");
  }

  // Unfilter em bytes (para indexed, bpp em bytes = 1 no stream packed)
  const bpp = 1;
  const raw = Buffer.alloc(height * rowBytes);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  let inOff = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[inOff++];
    const rowIn = inflated.subarray(inOff, inOff + rowBytes);
    inOff += rowBytes;

    const rowOut = raw.subarray(y * rowBytes, (y + 1) * rowBytes);
    const prev =
      y === 0 ? null : raw.subarray((y - 1) * rowBytes, y * rowBytes);

    switch (filter) {
      case 0: // None
        rowIn.copy(rowOut);
        break;

      case 1: // Sub
        for (let i = 0; i < rowBytes; i++) {
          const left = i >= bpp ? rowOut[i - bpp] : 0;
          rowOut[i] = (rowIn[i] + left) & 0xff;
        }
        break;

      case 2: // Up
        for (let i = 0; i < rowBytes; i++) {
          const up = prev ? prev[i] : 0;
          rowOut[i] = (rowIn[i] + up) & 0xff;
        }
        break;

      case 3: // Average
        for (let i = 0; i < rowBytes; i++) {
          const left = i >= bpp ? rowOut[i - bpp] : 0;
          const up = prev ? prev[i] : 0;
          rowOut[i] = (rowIn[i] + ((left + up) >> 1)) & 0xff;
        }
        break;

      case 4: // Paeth
        for (let i = 0; i < rowBytes; i++) {
          const left = i >= bpp ? rowOut[i - bpp] : 0;
          const up = prev ? prev[i] : 0;
          const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
          rowOut[i] = (rowIn[i] + paeth(left, up, upLeft)) & 0xff;
        }
        break;

      default:
        throw new Error(`Filtro PNG desconhecido: ${filter}`);
    }
  }

  // Unpack para índices por pixel
  const indices = new Uint8Array(width * height);
  let p = 0;

  for (let y = 0; y < height; y++) {
    const row = raw.subarray(y * rowBytes, (y + 1) * rowBytes);

    if (bitDepth === 8) {
      for (let x = 0; x < width; x++) indices[p++] = row[x] & 0xff;
      continue;
    }

    if (bitDepth === 4) {
      let x = 0;
      for (let i = 0; i < row.length && x < width; i++) {
        const b = row[i] & 0xff;
        indices[p++] = (b >> 4) & 0x0f;
        x++;
        if (x < width) {
          indices[p++] = b & 0x0f;
          x++;
        }
      }
      continue;
    }

    if (bitDepth === 2) {
      let x = 0;
      for (let i = 0; i < row.length && x < width; i++) {
        const b = row[i] & 0xff;
        for (let s = 6; s >= 0 && x < width; s -= 2) {
          indices[p++] = (b >> s) & 0x03;
          x++;
        }
      }
      continue;
    }

    // bitDepth === 1
    {
      let x = 0;
      for (let i = 0; i < row.length && x < width; i++) {
        const b = row[i] & 0xff;
        for (let s = 7; s >= 0 && x < width; s--) {
          indices[p++] = (b >> s) & 0x01;
          x++;
        }
      }
    }
  }

  return { width, height, bitDepth, indices, palette };
}

/**
 * Carrega o PNG do disco.
 * Retorna:
 * - width, height
 * - pixels: Array<{r,g,b,a}> tamanho width*height (compatível)
 * - palette: null | Array<{r,g,b,a}>
 * - indices: null | Uint8Array(width*height) (índices reais do PNG indexado)
 */
export async function loadPng(filePath) {
  const data = await fs.promises.readFile(filePath);

  // 1) Preferência: se for PNG indexado, extrair índices reais
  try {
    const parsed = parsePngIndexed(data);
    const { width, height, indices, palette } = parsed;

    // Mantém compatibilidade: gera pixels RGBA a partir de (palette + indices)
    const pixels = new Array(width * height);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const c = palette[idx];

      if (!c || c.a === 0) {
        pixels[i] = { r: 0, g: 0, b: 0, a: 0 };
      } else {
        pixels[i] = { r: c.r, g: c.g, b: c.b, a: c.a };
      }
    }

    return { width, height, pixels, palette, indices };
  } catch {
    // não é indexado / não suportado -> fallback RGBA
  }

  // 2) Fallback: PNG RGBA (ou indexado que o parser acima recusou)
  const png = PNG.sync.read(data);
  const { width, height, data: rgba } = png;

  const pixels = new Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    const a = rgba[o + 3];
    pixels[i] = a === 0 ? { r: 0, g: 0, b: 0, a: 0 } : { r, g, b, a };
  }

  // Mantém a lógica antiga: se pngjs expuser uma palette, exporta (sem alpha tRNS)
  let palette = null;
  if (Array.isArray(png.palette)) {
    palette = png.palette.map(([r, g, b]) => ({ r, g, b, a: 255 }));
  }

  return { width, height, pixels, palette, indices: null };
}
