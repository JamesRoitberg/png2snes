#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import path from "node:path";
import { runPng2Snes } from "../src/index.js";

const program = new Command();

program
  .name("png2snes")
  .description("Converte PNG em tiles, mapas e paletas no formato do SNES.")
  .argument("<imagem>", "arquivo PNG de entrada")
  .option("-t, --tipo <tipo>", "sprite ou bg")
  .option("-m, --modo <modo>", "BG mode (1,3,7)", "1")
  .option("--tile-size <wh>", "tamanho do tile base, ex: 8x8", "8x8")
  .option("--sprite-sizes <sizes>", "tamanhos de sprite (combo SNES), ex: 8x8,16x16")
  .option("--bpp <bpp>", "bits por pixel (2,4,8)", "4")
  .option("--paleta <arquivo>", "arquivo de paleta (.pal SNES ou .txt RGB)")
  .option("--dedupe <modo>", "deduplicação de tiles: none,simple,h, v, full")
  .option("-o, --out-dir <dir>", "diretório de saída (default = diretório da imagem)")
  .option("--no-interactive", "não perguntar nada, usar apenas flags")
  .action(async (imagem, opts) => {
    const questions = [];

    const answers = {};

    let tipo = (opts.tipo || "").toLowerCase();

    if (!tipo && opts.interactive) {
      const { tipo: chosenTipo } = await inquirer.prompt({
        type: "list",
        name: "tipo",
        message: "Tipo de conversão:",
        choices: [
          { name: "Background (BG)", value: "bg" },
          { name: "Sprite", value: "sprite" },
        ],
      });
      tipo = chosenTipo;
    }

    answers.tipo = tipo;

    if (!opts.bpp && opts.interactive) {
      questions.push({
        type: "list",
        name: "bpp",
        message: "Bits por pixel (bpp):",
        default: "4",
        choices: [
          { name: "2 bpp (4 cores)", value: "2" },
          { name: "4 bpp (16 cores)", value: "4" },
          { name: "8 bpp (256 cores)", value: "8" },
        ],
      });
    } else {
      answers.bpp = opts.bpp;
    }

    if (!opts.tileSize && opts.interactive) {
      questions.push({
        type: "list",
        name: "tileSize",
        message: "Tamanho do tile base (BG):",
        default: "8x8",
        choices: ["8x8", "16x16"],
      });
    } else {
      answers.tileSize = opts.tileSize || "8x8";
    }

    if (!opts.spriteSizes && opts.interactive && answers.tipo === "sprite") {
      questions.push({
        type: "list",
        name: "spriteSizes",
        message: "Combo de tamanhos de sprites (SNES suporta 2 de cada vez):",
        default: "8x8,16x16",
        choices: [
          "8x8,16x16",
          "8x8,32x32",
          "8x8,64x64",
          "16x16,32x32",
          "16x16,64x64",
          "32x32,64x64",
        ],
      });
    } else {
      answers.spriteSizes = opts.spriteSizes;
    }

    if (typeof opts.dedupe === "undefined" && opts.interactive && answers.tipo === "bg") {
      questions.push({
        type: "list",
        name: "dedupe",
        message: "Deduplicação de tiles:",
        default: "simple",
        choices: [
          { name: "Nenhuma", value: "none" },
          { name: "Simples (idênticos apenas)", value: "simple" },
          { name: "Horizontal (tile + flip X)", value: "h" },
          { name: "Vertical (tile + flip Y)", value: "v" },
          { name: "Completa (flip X/Y)", value: "full" },
        ],
      });
    } else {
      answers.dedupe = opts.dedupe;
    }

    const finalOpts = {
      ...opts,
      tipo: answers.tipo || opts.tipo,
      bpp: Number(answers.bpp || opts.bpp || 4),
      tileSize: answers.tileSize || opts.tileSize || "8x8",
      spriteSizes: answers.spriteSizes || opts.spriteSizes,
      dedupe: answers.dedupe || opts.dedupe || "simple",
    };

    const MODE_RULES = {
      sprite: {
        generateMap: false,
        allowDedupe: false,
        askPaletteIndex: false,
      },
      bg: {
        generateMap: true,
        allowDedupe: true,
        askPaletteIndex: true,
      }
    };

    const mode = finalOpts.tipo;
    const rules = MODE_RULES[mode];

    if (!rules) {
      throw new Error(`Tipo inválido: ${mode}`);
    }

    if (!rules.allowDedupe) {
      finalOpts.dedupe = "none";
    }

    try {
      await runPng2Snes(imagem, finalOpts);

      if (finalOpts.tipo === "bg") {
        const { wantsMerge } = await inquirer.prompt({
          type: "confirm",
          name: "wantsMerge",
          message: "Deseja executar merge das partes (*-partN)?",
          default: false
        });

        if (wantsMerge) {
          const { mergeParts } = await import("../merge/mergeParts.js");

          const baseDir = finalOpts.outDir
            ? path.resolve(finalOpts.outDir)
            : path.dirname(path.resolve(imagem));

          const mergeInputDir = path.join(baseDir, "converted");
          const mergeOutputDir = path.join(mergeInputDir, "final");

          try {
            const result = await mergeParts(mergeInputDir, mergeOutputDir);
            console.log("[png2snes] Merge final gerado:");
            console.log(result);
          } catch (err) {
            console.error("[png2snes] Erro no merge:", err.message);
          }
        }
      }
    } catch (err) {
      console.error("[png2snes] Erro:", err.message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
