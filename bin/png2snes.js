#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { runPng2Snes } from "../src/index.js";
import { findSequenceFrames, runSequence } from "../src/sequence.js";
import { addConversionOptions, resolveConversionOptions } from "../src/cli/conversionOptions.js";
import {
  inferCombineFromPart,
  inferPriorityFromPng,
  inferSequenceFromFrame,
  normalizeHexColor,
  parseInteger,
  validateMapFile,
  validatePngFile,
} from "../src/cli/discovery.js";
import { openMainMenu } from "../src/cli/menu.js";
import {
  printPreview,
  printSummary,
  runAnalyzeMapFlow,
  runColorFlow,
  runCombineFlow,
  runConvertFlow,
  runPriorityFlow,
  runSequenceFlow,
  runSplitFlow,
} from "../src/cli/toolRunner.js";

const HUB_COMMANDS = new Set([
  "convert",
  "sequence",
  "combine",
  "split",
  "priority",
  "color",
  "analyze-map",
  "examples",
]);

function handleCliError(err) {
  console.error("[png2snes] Erro:", err.message);
  process.exitCode = 1;
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

function addHubCommands(program) {
  addConversionOptions(
    program
      .command("convert <input>")
      .description("Converte um PNG para CHR/MAP/PAL no formato do SNES.")
      .action(async (input, opts) => {
        try {
          const inputPath = validatePngFile(input, "PNG");
          const finalOpts = await resolveConversionOptions(opts);

          printSummary("Resumo da conversão", [
            ["Arquivo", inputPath],
            ["Tipo", finalOpts.tipo],
            ["BPP", finalOpts.bpp],
            ["Tile size", finalOpts.tileSize],
            ["Dedupe", finalOpts.dedupe],
            ["Out dir", finalOpts.outDir ?? "(mesma pasta do PNG)"],
          ]);

          await runConvertFlow({ inputPath, options: finalOpts });
        } catch (err) {
          handleCliError(err);
        }
      }),
  );

  addConversionOptions(
    program
      .command("sequence <frame>")
      .description("Converte uma sequência de frames detectada a partir de um frame numerado.")
      .action(async (frame, opts) => {
        try {
          const sequenceInfo = inferSequenceFromFrame(frame);
          printPreview(
            "Preview da sequência detectada",
            sequenceInfo.frames.map((item) => item.file),
            sequenceInfo.warnings,
          );

          const finalOpts = await resolveConversionOptions(opts);
          printSummary("Resumo da sequência", [
            ["Frame informado", validatePngFile(frame, "Frame")],
            ["Diretório", sequenceInfo.dir],
            ["Stem", sequenceInfo.stem],
            ["Frames", sequenceInfo.frames.length],
            ["Tipo", finalOpts.tipo],
            ["BPP", finalOpts.bpp],
          ]);

          await runSequenceFlow({ sequenceInfo, options: finalOpts });
        } catch (err) {
          handleCliError(err);
        }
      }),
  );

  program
    .command("combine <file>")
    .description("Combina automaticamente partes relacionadas a partir de um arquivo partN.png.")
    .action((file) => {
      try {
        const combineInfo = inferCombineFromPart(file);
        printPreview(
          "Preview das partes detectadas",
          combineInfo.parts.map((part) => part.file),
          combineInfo.warnings,
        );
        printSummary("Resumo da combinação", [
          ["Arquivo informado", validatePngFile(file, "Parte PNG")],
          ["Stem", combineInfo.stem],
          ["Partes", combineInfo.parts.length],
          ["Saída", combineInfo.outPath],
        ]);

        runCombineFlow({ parts: combineInfo.parts, outPath: combineInfo.outPath });
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("split <input>")
    .description("Splita um PNG indexado em vários frames.")
    .option("--name <name>", "nome base de saída")
    .option("--sepIndex <n>", "índice de separação", "0")
    .option("--out-dir <dir>", "diretório de saída")
    .option("--tile <n>", "tamanho do tile")
    .option("--pad <n>", "padding numérico dos arquivos")
    .action((input, opts) => {
      try {
        const inputPath = validatePngFile(input, "PNG de entrada");
        const defaultName = path.basename(inputPath, ".png").replace(
          /(?:[-_]?sprite)?(?:[-_]?sheet)$/i,
          "",
        ) || path.basename(inputPath, ".png");
        const name = opts.name || defaultName;
        const sepIndex = parseInteger(opts.sepIndex, "sepIndex", { min: 0, max: 255 });
        const outDir = opts.outDir || path.dirname(inputPath);
        const tile = typeof opts.tile === "undefined"
          ? undefined
          : parseInteger(opts.tile, "tile", { min: 1 });
        const pad = typeof opts.pad === "undefined"
          ? undefined
          : parseInteger(opts.pad, "pad", { min: 1 });

        printSummary("Resumo do split", [
          ["Arquivo", inputPath],
          ["Nome base", name],
          ["sepIndex", sepIndex],
          ["Out dir", outDir],
        ]);

        runSplitFlow({ inputPath, outDir, name, sepIndex, tile, pad });
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("priority <input>")
    .description("Aplica prioridade de BG usando arquivos relacionados inferidos a partir do PNG base.")
    .option("--mask <file>", "arquivo PNG de máscara")
    .option("--map <file>", "arquivo MAP de entrada")
    .option("--out <file>", "arquivo MAP de saída")
    .option("--layout <layout>", "layout: auto|snes|linear", "auto")
    .action((input, opts) => {
      try {
        const inferred = inferPriorityFromPng(input);
        const pngPath = inferred.pngPath;
        const maskPath = opts.mask
          ? validatePngFile(opts.mask, "Máscara PNG")
          : inferred.maskPath
            ? validatePngFile(inferred.maskPath, "Máscara PNG")
            : null;
        const mapPath = opts.map
          ? validateMapFile(opts.map, "MAP")
          : validateMapFile(inferred.mapPath, "MAP");
        const outPath = opts.out || inferred.outPath;

        if (!maskPath) {
          throw new Error(
            `Não consegui inferir a máscara automaticamente para ${pngPath}. Use --mask <arquivo.png>.`,
          );
        }

        printSummary("Resumo da prioridade de BG", [
          ["PNG base", pngPath],
          ["Mask", maskPath],
          ["MAP", mapPath],
          ["Saída", outPath],
          ["Layout", opts.layout],
        ]);

        runPriorityFlow({
          pngPath,
          maskPath,
          mapPath,
          outPath,
          layout: opts.layout,
        });
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("color <hex>")
    .description("Converte uma cor hexadecimal para SNES BGR555.")
    .action((hex) => {
      try {
        const normalizedHex = normalizeHexColor(hex);
        printSummary("Resumo da conversão de cor", [["Cor", normalizedHex]]);
        runColorFlow({ hex: normalizedHex });
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("analyze-map <file>")
    .description("Analisa um arquivo MAP do SNES.")
    .option("--chr-tiles <n>", "quantidade de tiles no CHR")
    .action((file, opts) => {
      try {
        const mapPath = validateMapFile(file, "MAP");
        const chrTiles = typeof opts.chrTiles === "undefined"
          ? null
          : parseInteger(opts.chrTiles, "chrTiles", { min: 0 });

        printSummary("Resumo da análise de MAP", [
          ["Arquivo", mapPath],
          ["CHR tiles", chrTiles === null ? "(não informado)" : chrTiles],
        ]);

        runAnalyzeMapFlow({ mapPath, chrTiles });
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command("examples")
    .description("Mostra exemplos de comandos do novo hub principal.")
    .action(() => {
      printExamples();
    });

  return program;
}

function createHubProgram() {
  return addHubCommands(
    new Command()
      .name("png2snes")
      .description("Converte PNG em tiles, mapas e paletas no formato do SNES.")
      .showHelpAfterError(),
  );
}

function createLegacyProgram() {
  const program = addConversionOptions(
    new Command()
      .name("png2snes")
      .description("Converte PNG em tiles, mapas e paletas no formato do SNES.")
      .showHelpAfterError()
      .argument("[imagem]", "arquivo PNG de entrada")
      .option("--sequence", "processa uma sequência de frames encontrada por stem")
      .option("--dir <dir>", "diretório de busca para --sequence")
      .option("--stem <stem>", "prefixo base da sequência, ex: stage-anim"),
  );

  program.action(async (imagem, opts) => {
    try {
      if (opts.sequence) {
        const sequenceInfo = findSequenceFrames({
          imagePath: imagem,
          dir: opts.dir,
          stem: opts.stem,
        });

        console.log(`[png2snes][sequence] Frames encontrados: ${sequenceInfo.frames.length}`);
        sequenceInfo.frames.forEach((frame, index) => {
          console.log(`  ${String(index + 1).padStart(2, "0")}. ${frame.file}`);
        });

        for (const warning of sequenceInfo.warnings) {
          console.warn(`[png2snes][sequence] WARN: ${warning}`);
        }

        const finalOpts = await resolveConversionOptions(opts);
        await runSequence({
          sequenceInfo,
          options: finalOpts,
        });
        return;
      }

      if (!imagem) {
        throw new Error("Imagem não definida (passe <imagem> ou use --sequence --stem ...).");
      }

      const finalOpts = await resolveConversionOptions(opts);
      await runPng2Snes(imagem, finalOpts);
    } catch (err) {
      handleCliError(err);
    }
  });

  return program;
}

function createHelpProgram() {
  const program = addConversionOptions(
    new Command()
      .name("png2snes")
      .description("Converte PNG em tiles, mapas e paletas no formato do SNES.")
      .showHelpAfterError()
      .argument("[imagem]", "arquivo PNG de entrada")
      .option("--sequence", "processa uma sequência de frames encontrada por stem")
      .option("--dir <dir>", "diretório de busca para --sequence")
      .option("--stem <stem>", "prefixo base da sequência, ex: stage-anim"),
  );

  return addHubCommands(program);
}

try {
  if (process.argv.length === 2) {
    await openMainMenu();
  } else {
    const firstArg = process.argv[2];

    if (firstArg === "-h" || firstArg === "--help" || firstArg === "help") {
      createHelpProgram().outputHelp();
    } else if (HUB_COMMANDS.has(firstArg)) {
      await createHubProgram().parseAsync(process.argv);
    } else {
      await createLegacyProgram().parseAsync(process.argv);
    }
  }
} catch (err) {
  handleCliError(err);
}
