// src/index.js
import path from "node:path";
import fs from "node:fs";
import { loadPng } from "./imageLoader.js";
import { buildPalette } from "./palette.js";
import { sliceTiles } from "./tiles.js";
import { dedupeTiles } from "./dedup.js";
import { buildTilemap } from "./map.js";
import {
  writeChr,
  writePal,
  writeGpl,
  writeTilesetPreview,
} from "./exporters.js";
import { validateTiles } from "./validateTiles.js";
import { analyzeMapBuffer } from "./mapDiagnostics.js";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function detectBgLayer(stem) {
  if (/(^|[-_])bg1([-_]|$)/i.test(stem)) return "bg1";
  if (/(^|[-_])bg2([-_]|$)/i.test(stem)) return "bg2";
  return null;
}

function swapBgLayer(stem) {
  if (/(^|[-_])bg1([-_]|$)/i.test(stem)) return stem.replace(/(^|[-_])bg1([-_]|$)/i, "$1bg2$2");
  if (/(^|[-_])bg2([-_]|$)/i.test(stem)) return stem.replace(/(^|[-_])bg2([-_]|$)/i, "$1bg1$2");
  return null;
}

function runVramLayoutHelper({ bpp, bg1Chr, bg1Map, bg2Chr, bg2Map, strict }) {
  const helperPath = fileURLToPath(new URL("../tools/vramLayoutHelper.js", import.meta.url));

  const argv = [helperPath, "--bpp", String(bpp), "--auto"];
  if (bg1Chr) argv.push("--bg1-chr", bg1Chr);
  if (bg1Map) argv.push("--bg1-map", bg1Map);
  if (bg2Chr) argv.push("--bg2-chr", bg2Chr);
  if (bg2Map) argv.push("--bg2-map", bg2Map);

  const r = spawnSync(process.execPath, argv, { stdio: "inherit" });

  if (r.status !== 0) {
    if (strict) {
      throw new Error("VRAM layout helper falhou (strict).");
    } else {
      console.warn("[png2snes] WARN: VRAM layout helper falhou (ignorei).");
    }
  }
}

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

  // loadPng() agora retorna { width, height, pixels, palette, indices }
  const {
    width,
    height,
    pixels,
    palette: pngPalette,
    indices
  } = await loadPng(inputPath);

  // Mantém compatibilidade: anexa a paleta REAL do PNG ao array de pixels (caso outras partes usem isso)
  pixels.palette = pngPalette;

  if (tipo === "bg" && bpp === 4) {
    const palBaseRaw =
       options.palBase ??
       options.paletaBase ??
       options.subpaletaBase ??
       options.subPaletteBase ??
       options.subpaleta ??
       options.subPalette;
     // FALHA ALTO: não aceitar "default 0" silencioso aqui
     if (typeof palBaseRaw === "undefined") {
       throw new Error("palBase ausente para BG 4bpp (esperado inteiro 0..7 vindo do CLI).");
     }
   }

   const palBase = Number(options.palBase);
   if (tipo === "bg" && bpp === 4) {
     if (!Number.isInteger(palBase) || palBase < 0 || palBase > 7) {
       throw new Error(`palBase inválido para BG 4bpp: ${options.palBase} (use inteiro 0..7).`);
     }
  }

  if (width % tileW !== 0 || height % tileH !== 0) {
    throw new Error(
      `Dimensões da imagem (${width}x${height}) não são múltiplas de ${tileW}x${tileH}.`
    );
  }

  let maxColors;

  if (tipo === "sprite") {
    maxColors = bpp === 2 ? 4 : bpp === 4 ? 16 : 256;
  } else {
    // BG:
    // - 2bpp: 4 cores
    // - 4bpp: até 8 subpaletas * 16 = 128 (no PNG combinado)
    // - 8bpp: 256 cores
    maxColors = bpp === 2 ? 4 : bpp === 4 ? 16 * 8 : 256;
  }

  const paletteSource =
    options.paleta ||
    options.palette ||
    options.pal ||
    options.paletteFile ||
    null;

  // buildPalette: novo palette.js gera palette.entries compacto (0..N-1), sem buracos/padding.
  // Não usar palIndex para deslocar entries.
  const palette = await buildPalette({
    pixels,
    indices,       // opcional (se o palette.js quiser)
    pngPalette,    // opcional (se o palette.js quiser)
    maxColors,
    bpp,
    paletteFile: paletteSource,
    tipo,
    colorZero: options.colorZero !== false
  });

  // Para sprite, garantir que fique apenas com a subpaleta real (sem reordenar).
  // Como agora não há padding, normalmente já vem correto; isto é só proteção.
  if (tipo === "sprite") {
    const want = palette.colorsPerSub ?? (bpp === 2 ? 4 : bpp === 4 ? 16 : 256);
    if (palette.entries.length > want) {
      palette.entries = palette.entries.slice(0, want);
    }
  }

  // sliceTiles() ajustado para aceitar indices, tipo, bpp, palBase
  // e gerar tilePixels local (0..15) + tile.palette correto pro tilemap
  const tilesData = sliceTiles({
    pixels,
    indices,
    width,
    height,
    tileW,
    tileH,
    palette,
    tipo,
    bpp,
    palBase
  });

  // Para BG, validar tiles usando os índices reais (idx >> 4), então passamos indices e geometria.
  if (tipo === "bg") {
    validateTiles({
      tilesData,
      indices,
      width,
      height,
      tileW,
      tileH,
      bpp,
      tipo,
      palBase,
      palette
    });
  }

  const dedupeMode = options.dedupe || "simple";
  const { uniqueTiles, tileRefs } = dedupeTiles(tilesData, dedupeMode, tipo);

  let tilemap = null;

  if (tipo !== "sprite") {
    tilemap = buildTilemap({
      width,
      height,
      tileW,
      tileH,
      tileRefs,
      tipo,
      bpp,
      palBase,
    });
  }

  // exports permanecem
  const chrBuffer = writeChr(uniqueTiles, bpp);
  const palBuffer = writePal(palette);
  const gplText = writeGpl(palette, `${baseName} (png2snes)`);

  fs.writeFileSync(`${outBase}.chr`, chrBuffer);
  if (tilemap) {
    fs.writeFileSync(`${outBase}.map`, tilemap);
  }
  fs.writeFileSync(`${outBase}.pal`, palBuffer);
  fs.writeFileSync(`${outBase}.gpl`, gplText, "utf-8");

   // Diagnóstico objetivo (opt-in): imprime histograma/flags do MAP gerado
   if (tilemap && (options.debugMap || process.env.PNG2SNES_DEBUG_MAP === "1")) {
     analyzeMapBuffer(tilemap, uniqueTiles.length);
   }

  const tilesetPngPath = `${outBase}-tileset.png`;

  if (tipo !== "sprite") {
    await writeTilesetPreview({
      tiles: uniqueTiles,
      palette,
      outPath: tilesetPngPath,
      bpp,
      palBase
    });
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

    // -----------------------------------------------------------------------------
  // VRAM layout helper (por padrão para BG)
  // - Só roda se o nome tiver bg1/bg2 (pra não “chutar” layer)
  // - Por padrão é não-strict (não quebra conversão se falhar)
  // - Para strict: export PNG2SNES_VRAM_STRICT=1
  // -----------------------------------------------------------------------------
  if (tipo === "bg" && options.printVramLayout !== false) {
    const strict = process.env.PNG2SNES_VRAM_STRICT === "1";

    const layer = detectBgLayer(baseName);
    const otherBaseName = swapBgLayer(baseName);

    if (!layer || !otherBaseName) {
      console.log("[png2snes] VRAM layout: pulei (nome não contém bg1/bg2).");
    } else {
      const thisChr = `${outBase}.chr`;
      const thisMap = `${outBase}.map`;

      const otherBase = path.join(outDir, otherBaseName);
      const otherChr = `${otherBase}.chr`;
      const otherMap = `${otherBase}.map`;

      const hasOther = fs.existsSync(otherChr) && fs.existsSync(otherMap);

      // Só roda se o map atual for dos tamanhos esperados (evita quebrar casos gerais)
      const expectedThisMapSize = layer === "bg1" ? 0x2000 : 0x1000;
      if (!fs.existsSync(thisMap)) {
        console.log("[png2snes] VRAM layout: pulei (MAP não existe).");
      } else {
        const thisMapSize = fs.statSync(thisMap).size;
        if (thisMapSize !== expectedThisMapSize) {
          console.log(`[png2snes] VRAM layout: pulei (MAP size ${thisMapSize} não é o esperado ${expectedThisMapSize}).`);
        } else {
          if (layer === "bg1") {
            runVramLayoutHelper({
              bpp,
              bg1Chr: thisChr,
              bg1Map: thisMap,
              bg2Chr: hasOther ? otherChr : null,
              bg2Map: hasOther ? otherMap : null,
              strict,
            });
          } else {
            runVramLayoutHelper({
              bpp,
              bg1Chr: hasOther ? otherChr : null,
              bg1Map: hasOther ? otherMap : null,
              bg2Chr: thisChr,
              bg2Map: thisMap,
              strict,
            });
          }
        }
      }
    }
  }
}

function parseSize(str) {
  const m = String(str).toLowerCase().match(/(\d+)x(\d+)/);
  if (!m) throw new Error(`Formato de tamanho inválido: ${str}`);
  return [Number(m[1]), Number(m[2])];
}
