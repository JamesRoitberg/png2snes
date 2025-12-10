#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
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
  .option("--pal-index <idx>", "índice inicial de subpaleta (0-7 BG, 8-15 sprites)")
  .option("--color-zero", "força inserção de cor zero preta quando houver só 15 cores por subpaleta")
  .option("--no-color-zero", "não insere cor zero automaticamente")
  .option("--dedupe <modo>", "deduplicação de tiles: none,simple,h, v, full")
  .option("--metatile <wh>", "gera metatiles (ex: 16x16) em arquivo auxiliar JSON")
  .option("-o, --out-dir <dir>", "diretório de saída (default = diretório da imagem)")
  .option("--no-interactive", "não perguntar nada, usar apenas flags")
  .action(async (imagem, opts) => {
    const questions = [];

    const answers = {};

    if (!opts.tipo && opts.interactive) {
      questions.push({
        type: "list",
        name: "tipo",
        message: "Tipo de conversão:",
        choices: [
          { name: "Background (BG)", value: "bg" },
          { name: "Sprite", value: "sprite" },
        ],
      });
    } else {
      answers.tipo = (opts.tipo || "").toLowerCase();
    }

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

    if (!opts.spriteSizes && opts.interactive) {
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

    if (typeof opts.palIndex === "undefined" && opts.interactive) {
      questions.push({
        type: "number",
        name: "palIndex",
        message: "Subpaleta inicial (0-7 BG, 8-15 sprites):",
        default: 0,
        validate: v => (v >= 0 && v <= 15) || "Use um valor entre 0 e 15",
      });
    } else if (typeof opts.palIndex !== "undefined") {
      answers.palIndex = Number(opts.palIndex);
    }

    if (typeof opts.dedupe === "undefined" && opts.interactive) {
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

    if (!opts.metatile && opts.interactive) {
      questions.push({
        type: "confirm",
        name: "wantsMetatile",
        message: "Criar metatiles (ex: 16x16 para MK)?",
        default: false,
      });
    }

    if (questions.length && opts.interactive) {
      const qAnswers = await inquirer.prompt(questions);
      Object.assign(answers, qAnswers);
      if (answers.wantsMetatile && !opts.metatile) {
        const { metatileSize } = await inquirer.prompt({
          type: "list",
          name: "metatileSize",
          message: "Tamanho da metatile:",
          default: "16x16",
          choices: ["16x16", "32x32"],
        });
        answers.metatile = metatileSize;
      }
    }

    const finalOpts = {
      ...opts,
      tipo: answers.tipo || opts.tipo,
      bpp: Number(answers.bpp || opts.bpp || 4),
      tileSize: answers.tileSize || opts.tileSize || "8x8",
      spriteSizes: answers.spriteSizes || opts.spriteSizes,
      palIndex:
        typeof answers.palIndex === "number"
          ? answers.palIndex
          : typeof opts.palIndex !== "undefined"
          ? Number(opts.palIndex)
          : undefined,
      dedupe: answers.dedupe || opts.dedupe || "simple",
      metatile: answers.metatile || opts.metatile,
    };

    try {
      await runPng2Snes(imagem, finalOpts);
    } catch (err) {
      console.error("[png2snes] Erro:", err.message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
