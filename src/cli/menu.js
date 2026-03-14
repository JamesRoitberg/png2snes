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

function buildConversionCommand(command, inputPath, options) {
  const args = ["png2snes", command, inputPath];

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

function printExamples() {
  console.log("[png2snes] Exemplos:");
  console.log("  png2snes convert to-convert/tomb-bg2-final.png");
  console.log("  png2snes sequence to-convert/tomb-anim-01.png");
  console.log("  png2snes combine to-convert/tomb-bg2-part1.png");
  console.log("  png2snes split to-convert/tomb-anim-sheet.png --name tomb-anim --sepIndex 0");
  console.log("  png2snes priority to-convert/converted/tomb-bg2-final.png");
  console.log("  png2snes color ad1808");
  console.log("  png2snes analyze-map to-convert/converted/tomb-bg2-final.map");
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

async function runInteractiveConvert() {
  const { input } = await inquirer.prompt({
    type: "input",
    name: "input",
    message: "Informe o arquivo PNG:",
    validate: (value) => {
      try {
        validatePngFile(value, "PNG");
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  const inputPath = validatePngFile(input, "PNG");
  const options = await resolveConversionOptions({ interactive: true });

  printSummary("Resumo da conversão", [
    ["Arquivo", inputPath],
    ["Tipo", options.tipo],
    ["BPP", options.bpp],
    ["Tile size", options.tileSize],
    ["Dedupe", options.dedupe],
    ["Out dir", options.outDir ?? "(mesma pasta do PNG)"],
  ]);

  if (!(await confirmExecution())) return false;

  await runConvertFlow({ inputPath, options });
  printEquivalentCommand(buildConversionCommand("convert", inputPath, options));
  return true;
}

async function runInteractiveSequence() {
  const { input } = await inquirer.prompt({
    type: "input",
    name: "input",
    message: "Informe um frame da animação:",
    validate: (value) => {
      try {
        inferSequenceFromFrame(value);
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  const sequenceInfo = inferSequenceFromFrame(input);
  printPreview(
    "Preview da sequência detectada",
    sequenceInfo.frames.map((frame) => frame.file),
    sequenceInfo.warnings,
  );

  const options = await resolveConversionOptions({ interactive: true });
  printSummary("Resumo da sequência", [
    ["Frame informado", validatePngFile(input, "Frame")],
    ["Diretório", sequenceInfo.dir],
    ["Stem", sequenceInfo.stem],
    ["Frames", sequenceInfo.frames.length],
    ["Tipo", options.tipo],
    ["BPP", options.bpp],
  ]);

  if (!(await confirmExecution())) return false;

  await runSequenceFlow({ sequenceInfo, options });
  printEquivalentCommand(buildConversionCommand("sequence", validatePngFile(input, "Frame"), options));
  return true;
}

async function runInteractiveCombine() {
  const { input } = await inquirer.prompt({
    type: "input",
    name: "input",
    message: "Informe um dos arquivos da sequência de partes:",
    validate: (value) => {
      try {
        inferCombineFromPart(value);
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  const combineInfo = inferCombineFromPart(input);
  printPreview(
    "Preview das partes detectadas",
    combineInfo.parts.map((part) => part.file),
    combineInfo.warnings,
  );

  printSummary("Resumo da combinação", [
    ["Arquivo informado", validatePngFile(input, "Parte PNG")],
    ["Stem", combineInfo.stem],
    ["Partes", combineInfo.parts.length],
    ["Saída", combineInfo.outPath],
  ]);

  if (!(await confirmExecution())) return false;

  runCombineFlow({ parts: combineInfo.parts, outPath: combineInfo.outPath });
  printEquivalentCommand(["png2snes", "combine", validatePngFile(input, "Parte PNG")]);
  return true;
}

async function runInteractiveSplit() {
  const { input } = await inquirer.prompt({
    type: "input",
    name: "input",
    message: "Informe o PNG a ser splitado:",
    validate: (value) => {
      try {
        validatePngFile(value, "PNG de entrada");
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  const splitInfo = getSuggestedSplitName(input);
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
    "png2snes",
    "split",
    splitInfo.pngPath,
    "--name",
    answers.name,
    "--sepIndex",
    String(sepIndex),
  ]);
  return true;
}

async function runInteractivePriority() {
  const { input } = await inquirer.prompt({
    type: "input",
    name: "input",
    message: "Informe o PNG base do cenário:",
    validate: (value) => {
      try {
        validatePngFile(value, "PNG base");
        return true;
      } catch (err) {
        return err.message;
      }
    },
  });

  const inferred = inferPriorityFromPng(input);
  const extraQuestions = [];

  if (!inferred.maskPath) {
    extraQuestions.push({
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
  }

  if (!validateOptionalFile(inferred.mapPath)) {
    extraQuestions.push({
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
  }

  const extras = extraQuestions.length ? await inquirer.prompt(extraQuestions) : {};
  const maskPath = inferred.maskPath ?? validatePngFile(extras.maskPath, "Máscara PNG");
  const mapPath = validateOptionalFile(inferred.mapPath)
    ? validateMapFile(inferred.mapPath, "MAP")
    : validateMapFile(extras.mapPath, "MAP");

  printSummary("Resumo da prioridade de BG", [
    ["PNG base", inferred.pngPath],
    ["Mask", maskPath],
    ["MAP", mapPath],
    ["Saída", inferred.outPath],
  ]);

  if (!(await confirmExecution())) return false;

  runPriorityFlow({
    pngPath: inferred.pngPath,
    maskPath,
    mapPath,
    outPath: inferred.outPath,
    layout: "auto",
  });
  printEquivalentCommand([
    "png2snes",
    "priority",
    inferred.pngPath,
    "--mask",
    maskPath,
    "--map",
    mapPath,
    "--out",
    inferred.outPath,
  ]);
  return true;
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
  printEquivalentCommand(["png2snes", "color", normalizedHex]);
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
  printEquivalentCommand(["png2snes", "analyze-map", mapPath]);
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
      console.error("[png2snes] Erro:", err.message);
    }
  }
}
