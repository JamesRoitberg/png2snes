import fs from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import {
  inferCombineFromPart,
  inferPriorityFromPng,
  inferSequenceFromFrame,
  getSuggestedSplitName,
  normalizeHexColor,
  parseInteger,
  validateMapFile,
  validatePngFile,
} from "./discovery.js";
import { resolveConversionOptions } from "./conversionOptions.js";
import {
  COMBINE_TYPES,
  DEFAULT_COMBINE_TYPE,
  describeCombineType,
  printEquivalentCommand,
  printPreview,
  printSummary,
  runAnalyzeMapFlow,
  runColorFlow,
  runCombineFlow,
  runConvertFlow,
  runPriorityFlow,
  runSequenceFlow,
  runSplitFlow,
} from "./toolRunner.js";

const OTHER_DIRECTORY_VALUE = "__other_directory__";

function buildConversionCommand(command, inputPath, options) {
  const args = ["konvert2snes", command, inputPath];

  args.push("--tipo", options.tipo);
  args.push("--bpp", String(options.bpp));
  args.push("--tile-size", options.tileSize ?? "8x8");

  if (options.tipo === "sprite" && options.spriteSizes) {
    args.push("--sprite-sizes", options.spriteSizes);
  }

  if (options.dedupe) {
    args.push("--dedupe", options.dedupe);
  }

  if (typeof options.palBase === "number") {
    args.push("--bg-pal-base", String(options.palBase));
  }

  if (options.outDir) {
    args.push("--out-dir", options.outDir);
  }

  if (options.paleta) {
    args.push("--paleta", options.paleta);
  }

  if (options.debugMap) {
    args.push("--debug-map");
  }

  if (options.printVramLayout === false) {
    args.push("--no-print-vram-layout");
  }

  args.push("--no-interactive");
  return args;
}

function buildCombineCommand(inputPath, combineType) {
  const args = ["konvert2snes", "combine", inputPath];
  if (combineType !== DEFAULT_COMBINE_TYPE) {
    args.push("--combine-type", combineType);
  }
  return args;
}

function buildPriorityCommand({ pngPath, maskPath, mapPath, outPath }) {
  return [
    "konvert2snes",
    "priority",
    pngPath,
    "--mask",
    maskPath,
    "--map",
    mapPath,
    "--out",
    outPath,
  ];
}

function printExamples() {
  console.log("[konvert2snes] Exemplos:");
  console.log("  konvert2snes convert to-convert/tomb-bg2-final.png");
  console.log("  konvert2snes sequence to-convert/tomb-anim-01.png");
  console.log("  konvert2snes combine to-convert/tomb-bg2-part1.png");
  console.log("  konvert2snes split to-convert/tomb-anim-sheet.png --name tomb-anim --sepIndex 0");
  console.log("  konvert2snes priority to-convert/converted/tomb-bg2-final.png");
  console.log("  konvert2snes color ad1808");
  console.log("  konvert2snes analyze-map to-convert/converted/tomb-bg2-final.map");
}

async function confirmExecution() {
  const { confirmed } = await inquirer.prompt({
    type: "confirm",
    name: "confirmed",
    message: "Executar agora?",
    default: true,
  });

  return confirmed;
}

function validateDirectoryPath(inputPath, label = "Diretório") {
  const raw = String(inputPath || "").trim();
  if (!raw) {
    throw new Error(`${label} não definido.`);
  }

  const resolved = path.resolve(raw);

  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} não encontrado: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`${label} precisa ser um diretório: ${resolved}`);
  }

  return resolved;
}

function listPngFiles(dirPath) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".png")
    .map((entry) => ({
      file: entry.name,
      path: path.join(dirPath, entry.name),
    }))
    .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: "base" }));
}

function filterPngFiles(pngFiles, rawFilter) {
  const normalizedFilter = String(rawFilter || "").trim().toLowerCase();
  if (!normalizedFilter) {
    return pngFiles;
  }

  return pngFiles.filter((file) => file.file.toLowerCase().startsWith(normalizedFilter));
}

function describeSuggestedDirectory(dirPath) {
  try {
    const resolved = validateDirectoryPath(dirPath, "Diretório sugerido");
    const pngFiles = listPngFiles(resolved);

    return {
      dirPath: resolved,
      pngFiles,
      disabled: pngFiles.length ? false : "sem PNGs",
    };
  } catch {
    return {
      dirPath: path.resolve(dirPath),
      pngFiles: [],
      disabled: "não encontrado",
    };
  }
}

async function selectPngFileFromDirectory({
  suggestedDir,
  suggestedLabel,
  directoryMessage = "Escolha o diretório:",
  fileMessage = "Escolha o arquivo PNG:",
}) {
  const suggested = describeSuggestedDirectory(suggestedDir);
  const { selectedDir } = await inquirer.prompt({
    type: "list",
    name: "selectedDir",
    message: directoryMessage,
    choices: [
      {
        name: suggestedLabel,
        value: suggested.dirPath,
        disabled: suggested.disabled,
      },
      {
        name: "Outro diretório...",
        value: OTHER_DIRECTORY_VALUE,
      },
    ],
  });

  let dirPath = suggested.dirPath;
  if (selectedDir === OTHER_DIRECTORY_VALUE) {
    const { customDir } = await inquirer.prompt({
      type: "input",
      name: "customDir",
      message: "Informe o diretório:",
      validate: (value) => {
        try {
          validateDirectoryPath(value);
          return true;
        } catch (err) {
          return err.message;
        }
      },
    });

    dirPath = validateDirectoryPath(customDir);
  }

  const pngFiles = selectedDir === suggested.dirPath ? suggested.pngFiles : listPngFiles(dirPath);
  if (!pngFiles.length) {
    throw new Error(`Nenhum arquivo .png encontrado em ${dirPath}.`);
  }

  const { fileFilter } = await inquirer.prompt({
    type: "input",
    name: "fileFilter",
    message: "Filtro do arquivo (opcional, prefixo):",
    validate: (value) => {
      const filteredFiles = filterPngFiles(pngFiles, value);
      if (filteredFiles.length) {
        return true;
      }

      return "Nenhum arquivo encontrado com esse filtro.";
    },
  });

  const filteredFiles = filterPngFiles(pngFiles, fileFilter);
  const { selectedFile } = await inquirer.prompt({
    type: "list",
    name: "selectedFile",
    message: fileMessage,
    choices: filteredFiles.map((file) => ({
      name: file.file,
      value: file.path,
    })),
  });

  return selectedFile;
}

async function selectCombineType() {
  const { combineType } = await inquirer.prompt({
    type: "list",
    name: "combineType",
    message: "Qual tipo de combine usar?",
    choices: [
      {
        name: "1. Cenário normal BG1/BG2 - 4bpp, 16 cores por parte",
        value: COMBINE_TYPES.BG4_16,
      },
      {
        name: "2. BG3/HUD/Textos - 2bpp, 4 cores por parte",
        value: COMBINE_TYPES.BG3_2BPP_4,
      },
    ],
  });

  return combineType;
}

async function confirmConvertGeneratedPng() {
  const { shouldConvert } = await inquirer.prompt({
    type: "list",
    name: "shouldConvert",
    message: "Converter o PNG final agora?",
    default: true,
    choices: [
      { name: "Sim", value: true },
      { name: "Não", value: false },
    ],
  });

  return shouldConvert;
}

async function confirmConvertSplitSequence() {
  const { shouldConvert } = await inquirer.prompt({
    type: "list",
    name: "shouldConvert",
    message: "Converter a sequência de frames agora?",
    default: true,
    choices: [
      { name: "Sim", value: true },
      { name: "Não", value: false },
    ],
  });

  return shouldConvert;
}

async function confirmApplyPriorityAfterConvert() {
  const { shouldApply } = await inquirer.prompt({
    type: "list",
    name: "shouldApply",
    message: "Aplicar prioridade de BG agora?",
    default: true,
    choices: [
      { name: "Sim", value: true },
      { name: "Não", value: false },
    ],
  });

  return shouldApply;
}

function getConvertedBgPaths(inputPath, options) {
  const resolvedInputPath = path.resolve(inputPath);
  const baseOutDir = options.outDir
    ? path.resolve(options.outDir)
    : path.dirname(resolvedInputPath);
  const convertedDir = path.join(baseOutDir, "converted");
  const stem = path.basename(resolvedInputPath, path.extname(resolvedInputPath));

  return {
    convertedDir,
    mapPath: path.join(convertedDir, `${stem}.map`),
    outPath: path.join(convertedDir, `${stem}-pri.map`),
  };
}

function findPriorityMaskForConvertedBg(inputPath, convertedDir) {
  const resolvedInputPath = path.resolve(inputPath);
  const stem = path.basename(resolvedInputPath, path.extname(resolvedInputPath));
  const inputDir = path.dirname(resolvedInputPath);
  const candidates = [
    path.join(inputDir, `${stem}-priority.png`),
    path.join(inputDir, `${stem}-prio.png`),
    path.join(convertedDir, `${stem}-priority.png`),
    path.join(convertedDir, `${stem}-prio.png`),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

async function promptPriorityMask() {
  const { maskPath } = await inquirer.prompt({
    type: "input",
    name: "maskPath",
    message: "Não consegui inferir a máscara. Informe o PNG de máscara:",
    validate: (value) => {
      try {
        validatePngFile(value, "Máscara PNG");
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  return validatePngFile(maskPath, "Máscara PNG");
}

async function promptPriorityMap() {
  const { mapPath } = await inquirer.prompt({
    type: "input",
    name: "mapPath",
    message: "Não consegui inferir o MAP. Informe o arquivo MAP:",
    validate: (value) => {
      try {
        validateMapFile(value, "MAP");
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  return validateMapFile(mapPath, "MAP");
}

async function runInteractivePriorityKnownContext({
  pngPath,
  maskPath,
  mapPath,
  outPath,
  allowMapPrompt = false,
}) {
  const resolvedPngPath = validatePngFile(pngPath, "PNG base");
  const resolvedMaskPath = maskPath
    ? validatePngFile(maskPath, "Máscara PNG")
    : await promptPriorityMask();
  const resolvedMapPath = allowMapPrompt && !validateOptionalFile(mapPath)
    ? await promptPriorityMap()
    : validateMapFile(mapPath, "MAP");

  printSummary("Resumo da prioridade de BG", [
    ["PNG base", resolvedPngPath],
    ["Mask", resolvedMaskPath],
    ["MAP", resolvedMapPath],
    ["Saída", outPath],
  ]);

  if (!(await confirmExecution())) return false;

  runPriorityFlow({
    pngPath: resolvedPngPath,
    maskPath: resolvedMaskPath,
    mapPath: resolvedMapPath,
    outPath,
    layout: "auto",
  });
  printEquivalentCommand(buildPriorityCommand({
    pngPath: resolvedPngPath,
    maskPath: resolvedMaskPath,
    mapPath: resolvedMapPath,
    outPath,
  }));
  return true;
}

async function runInteractiveConvertKnownInput(inputPath, label = "PNG") {
  const resolvedInputPath = validatePngFile(inputPath, label);
  const options = await resolveConversionOptions({ interactive: true });

  printSummary("Resumo da conversão", [
    ["Arquivo", resolvedInputPath],
    ["Tipo", options.tipo],
    ["BPP", options.bpp],
    ["Tile size", options.tileSize],
    ["Dedupe", options.dedupe],
    ["Out dir", options.outDir ?? "(mesma pasta do PNG)"],
  ]);

  if (!(await confirmExecution())) return false;

  await runConvertFlow({ inputPath: resolvedInputPath, options });
  printEquivalentCommand(buildConversionCommand("convert", resolvedInputPath, options));

  if (options.tipo === "bg" && await confirmApplyPriorityAfterConvert()) {
    const convertedPaths = getConvertedBgPaths(resolvedInputPath, options);
    await runInteractivePriorityKnownContext({
      pngPath: resolvedInputPath,
      maskPath: findPriorityMaskForConvertedBg(resolvedInputPath, convertedPaths.convertedDir),
      mapPath: convertedPaths.mapPath,
      outPath: convertedPaths.outPath,
    });
  }

  return true;
}

async function runInteractiveConvert() {
  const inputPath = await selectPngFileFromDirectory({
    suggestedDir: "to-convert",
    suggestedLabel: "to-convert",
    directoryMessage: "Escolha o diretório do PNG:",
    fileMessage: "Escolha o arquivo PNG:",
  });

  return runInteractiveConvertKnownInput(inputPath, "PNG");
}

async function runInteractiveSequenceKnownFrame(inputPath) {
  const resolvedInputPath = validatePngFile(inputPath, "Frame");
  const sequenceInfo = inferSequenceFromFrame(resolvedInputPath);
  printPreview(
    "Preview da sequência detectada",
    sequenceInfo.frames.map((frame) => frame.file),
    sequenceInfo.warnings,
  );

  const options = await resolveConversionOptions({ interactive: true });
  printSummary("Resumo da sequência", [
    ["Frame informado", resolvedInputPath],
    ["Diretório", sequenceInfo.dir],
    ["Stem", sequenceInfo.stem],
    ["Frames", sequenceInfo.frames.length],
    ["Tipo", options.tipo],
    ["BPP", options.bpp],
  ]);

  if (!(await confirmExecution())) return false;

  await runSequenceFlow({ sequenceInfo, options });
  printEquivalentCommand(buildConversionCommand("sequence", resolvedInputPath, options));
  return true;
}

async function runInteractiveSequence() {
  const inputPath = await selectPngFileFromDirectory({
    suggestedDir: "to-convert",
    suggestedLabel: "to-convert",
    directoryMessage: "Escolha o diretório dos frames:",
    fileMessage: "Escolha um frame da animação:",
  });

  return runInteractiveSequenceKnownFrame(inputPath);
}

async function runInteractiveCombine() {
  const combineType = await selectCombineType();
  const inputPath = validatePngFile(await selectPngFileFromDirectory({
    suggestedDir: "to-convert",
    suggestedLabel: "to-convert",
    directoryMessage: "Escolha o diretório das partes:",
    fileMessage: "Escolha um dos arquivos da sequência de partes:",
  }), "Parte PNG");

  const combineInfo = inferCombineFromPart(inputPath);
  printPreview(
    "Preview das partes detectadas",
    combineInfo.parts.map((part) => part.file),
    combineInfo.warnings,
  );

  printSummary("Resumo da combinação", [
    ["Arquivo informado", inputPath],
    ["Stem", combineInfo.stem],
    ["Partes", combineInfo.parts.length],
    ["Tipo", describeCombineType(combineType)],
    ["Saída", combineInfo.outPath],
  ]);

  if (!(await confirmExecution())) return false;

  runCombineFlow({ parts: combineInfo.parts, outPath: combineInfo.outPath, combineType });
  printEquivalentCommand(buildCombineCommand(inputPath, combineType));

  if (await confirmConvertGeneratedPng()) {
    await runInteractiveConvertKnownInput(combineInfo.outPath, "PNG final");
  }

  return true;
}

async function runInteractiveSplit() {
  const inputPath = validatePngFile(await selectPngFileFromDirectory({
    suggestedDir: "to-convert",
    suggestedLabel: "to-convert",
    directoryMessage: "Escolha o diretório do PNG:",
    fileMessage: "Escolha o PNG a ser splitado:",
  }), "PNG de entrada");

  const splitInfo = getSuggestedSplitName(inputPath);
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Nome base de saída:",
      default: splitInfo.suggestedName,
      validate: (value) => String(value || "").trim() ? true : "Informe um nome base",
    },
    {
      type: "input",
      name: "sepIndex",
      message: "sepIndex:",
      default: "0",
      validate: (value) => {
        try {
          parseInteger(value, "sepIndex", { min: 0, max: 255 });
          return true;
        } catch (err) {
          return err.message;
        }
      },
    },
  ]);

  const sepIndex = parseInteger(answers.sepIndex, "sepIndex", { min: 0, max: 255 });
  printSummary("Resumo do split", [
    ["Arquivo", splitInfo.pngPath],
    ["Nome base", answers.name],
    ["sepIndex", sepIndex],
    ["Out dir", splitInfo.outDir],
  ]);

  if (!(await confirmExecution())) return false;

  runSplitFlow({
    inputPath: splitInfo.pngPath,
    outDir: splitInfo.outDir,
    name: answers.name,
    sepIndex,
  });
  printEquivalentCommand([
    "konvert2snes",
    "split",
    splitInfo.pngPath,
    "--name",
    answers.name,
    "--sepIndex",
    String(sepIndex),
  ]);

  if (await confirmConvertSplitSequence()) {
    const firstFramePath = path.join(splitInfo.outDir, `${answers.name}-01.png`);
    await runInteractiveSequenceKnownFrame(firstFramePath);
  }

  return true;
}

async function runInteractivePriority() {
  const inputPath = validatePngFile(await selectPngFileFromDirectory({
    suggestedDir: "to-convert/converted",
    suggestedLabel: "to-convert/converted",
    directoryMessage: "Escolha o diretório do PNG base:",
    fileMessage: "Escolha o PNG base do cenário:",
  }), "PNG base");

  const inferred = inferPriorityFromPng(inputPath);
  return runInteractivePriorityKnownContext({
    pngPath: inferred.pngPath,
    maskPath: inferred.maskPath,
    mapPath: inferred.mapPath,
    outPath: inferred.outPath,
    allowMapPrompt: true,
  });
}

function validateOptionalFile(filePath) {
  if (!filePath) return false;
  try {
    validateMapFile(filePath, "MAP");
    return true;
  } catch {
    return false;
  }
}

async function runInteractiveColor() {
  const { hex } = await inquirer.prompt({
    type: "input",
    name: "hex",
    message: "Informe a cor hexadecimal:",
    validate: (value) => {
      try {
        normalizeHexColor(value);
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  const normalizedHex = normalizeHexColor(hex);
  printSummary("Resumo da conversão de cor", [["Cor", normalizedHex]]);

  if (!(await confirmExecution())) return false;

  runColorFlow({ hex: normalizedHex });
  printEquivalentCommand(["konvert2snes", "color", normalizedHex]);
  return true;
}

async function runInteractiveAnalyzeMap() {
  const { input } = await inquirer.prompt({
    type: "input",
    name: "input",
    message: "Informe o arquivo MAP:",
    validate: (value) => {
      try {
        validateMapFile(value, "MAP");
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  const mapPath = validateMapFile(input, "MAP");
  printSummary("Resumo da análise de MAP", [["Arquivo", mapPath]]);

  if (!(await confirmExecution())) return false;

  runAnalyzeMapFlow({ mapPath });
  printEquivalentCommand(["konvert2snes", "analyze-map", mapPath]);
  return true;
}

export async function openMainMenu() {
  while (true) {
    const { action } = await inquirer.prompt({
      type: "list",
      name: "action",
      message: "Selecione uma ação:",
      choices: [
        { name: "1. Converter PNG para SNES", value: "convert" },
        { name: "2. Converter animação por sequência de frames", value: "sequence" },
        { name: "3. Combinar partes de um PNG/cenário", value: "combine" },
        { name: "4. Splitar PNG em vários frames", value: "split" },
        { name: "5. Aplicar prioridade de BG", value: "priority" },
        { name: "6. Converter cor para SNES", value: "color" },
        { name: "7. Analisar arquivo MAP", value: "analyze-map" },
        { name: "8. Ver exemplos de comandos", value: "examples" },
        { name: "9. Sair", value: "exit" },
      ],
    });

    if (action === "exit") {
      return;
    }

    if (action === "examples") {
      printExamples();
      continue;
    }

    try {
      if (action === "convert" && await runInteractiveConvert()) return;
      if (action === "sequence" && await runInteractiveSequence()) return;
      if (action === "combine" && await runInteractiveCombine()) return;
      if (action === "split" && await runInteractiveSplit()) return;
      if (action === "priority" && await runInteractivePriority()) return;
      if (action === "color" && await runInteractiveColor()) return;
      if (action === "analyze-map" && await runInteractiveAnalyzeMap()) return;
    } catch (err) {
      console.error("[konvert2snes] Erro:", err.message);
    }
  }
}
