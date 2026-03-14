import fs from "node:fs";
import path from "node:path";
import { loadPng } from "./imageLoader.js";
import { buildPalette } from "./palette.js";
import { writeGpl, writePal } from "./exporters.js";
import { runPng2Snes } from "./index.js";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeStem(stem) {
  const raw = String(stem || "").trim();
  if (!raw) {
    throw new Error('Modo sequência requer --stem <stem> (ex.: --stem stage-anim).');
  }
  return raw.toLowerCase().endsWith(".png") ? raw.slice(0, -4) : raw;
}

function resolveSearchDir({ imagePath, dir }) {
  if (dir) return path.resolve(dir);
  if (imagePath) return path.dirname(path.resolve(imagePath));
  return process.cwd();
}

function parseSize(str) {
  const match = String(str).toLowerCase().match(/(\d+)x(\d+)/);
  if (!match) throw new Error(`Formato de tamanho inválido: ${str}`);
  return [Number(match[1]), Number(match[2])];
}

function getConvertedDir(framePath, outDir) {
  const inputPath = path.resolve(framePath);
  const baseOutDir = outDir ? path.resolve(outDir) : path.dirname(inputPath);
  return path.join(baseOutDir, "converted");
}

function getMaxColors(tipo, bpp) {
  if (tipo === "sprite") {
    return bpp === 2 ? 4 : bpp === 4 ? 16 : 256;
  }
  return bpp === 2 ? 4 : bpp === 4 ? 16 * 8 : 256;
}

function getPaletteSource(options) {
  return (
    options.paleta ||
    options.palette ||
    options.pal ||
    options.paletteFile ||
    null
  );
}

function formatFrameNumber(n, pad) {
  return String(n).padStart(Math.max(2, pad), "0");
}

function describePaletteEntry(entry) {
  if (!entry) return "null";
  const snes = `0x${((entry.snes ?? 0) & 0x7fff).toString(16).padStart(4, "0")}`;
  return `${snes} rgba(${entry.r},${entry.g},${entry.b},${entry.a ?? 255})`;
}

function comparePalettes(reference, candidate) {
  const a = reference?.entries ?? [];
  const b = candidate?.entries ?? [];

  if (a.length !== b.length) {
    return `quantidade de cores diferente (${a.length} vs ${b.length})`;
  }

  for (let i = 0; i < a.length; i++) {
    const ca = a[i] ?? null;
    const cb = b[i] ?? null;
    const aSnes = ca ? (ca.snes & 0x7fff) : 0;
    const bSnes = cb ? (cb.snes & 0x7fff) : 0;
    const aAlpha = ca?.a ?? 255;
    const bAlpha = cb?.a ?? 255;

    if (aSnes !== bSnes || aAlpha !== bAlpha) {
      return `entrada ${i} divergente (primeiro=${describePaletteEntry(ca)} atual=${describePaletteEntry(cb)})`;
    }
  }

  return null;
}

function detectSequenceWarnings(frames) {
  const warnings = [];

  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const current = frames[i];
    const gap = current.n - prev.n;

    if (gap <= 1) continue;

    const missing = [];
    for (let n = prev.n + 1; n < current.n; n++) {
      missing.push(formatFrameNumber(n, current.pad));
    }

    warnings.push(
      `buraco na sequência entre ${prev.file} e ${current.file} (faltando: ${missing.join(", ")})`
    );
  }

  return warnings;
}

async function inspectFrame(framePath, options) {
  const inputPath = path.resolve(framePath);
  const { width, height, pixels, palette: pngPalette, indices } = await loadPng(inputPath);

  pixels.palette = pngPalette;

  const tipo = (options.tipo || "bg").toLowerCase();
  const bpp = Number(options.bpp || 4);
  const [tileW, tileH] = parseSize(options.tileSize || "8x8");

  if (width % tileW !== 0 || height % tileH !== 0) {
    throw new Error(
      `dimensões ${width}x${height} não são múltiplas de ${tileW}x${tileH}`
    );
  }

  const palette = await buildPalette({
    pixels,
    indices,
    pngPalette,
    maxColors: getMaxColors(tipo, bpp),
    bpp,
    paletteFile: getPaletteSource(options),
    tipo,
    colorZero: options.colorZero !== false,
  });

  if (tipo === "sprite") {
    const want = palette.colorsPerSub ?? (bpp === 2 ? 4 : bpp === 4 ? 16 : 256);
    if (palette.entries.length > want) {
      palette.entries = palette.entries.slice(0, want);
    }
  }

  return {
    width,
    height,
    palette,
  };
}

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[png2snes][sequence] WARN: não consegui remover ${filePath}: ${err.message}`);
  }
}

export function findSequenceFrames({ imagePath, dir, stem }) {
  const searchDir = resolveSearchDir({ imagePath, dir });
  const normalizedStem = normalizeStem(stem);

  if (!fs.existsSync(searchDir)) {
    throw new Error(`Diretório de sequência não encontrado: ${searchDir}`);
  }

  const re = new RegExp(`^${escapeRegExp(normalizedStem)}(?:[-_]?)(\\d+)\\.png$`, "i");
  const entries = fs.readdirSync(searchDir, { withFileTypes: true });
  const frames = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const match = entry.name.match(re);
    if (!match) continue;

    frames.push({
      file: entry.name,
      path: path.join(searchDir, entry.name),
      n: Number(match[1]),
      pad: match[1].length,
    });
  }

  frames.sort(
    (a, b) => (a.n - b.n) || a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: "base" })
  );

  if (!frames.length) {
    throw new Error(
      `Nenhum frame encontrado em ${searchDir} com o padrão ${normalizedStem}-NN.png`
    );
  }

  return {
    dir: searchDir,
    stem: normalizedStem,
    frames,
    warnings: detectSequenceWarnings(frames),
  };
}

export async function runSequence({ sequenceInfo, options }) {
  const { frames, stem } = sequenceInfo;
  const inspected = [];

  console.log(`[png2snes][sequence] Validando ${frames.length} frame(s)...`);

  for (const frame of frames) {
    let meta;
    try {
      meta = await inspectFrame(frame.path, options);
    } catch (err) {
      throw new Error(`frame ${frame.file}: ${err.message}`);
    }

    if (inspected.length === 0) {
      inspected.push({ frame, meta });
      continue;
    }

    const first = inspected[0];

    if (meta.width !== first.meta.width || meta.height !== first.meta.height) {
      throw new Error(
        `frame ${frame.file}: dimensão ${meta.width}x${meta.height} diverge do primeiro frame ` +
          `${first.frame.file} (${first.meta.width}x${first.meta.height})`
      );
    }

    const paletteDiff = comparePalettes(first.meta.palette, meta.palette);
    if (paletteDiff) {
      throw new Error(
        `frame ${frame.file}: paleta divergente em relação a ${first.frame.file}: ${paletteDiff}`
      );
    }

    inspected.push({ frame, meta });
  }

  const outDir = getConvertedDir(frames[0].path, options.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(
    `[png2snes][sequence] Validação OK. Dimensões: ${inspected[0].meta.width}x${inspected[0].meta.height}`
  );
  console.log(
    `[png2snes][sequence] Mantendo apenas ${stem}.pal e ${stem}.gpl no final da sequência.`
  );
  console.log("[png2snes][sequence] Convertendo frames...");

  let convertedCount = 0;

  for (const { frame } of inspected) {
    console.log(`[png2snes][sequence] Frame: ${frame.file}`);

    try {
      await runPng2Snes(frame.path, {
        ...options,
        skipPaletteOutputs: true,
      });
    } catch (err) {
      throw new Error(
        `frame ${frame.file}: falha na conversão. ${err.message}. Saídas parciais podem existir.`
      );
    }

    const baseName = path.basename(frame.path, path.extname(frame.path));
    safeUnlink(path.join(outDir, `${baseName}.pal`));
    safeUnlink(path.join(outDir, `${baseName}.gpl`));
    convertedCount++;
  }

  const sharedPalette = inspected[0].meta.palette;
  const palPath = path.join(outDir, `${stem}.pal`);
  const gplPath = path.join(outDir, `${stem}.gpl`);

  fs.writeFileSync(palPath, writePal(sharedPalette));
  fs.writeFileSync(gplPath, writeGpl(sharedPalette, `${stem} (png2snes sequence)`), "utf-8");

  console.log("[png2snes][sequence] OK:");
  console.log("  OUT DIR:", outDir);
  console.log("  FRAMES:", convertedCount);
  console.log("  PAL:", palPath);
  console.log("  GPL:", gplPath);
}
