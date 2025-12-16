import path from "node:path";
import fs from "node:fs";
import { loadPng } from "./imageLoader.js";
import { buildPalette } from "./palette.js";
import { sliceTiles } from "./tiles.js";
import { dedupeTiles } from "./dedup.js";
import { buildTilemap, buildMetatileMap } from "./map.js";
import {
  writeChr,
  writePal,
  writeGpl,
  writeTilesetPreview,
  writeMetatileJson
} from "./exporters.js";

export async function runPng2Snes(imagePath, options) {
  const inputPath = path.resolve(imagePath);

  // ============================================================
  //  NOVO COMPORTAMENTO: gera sempre dentro de /converted
  // ============================================================
  const baseOutDir = options.outDir
    ? path.resolve(options.outDir)
    : path.dirname(inputPath);

  const outDir = path.join(baseOutDir, "converted");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  // ============================================================

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Imagem não encontrada: ${inputPath}`);
  }

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outBase = path.join(outDir, baseName);

  const tipo = (options.tipo || "bg").toLowerCase();
  const bpp = Number(options.bpp || 4);

  if (!["bg", "sprite"].includes(tipo)) {
    throw new Error('Tipo inválido. Use "bg" ou "sprite".');
  }
  if (![2, 4, 8].includes(bpp)) {
    throw new Error("bpp inválido, use 2, 4 ou 8.");
  }

  const [tileW, tileH] = parseSize(options.tileSize || "8x8");

  const { width, height, pixels } = await loadPng(inputPath);

  if (width % tileW !== 0 || height % tileH !== 0) {
    throw new Error(
      `Dimensões da imagem (${width}x${height}) não são múltiplas de ${tileW}x${tileH}.`
    );
  }

  let maxColors;

  if (tipo === "sprite") {
    maxColors = bpp === 2 ? 4 : bpp === 4 ? 16 : 256;
  } else {
    maxColors = bpp === 2 ? 4 : bpp === 4 ? 16 * 8 : 256;
  }

  const paletteSource =
    options.paleta ||
    options.palette ||
    options.pal ||
    options.paletteFile ||
    null
  ;

  const palette = await buildPalette({
    pixels,
    maxColors,
    bpp,
    paletteFile: paletteSource,
    tipo,
    palIndex: tipo === "sprite" ? undefined : options.palIndex,
    colorZero: options.colorZero !== false,
  });

  if (tipo === "sprite") {
    // Para sprite, pegamos APENAS a sub-paleta real (16 cores)
    const start = palette.entries.length - palette.colorsPerSub;
    palette.entries = palette.entries.slice(start);
  }
  
  const tiles = sliceTiles({
    pixels,
    width,
    height,
    tileW,
    tileH,
    palette,
  });

  const dedupeMode = options.dedupe || "simple";
  const { uniqueTiles, tileRefs } = dedupeTiles(tiles, dedupeMode, tipo);

  let tilemap = null;

  if (tipo !== "sprite") {
    tilemap = buildTilemap({
      width,
      height,
      tileW,
      tileH,
      tileRefs,
      tipo,
    });
  }

  const chrBuffer = writeChr(uniqueTiles, bpp);
  const palBuffer = writePal(palette);
  const gplText = writeGpl(palette, `${baseName} (png2snes)`);

  fs.writeFileSync(`${outBase}.chr`, chrBuffer);
  if (tilemap) {
    fs.writeFileSync(`${outBase}.map`, tilemap);
  }
  fs.writeFileSync(`${outBase}.pal`, palBuffer);
  fs.writeFileSync(`${outBase}.gpl`, gplText, "utf-8");

  const tilesetPngPath = `${outBase}-tileset.png`;
  
  if (tipo !== "sprite") {
    await writeTilesetPreview({
      tiles: uniqueTiles,
      palette,
      outPath: tilesetPngPath,
    });
  }

  if (options.metatile && tipo !== "sprite") {
    const [metaW, metaH] = parseSize(options.metatile);
    const metaJson = buildMetatileMap({
      width,
      height,
      tileW,
      tileH,
      metaW,
      metaH,
      tileRefs,
    });
    writeMetatileJson(`${outBase}.meta.json`, metaJson);
  }

  console.log("[png2snes] OK:");
  console.log("  OUT DIR:", outDir);
  console.log("  CHR:", `${outBase}.chr`);
  if (tilemap) {
    console.log("  MAP:", `${outBase}.map`);
  }
  console.log("  PAL:", `${outBase}.pal`);
  console.log("  GPL:", `${outBase}.gpl`);
  if (tipo !== "sprite") {
    console.log("  TILESET PNG:", tilesetPngPath);
  }
  if (options.metatile && tipo !== "sprite") {
    console.log("  METATILES JSON:", `${outBase}.meta.json`);
  }
}

function parseSize(str) {
  const m = String(str).toLowerCase().match(/(\d+)x(\d+)/);
  if (!m) throw new Error(`Formato de tamanho inválido: ${str}`);
  return [Number(m[1]), Number(m[2])];
}
