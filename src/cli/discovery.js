import fs from "node:fs";
import path from "node:path";
import { findSequenceFrames } from "../sequence.js";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureFileExists(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} não encontrado: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`${label} precisa ser um arquivo: ${resolved}`);
  }
  return resolved;
}

function readDirFiles(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true }).filter((entry) => entry.isFile());
}

function detectNumericGaps(items) {
  const warnings = [];

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const current = items[i];
    const gap = current.n - prev.n;

    if (gap <= 1) continue;

    const missing = [];
    for (let n = prev.n + 1; n < current.n; n++) {
      missing.push(String(n).padStart(current.pad, "0"));
    }

    warnings.push(
      `buraco entre ${prev.file} e ${current.file} (faltando: ${missing.join(", ")})`,
    );
  }

  return warnings;
}

export function validatePngFile(inputPath, label = "PNG") {
  const resolved = ensureFileExists(inputPath, label);
  if (path.extname(resolved).toLowerCase() !== ".png") {
    throw new Error(`${label} precisa ser um arquivo .png: ${resolved}`);
  }
  return resolved;
}

export function validateMapFile(inputPath, label = "MAP") {
  const resolved = ensureFileExists(inputPath, label);
  if (path.extname(resolved).toLowerCase() !== ".map") {
    throw new Error(`${label} precisa ser um arquivo .map: ${resolved}`);
  }
  return resolved;
}

export function parseInteger(value, label, { min = null, max = null } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error(`${label} inválido: ${value}`);
  }
  if (min !== null && n < min) {
    throw new Error(`${label} inválido: ${value} (mínimo ${min})`);
  }
  if (max !== null && n > max) {
    throw new Error(`${label} inválido: ${value} (máximo ${max})`);
  }
  return n;
}

export function normalizeHexColor(value) {
  const raw = String(value || "").trim();
  let normalized = raw;

  if (normalized.startsWith("#")) normalized = normalized.slice(1);
  if (normalized.startsWith("0x") || normalized.startsWith("0X")) normalized = normalized.slice(2);

  if (normalized.length === 3) {
    normalized = normalized.split("").map((c) => c + c).join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Cor hexadecimal inválida: ${value}`);
  }

  return normalized.toLowerCase();
}

export function inferSequenceFromFrame(framePath) {
  const resolvedFramePath = validatePngFile(framePath, "Frame");
  const baseName = path.basename(resolvedFramePath, ".png");
  const match = baseName.match(/^(.*?)(?:[-_]?)(\d+)$/);

  if (!match || !match[1]) {
    throw new Error(
      `Não consegui inferir a sequência a partir de ${path.basename(resolvedFramePath)}. Use um frame numerado, como tomb-anim-01.png.`,
    );
  }

  return findSequenceFrames({
    imagePath: resolvedFramePath,
    stem: match[1],
  });
}

export function inferCombineFromPart(filePath) {
  const resolvedPartPath = validatePngFile(filePath, "Parte PNG");
  const dir = path.dirname(resolvedPartPath);
  const baseName = path.basename(resolvedPartPath, ".png");
  const match = baseName.match(/^(.*?)(?:[-_]?part)(\d+)$/i);

  if (!match || !match[1]) {
    throw new Error(
      `Não consegui inferir as partes relacionadas a partir de ${path.basename(resolvedPartPath)}. Use um arquivo no formato <stem>-partN.png.`,
    );
  }

  const stem = match[1];
  const re = new RegExp(`^${escapeRegExp(stem)}[-_]?part(\\d+)\\.png$`, "i");
  const parts = [];

  for (const entry of readDirFiles(dir)) {
    const partMatch = entry.name.match(re);
    if (!partMatch) continue;

    parts.push({
      file: entry.name,
      path: path.join(dir, entry.name),
      n: Number(partMatch[1]),
      pad: partMatch[1].length,
    });
  }

  parts.sort((a, b) => (a.n - b.n) || a.file.localeCompare(b.file, undefined, { numeric: true }));

  if (!parts.length) {
    throw new Error(`Nenhuma parte encontrada em ${dir} para o stem ${stem}.`);
  }

  return {
    dir,
    stem,
    parts,
    warnings: detectNumericGaps(parts),
    outPath: path.join(dir, `${stem}-final.png`),
  };
}

export function inferPriorityFromPng(inputPath) {
  const pngPath = validatePngFile(inputPath, "PNG base");
  const dir = path.dirname(pngPath);
  const stem = path.basename(pngPath, ".png");

  const mapPath = path.join(dir, `${stem}.map`);
  const maskCandidates = [
    path.join(dir, `${stem}-priority.png`),
    path.join(dir, `${stem}-prio.png`),
  ];
  const maskPath = maskCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  const outPath = path.join(dir, `${stem}-pri.map`);

  return {
    dir,
    stem,
    pngPath,
    mapPath,
    maskPath,
    maskCandidates,
    outPath,
  };
}

export function getSuggestedSplitName(inputPath) {
  const pngPath = validatePngFile(inputPath, "PNG de entrada");
  const baseName = path.basename(pngPath, ".png");
  const suggested = baseName.replace(/(?:[-_]?sprite)?(?:[-_]?sheet)$/i, "") || baseName;

  return {
    pngPath,
    outDir: path.dirname(pngPath),
    suggestedName: suggested,
  };
}
