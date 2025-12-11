// merge/mergeParts.js
// Versão modular do mergeBg — ESModule
// Pode ser importado pelo png2snes ou usado pelo mergeBg.js

import fs from "node:fs";
import path from "node:path";

function die(msg) {
  throw new Error("mergeParts - " + msg);
}

function loadPartFromDir(inDir, baseName, partNumber) {
  const prefix = path.join(inDir, `${baseName}-part${partNumber}`);

  const chrPath = prefix + ".chr";
  const mapPath = prefix + ".map";
  const palPath = prefix + ".pal";

  if (!fs.existsSync(chrPath)) die(`CHR não encontrado: ${chrPath}`);
  if (!fs.existsSync(mapPath)) die(`MAP não encontrado: ${mapPath}`);
  if (!fs.existsSync(palPath)) die(`PAL não encontrado: ${palPath}`);

  const chr = fs.readFileSync(chrPath);
  const map = fs.readFileSync(mapPath);
  const pal = fs.readFileSync(palPath);

  if (map.length % 2 !== 0) die(`MAP inválido: ${mapPath}`);
  if (chr.length % 32 !== 0) die(`CHR inválido: ${chrPath}`);
  if (pal.length % 2 !== 0) die(`PAL inválido: ${palPath}`);

  const mapEntries = [];
  for (let i = 0; i < map.length; i += 2) {
    mapEntries.push(map.readUInt16LE(i));
  }

  const tileCount = chr.length / 32;
  const colorCount = pal.length / 2;

  const metaPath = prefix + ".meta.json";
  let meta = null;
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {}
  }

  return {
    name: `${baseName}-part${partNumber}`,
    chr,
    mapEntries,
    pal,
    tileCount,
    colorCount,
    meta
  };
}

export async function mergeParts(inDir, outDir) {
  if (!fs.existsSync(inDir) || !fs.statSync(inDir).isDirectory()) {
    die(`pasta de entrada não encontrada: ${inDir}`);
  }

  const files = fs.readdirSync(inDir);
  const partRegex = /^(.*)-part(\d+)\.chr$/i;

  const partsFound = [];
  for (const f of files) {
    if (!f.toLowerCase().endsWith(".chr")) continue;
    const m = f.match(partRegex);
    if (!m) continue;
    const baseName = m[1];
    const num = parseInt(m[2], 10);
    partsFound.push({ baseName, partNumber: num });
  }

  if (partsFound.length === 0) {
    die("nenhuma parte encontrada para merge");
  }

  const targetBase = partsFound[0].baseName;
  const selected = partsFound
    .filter(p => p.baseName === targetBase)
    .sort((a, b) => a.partNumber - b.partNumber);

  const parts = selected.map(p =>
    loadPartFromDir(inDir, targetBase, p.partNumber)
  );

  // Validar tamanho do MAP entre partes
  const mapLen = parts[0].mapEntries.length;
  for (const part of parts) {
    if (part.mapEntries.length !== mapLen) {
      die("todas as partes precisam ter MAP do mesmo tamanho");
    }
  }

  // --- 1) Montar paletas globais ---
  const paletteMap = new Map();
  const paletteBlocks = [];
  let nextPalIndex = 0;

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];

    const used = new Set();
    for (const e of part.mapEntries) {
      if (e === 0) continue;
      const pal = (e >> 10) & 0x7;
      used.add(pal);
    }

    for (const origPal of [...used].sort((a, b) => a - b)) {
      const key = `${pi}:${origPal}`;
      if (paletteMap.has(key)) continue;

      if (nextPalIndex >= 8) {
        die("mais de 8 subpaletas resultantes — SNES 4bpp suporta só 8");
      }

      const start = origPal * 16 * 2;
      const block = Buffer.alloc(16 * 2);
      parts[pi].pal.subarray(start, start + 32).copy(block);

      paletteMap.set(key, nextPalIndex++);
      paletteBlocks.push(block);
    }
  }

  const finalPal = Buffer.concat(paletteBlocks);

  // --- 2) Offset de tiles ---
  const tileOffsets = [];
  let totalTiles = 0;
  for (const part of parts) {
    tileOffsets.push(totalTiles);
    totalTiles += part.tileCount;
  }

  if (totalTiles > 1024) {
    console.warn(
      "[mergeParts] aviso: total de tiles > 1024. TileIndex 10-bit pode truncar."
    );
  }

  const finalChr = Buffer.concat(parts.map(p => p.chr));

  // --- 3) Montar MAP final ---
  const finalMap = Buffer.alloc(mapLen * 2);

  for (let i = 0; i < mapLen; i++) {
    let outEntry = 0;

    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi];
      const e = part.mapEntries[i];
      if (e === 0) continue;

      const tile = e & 0x03FF;
      const origPal = (e >> 10) & 0x7;
      const high = e & 0xE000;

      const newPal = paletteMap.get(`${pi}:${origPal}`) ?? 0;
      const newTile = (tile + tileOffsets[pi]) & 0x03FF;

      outEntry = high | (newPal << 10) | newTile;
    }

    finalMap.writeUInt16LE(outEntry, i * 2);
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outBase = path.join(outDir, `${targetBase}-final`);

  fs.writeFileSync(outBase + ".chr", finalChr);
  fs.writeFileSync(outBase + ".map", finalMap);
  fs.writeFileSync(outBase + ".pal", finalPal);

  return {
    chr: outBase + ".chr",
    map: outBase + ".map",
    pal: outBase + ".pal"
  };
}
