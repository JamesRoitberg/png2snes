import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runPng2Snes } from "../index.js";
import { runSequence } from "../sequence.js";
import { analyzeMapBuffer } from "../mapDiagnostics.js";

function resolveToolPath(relativePath) {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

function quoteArg(value) {
  const str = String(value);
  if (!str.length) return "''";
  if (!/[\s"'$\\]/.test(str)) return str;
  return `'${str.replace(/'/g, `'\"'\"'`)}'`;
}

function printKeyValue(label, value) {
  console.log(`  ${label}: ${value}`);
}

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
  });

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`Falha ao executar ${path.basename(scriptPath)} (exit ${result.status})`);
  }

  if (result.error) {
    throw result.error;
  }
}

export function printSummary(title, entries) {
  console.log(`[png2snes] ${title}`);
  for (const [label, value] of entries) {
    printKeyValue(label, value);
  }
}

export function printPreview(title, files, warnings = []) {
  if (!files.length) return;

  console.log(`[png2snes] ${title}`);
  files.forEach((file, index) => {
    console.log(`  ${String(index + 1).padStart(2, "0")}. ${file}`);
  });

  warnings.forEach((warning) => {
    console.warn(`[png2snes] WARN: ${warning}`);
  });
}

export function printEquivalentCommand(args) {
  console.log("[png2snes] Comando equivalente:");
  console.log(`  ${args.map(quoteArg).join(" ")}`);
}

export async function runConvertFlow({ inputPath, options }) {
  await runPng2Snes(inputPath, options);
}

export async function runSequenceFlow({ sequenceInfo, options }) {
  await runSequence({ sequenceInfo, options });
}

export function runCombineFlow({ parts, outPath }) {
  const scriptPath = resolveToolPath("../../tools/combine-indexed.js");
  const args = [];

  if (outPath) {
    args.push("--out", outPath);
  }

  args.push(...parts.map((part) => part.path));
  runNodeScript(scriptPath, args);
}

export function runSplitFlow({ inputPath, outDir, name, sepIndex, tile, pad }) {
  const scriptPath = resolveToolPath("../../tools/splitPng.js");
  const args = [
    "--in",
    inputPath,
    "--outdir",
    outDir,
    "--name",
    name,
    "--sepIndex",
    String(sepIndex),
  ];

  if (typeof tile !== "undefined") {
    args.push("--tile", String(tile));
  }
  if (typeof pad !== "undefined") {
    args.push("--pad", String(pad));
  }

  runNodeScript(scriptPath, args);
}

export function runPriorityFlow({ pngPath, maskPath, mapPath, outPath, layout }) {
  const scriptPath = resolveToolPath("../../tools/bgPriority.js");
  const args = [
    "--png",
    pngPath,
    "--mask",
    maskPath,
    "--map",
    mapPath,
    "--out",
    outPath,
  ];

  if (layout) {
    args.push("--layout", layout);
  }

  runNodeScript(scriptPath, args);
}

export function runColorFlow({ hex }) {
  const scriptPath = resolveToolPath("../../tools/color2snes.js");
  runNodeScript(scriptPath, [hex]);
}

export function runAnalyzeMapFlow({ mapPath, chrTiles }) {
  const resolvedMapPath = path.resolve(mapPath);
  const mapBuffer = fs.readFileSync(resolvedMapPath);
  analyzeMapBuffer(mapBuffer, typeof chrTiles === "number" ? chrTiles : null);
}
