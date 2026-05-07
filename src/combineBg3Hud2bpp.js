import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parsePngIndexed } from "./imageLoader.js";

const COLORS_PER_PART = 4;
const MAX_FINAL_COLORS = 256;

function writeU32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
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

function makeChunk(type4, data) {
  const typeBuf = Buffer.from(type4, "ascii");
  const lenBuf = writeU32BE(data.length);
  const crcBuf = writeU32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePngIndexed8({ width, height, paletteRGB, paletteA, indices }) {
  if (paletteRGB.length % 3 !== 0) {
    throw new Error("paletteRGB invalida.");
  }

  const nColors = paletteRGB.length / 3;
  if (nColors < 1 || nColors > MAX_FINAL_COLORS) {
    throw new Error(`paleta final precisa ter 1..${MAX_FINAL_COLORS} cores.`);
  }
  if (paletteA.length !== nColors) {
    throw new Error("paletteA precisa ter o mesmo tamanho da paleta.");
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width >>> 0, 0);
  ihdr.writeUInt32BE(height >>> 0, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    const rowStart = y * width;
    for (let x = 0; x < width; x++) {
      raw[o++] = indices[rowStart + x];
    }
  }

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("PLTE", Buffer.from(paletteRGB)),
    makeChunk("tRNS", Buffer.from(paletteA)),
    makeChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function getPartPath(part) {
  return typeof part === "string" ? part : part?.path;
}

function validatePartPalette(png, filePath) {
  if (png.palette.length > COLORS_PER_PART) {
    throw new Error(
      `${filePath} tem ${png.palette.length} cores na paleta (precisa ser <= ${COLORS_PER_PART} para BG3/HUD 2bpp).`,
    );
  }
}

function validatePartIndices(png, filePath) {
  let maxIdx = 0;
  for (let i = 0; i < png.indices.length; i++) {
    const v = png.indices[i];
    if (v > maxIdx) maxIdx = v;
    if (v >= COLORS_PER_PART) {
      throw new Error(
        `${filePath} tem pixel com índice ${v} (BG3/HUD 2bpp aceita somente índices 0..3).`,
      );
    }
  }

  if (maxIdx >= png.palette.length) {
    throw new Error(
      `${filePath} usa índice ${maxIdx}, mas PLTE tem somente ${png.palette.length} entrada(s). Reexporte com a paleta completa.`,
    );
  }
}

function loadPart(part) {
  const filePath = getPartPath(part);
  if (!filePath) {
    throw new Error("Parte PNG sem caminho definido.");
  }

  let png;
  try {
    png = parsePngIndexed(fs.readFileSync(filePath));
  } catch (err) {
    throw new Error(`${filePath}: ${err.message}`);
  }

  if (!Array.isArray(png.palette) || png.palette.length === 0) {
    throw new Error(`${filePath} precisa ter PLTE com 1..4 cores.`);
  }
  validatePartIndices(png, filePath);
  validatePartPalette(png, filePath);

  const palRGB = Buffer.alloc(COLORS_PER_PART * 3, 0);
  const palA = Buffer.alloc(COLORS_PER_PART, 255);

  for (let i = 0; i < png.palette.length; i++) {
    const color = png.palette[i] ?? { r: 0, g: 0, b: 0, a: 255 };
    palRGB[i * 3 + 0] = color.r ?? 0;
    palRGB[i * 3 + 1] = color.g ?? 0;
    palRGB[i * 3 + 2] = color.b ?? 0;
    palA[i] = i === 0 ? 255 : color.a ?? 255;
  }

  return {
    path: filePath,
    width: png.width,
    height: png.height,
    palRGB,
    palA,
    indices: png.indices,
  };
}

function suggestOutputName(firstPath) {
  const dir = path.dirname(firstPath);
  const base = path.basename(firstPath, path.extname(firstPath));
  const match = base.match(/^(.*?)([-_]?part\d+)?$/i);
  const stem = match?.[1] || base;
  return path.join(dir, `${stem}-final.png`);
}

export function combineBg3Hud2bpp({ parts, outPath }) {
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Nenhuma parte PNG informada para combinar.");
  }
  if (parts.length * COLORS_PER_PART > MAX_FINAL_COLORS) {
    throw new Error("Máximo de 64 partes para BG3/HUD 2bpp (64*4 = 256 cores).");
  }

  const loadedParts = parts.map(loadPart);
  let outW = 0;
  let outH = 0;
  for (const part of loadedParts) {
    outW = Math.max(outW, part.width);
    outH = Math.max(outH, part.height);
  }

  const paletteRGB = Buffer.alloc(loadedParts.length * COLORS_PER_PART * 3);
  const paletteA = Buffer.alloc(loadedParts.length * COLORS_PER_PART);
  const outIdx = new Uint8Array(outW * outH);
  outIdx.fill(0);

  for (let i = 0; i < loadedParts.length; i++) {
    loadedParts[i].palRGB.copy(paletteRGB, i * COLORS_PER_PART * 3);
    loadedParts[i].palA.copy(paletteA, i * COLORS_PER_PART);
  }

  for (let pi = 0; pi < loadedParts.length; pi++) {
    const part = loadedParts[pi];
    const offset = pi * COLORS_PER_PART;

    for (let y = 0; y < part.height; y++) {
      for (let x = 0; x < part.width; x++) {
        const src = part.indices[y * part.width + x];
        if (src === 0) continue;
        outIdx[y * outW + x] = src + offset;
      }
    }
  }

  const finalOutPath = outPath || suggestOutputName(loadedParts[0].path);
  fs.mkdirSync(path.dirname(finalOutPath), { recursive: true });
  fs.writeFileSync(finalOutPath, encodePngIndexed8({
    width: outW,
    height: outH,
    paletteRGB,
    paletteA,
    indices: outIdx,
  }));

  console.log("OK:", finalOutPath);
}
