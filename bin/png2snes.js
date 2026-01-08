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
  .option("--sprite-sizes <sizes>", "tamanhos de sprite (combo SNES)")
  .option("--bpp <bpp>", "bits por pixel (2,4,8)", "4")
  .option("--paleta <arquivo>", "arquivo de paleta (.pal SNES ou .txt RGB)")
  .option("--dedupe <modo>", "deduplicação: none,simple,h,v,full")
  .option("-o, --out-dir <dir>", "diretório de saída")
  .option("--no-interactive", "não perguntar nada, usar apenas flags")
  .action(async (imagem, opts) => {
    try {
      const interactive = opts.interactive !== false;
      const questions = [];
      const answers = {};

      // ========= TIPO =========
      let tipo = (opts.tipo || "").toLowerCase();

      if (!tipo && interactive) {
        const res = await inquirer.prompt({
          type: "list",
          name: "tipo",
          message: "Tipo de conversão:",
          choices: [
            { name: "Background (BG)", value: "bg" },
            { name: "Sprite", value: "sprite" },
          ],
        });
        tipo = res.tipo;
      }

      if (!tipo) {
        throw new Error("Tipo não definido (use --tipo bg ou sprite)");
      }

      answers.tipo = tipo;

      // ========= BPP =========
      if (!opts.bpp && interactive) {
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

      // ========= TILE SIZE (BG) =========
      if (!opts.tileSize && interactive && tipo === "bg") {
        questions.push({
          type: "list",
          name: "tileSize",
          message: "Tamanho do tile base:",
          default: "8x8",
          choices: ["8x8", "16x16"],
        });
      } else {
        answers.tileSize = opts.tileSize || "8x8";
      }

      // ========= SPRITE SIZES =========
      if (!opts.spriteSizes && interactive && tipo === "sprite") {
        questions.push({
          type: "list",
          name: "spriteSizes",
          message: "Combo de tamanhos de sprite:",
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

      // ========= DEDUPE (BG IMPORTANTE) =========
      if (
        interactive &&
        tipo === "bg" &&
        typeof opts.dedupe === "undefined"
      ) {
        questions.push({
          type: "list",
          name: "dedupe",
          message: "Deduplicação de tiles:",
          default: "simple",
          choices: [
            { name: "Nenhuma", value: "none" },
            { name: "Simples (idênticos)", value: "simple" },
            { name: "Horizontal (flip X)", value: "h" },
            { name: "Vertical (flip Y)", value: "v" },
            { name: "Completa (X/Y)", value: "full" },
          ],
        });
      }

      // ========= EXECUTA PROMPTS =========
      if (questions.length > 0) {
        Object.assign(answers, await inquirer.prompt(questions));
      }

      // ========= FINAL OPTIONS =========
      const finalOpts = {
        ...opts,
        tipo,
        bpp: Number(answers.bpp ?? opts.bpp ?? 4),
        tileSize: answers.tileSize ?? opts.tileSize ?? "8x8",
        spriteSizes: answers.spriteSizes ?? opts.spriteSizes,
        dedupe: answers.dedupe ?? opts.dedupe ?? "simple",
      };

      // ========= REGRAS =========
      if (finalOpts.tipo === "sprite") {
        finalOpts.dedupe = "none";
      }

      // ========= CONVERSÃO =========
      await runPng2Snes(imagem, finalOpts);

      // ========= MERGE BG =========
      if (finalOpts.tipo === "bg" && interactive) {
        const { wantsMerge } = await inquirer.prompt({
          type: "confirm",
          name: "wantsMerge",
          message: "Deseja executar merge das partes (*-partN)?",
          default: false,
        });

        if (wantsMerge) {
          const { mergeParts } = await import("../merge/mergeParts.js");

          const baseDir = finalOpts.outDir
            ? path.resolve(finalOpts.outDir)
            : path.dirname(path.resolve(imagem));

          const mergeInputDir = path.join(baseDir, "converted");
          const mergeOutputDir = path.join(mergeInputDir, "final");

          const result = await mergeParts(mergeInputDir, mergeOutputDir);
          console.log("[png2snes] Merge final gerado:");
          console.log(result);
        }
      }

    } catch (err) {
      console.error("[png2snes] Erro:", err.message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
