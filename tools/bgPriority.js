// tools/bgPriority.js
// Aplica bit 13 (priority) em um .map SNES usando uma máscara PNG sobre o PNG final.
//
// Uso:
//   node tools/bgPriority.js --png pit-bg2.png --mask pit-bg2-priority.png --map pit-bg2.map --out pit-bg2-pri.map
//   npm run bg:priority -- --png to-convert/converted/pit-bg2.png --mask to-convert/converted/pit-bg2.png --map to-convert/converted/pit-bg2.map --out to-convert/converted/pit-bg2-pri.map
//
// Opcional:
//   --layout auto|snes|linear   (default: auto)
//     auto => snes se tilesX>32 || tilesY>32, senão linear
//     npm run bg:priority -- --dir to-convert/converted --stem pit-bg2
//
// Regra da máscara:
//   Para cada tile 8×8, se existir QUALQUER pixel com alpha>0 no bloco 8×8 da máscara => priority=1 naquele tile.

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    args[key] = val;
  }
  return args;
}

function readPng(p) {
  const buf = fs.readFileSync(p);
  return PNG.sync.read(buf);
}

function alphaAt(png, x, y) {
  const i = (y * png.width + x) << 2;
  return png.data[i + 3];
}

function mapIndexLinear(tilesX, x, y) {
  return y * tilesX + x;
}

// Layout PPU (screens 32×32) concatenadas
function mapIndexSnes(tilesX, x, y) {
  const screensPerRow = tilesX >> 5; // tilesX/32
  const screenX = x >> 5;
  const screenY = y >> 5;
  const screen = screenX + screenY * screensPerRow;
  const sx = x & 31;
  const sy = y & 31;
  return screen * 1024 + sy * 32 + sx;
}

function main() {
  const args = parseArgs(process.argv);

  let pngPath = args.png;
  let maskPath = args.mask;
  let mapPath = args.map;
  let outPath = args.out;
  const layoutArg = (args.layout ?? "auto").toLowerCase();

  const dir = args.dir ? String(args.dir) : "";
  const stem = args.stem ? String(args.stem) : "";

  if (stem) {
    const baseDir = dir || ".";
    const pickExisting = (candidates) => {
      for (const p of candidates) {
        if (fs.existsSync(p)) return p;
      }
      return candidates[0];
    };

    if (!pngPath) pngPath = path.join(baseDir, `${stem}.png`);
    if (!mapPath) mapPath = path.join(baseDir, `${stem}.map`);

    if (!maskPath) {
      maskPath = pickExisting([
        path.join(baseDir, `${stem}-priority.png`),
        path.join(baseDir, `${stem}-prio.png`),
      ]);
    }

    if (!outPath) outPath = path.join(baseDir, `${stem}-pri.map`);
  }

  if (!pngPath || !maskPath || !mapPath || !outPath) {
    console.error(
      "Uso: node tools/bgPriority.js (--png final.png --mask mask.png --map in.map --out out.map | --dir <dir> --stem <stem>) [--layout auto|snes|linear]"
    );
    process.exit(1);
  }

  if (path.resolve(pngPath) === path.resolve(maskPath)) {
    console.warn("[bgPriority] WARN: --mask é o mesmo arquivo que --png. Isso provavelmente marcará quase tudo como prioridade.");
  }

  const finalPng = readPng(pngPath);
  const maskPng = readPng(maskPath);

  if (finalPng.width !== maskPng.width || finalPng.height !== maskPng.height) {
    throw new Error(
      `mask.png precisa ter o MESMO tamanho do final.png. final=${finalPng.width}x${finalPng.height} mask=${maskPng.width}x${maskPng.height}`
    );
  }

  if (finalPng.width % 8 !== 0 || finalPng.height % 8 !== 0) {
    throw new Error(
      `final.png precisa ser múltiplo de 8. recebido ${finalPng.width}x${finalPng.height}`
    );
  }

  const tilesX = finalPng.width / 8;
  const tilesY = finalPng.height / 8;

  const mapBuf = fs.readFileSync(mapPath);
  const expectedBytes = tilesX * tilesY * 2;
  if (mapBuf.length !== expectedBytes) {
    throw new Error(
      `.map tamanho não bate com PNG. esperado ${expectedBytes} bytes (${tilesX}x${tilesY}), recebido ${mapBuf.length}`
    );
  }
  if (mapBuf.length % 2 !== 0) {
    throw new Error(`.map inválido (tamanho ímpar): ${mapBuf.length}`);
  }

  let layout = layoutArg;
  if (layout === "auto") {
    layout = tilesX > 32 || tilesY > 32 ? "snes" : "linear";
  }
  if (layout !== "snes" && layout !== "linear") {
    throw new Error(`--layout inválido: ${layoutArg} (use auto|snes|linear)`);
  }

  // Se for snes, precisa ser múltiplo de 32 (caso contrário, não existe screens 32×32 certinho)
  if (layout === "snes" && ((tilesX % 32) !== 0 || (tilesY % 32) !== 0)) {
    throw new Error(
      `layout "snes" exige tilesX/tilesY múltiplos de 32. recebido ${tilesX}x${tilesY}`
    );
  }

  const outBuf = Buffer.from(mapBuf);
  const PRIORITY_BIT = 1 << 13;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      // varre bloco 8×8 da máscara; se qualquer alpha>0 => marcado
      let marked = false;
      const px0 = tx * 8;
      const py0 = ty * 8;

      for (let py = 0; py < 8 && !marked; py++) {
        for (let px = 0; px < 8; px++) {
          if (alphaAt(maskPng, px0 + px, py0 + py) > 0) {
            marked = true;
            break;
          }
        }
      }

      if (!marked) continue;

      const wordIndex =
        layout === "snes"
          ? mapIndexSnes(tilesX, tx, ty)
          : mapIndexLinear(tilesX, tx, ty);

      const byteOff = wordIndex * 2;
      const w = outBuf.readUInt16LE(byteOff);
      outBuf.writeUInt16LE(w | PRIORITY_BIT, byteOff);
    }
  }

  fs.writeFileSync(outPath, outBuf);
  console.log("OK:", path.resolve(outPath), `(layout=${layout}, tiles=${tilesX}x${tilesY})`);
}

main();
