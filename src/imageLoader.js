import fs from "node:fs";
import { PNG } from "pngjs";

export async function loadPng(filePath) {
  const data = await fs.promises.readFile(filePath);
  const png = PNG.sync.read(data);
  const { width, height, data: rgba } = png;

  const pixels = new Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    const a = rgba[o + 3];
    if (a === 0) {
      pixels[i] = { r: 0, g: 0, b: 0, a: 0 };
    } else {
      pixels[i] = { r, g, b, a };
    }
  }

   // Se o PNG for indexado, png.palette existe
  let palette = null;

  if (Array.isArray(png.palette)) {
    palette = png.palette.map(([r, g, b]) => ({
      r,
      g,
      b,
      a: 255,
    }));
  }

  return {
    width,
    height,
    pixels,
    palette,
  };
}
