#!/usr/bin/env node
// tools/color2snes.js (ESM)
// Uso:
//   node tools/color2snes.js #RRGGBB
//   npm run color2snes -- #RRGGBB
//
// Saída:
// - cor original em SNES BGR555
// - +3 variações mais claras (mesmo tom)
// - +3 variações mais escuras (mesmo tom)

function die(msg) {
  console.error(`[color2snes] ERRO: ${msg}`);
  process.exit(1);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function parseHexColor(s) {
  if (!s) return null;
  let t = String(s).trim();
  if (t.startsWith("#")) t = t.slice(1);
  if (t.startsWith("0x") || t.startsWith("0X")) t = t.slice(2);

  if (t.length === 3) {
    // RGB -> RRGGBB
    t = t.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(t)) return null;

  const r = Number.parseInt(t.slice(0, 2), 16);
  const g = Number.parseInt(t.slice(2, 4), 16);
  const b = Number.parseInt(t.slice(4, 6), 16);
  return { r, g, b };
}

// RGB 0..255 <-> HSL (0..1)
function rgbToHsl(r, g, b) {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;

  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h * 6);
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= hp && hp < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (1 <= hp && hp < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (2 <= hp && hp < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (3 <= hp && hp < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (4 <= hp && hp < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
  };
}

function to5bit(x8) {
  // arredonda para a cor SNES mais próxima
  return Math.max(0, Math.min(31, Math.round((x8 * 31) / 255)));
}

function bgr555Word(r8, g8, b8) {
  const r5 = to5bit(r8);
  const g5 = to5bit(g8);
  const b5 = to5bit(b8);
  const w = (b5 << 10) | (g5 << 5) | r5;
  return { w, r5, g5, b5 };
}

function hexWord(w) {
  return `$${w.toString(16).toUpperCase().padStart(4, "0")}`;
}

function bits5(n) {
  return n.toString(2).padStart(5, "0");
}

function fmtLine(label, r, g, b) {
  const { w, r5, g5, b5 } = bgr555Word(r, g, b);
  const lo = w & 0xFF;
  const hi = (w >> 8) & 0xFF;

  return {
    label,
    rgb: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase(),
    snes: hexWord(w),
    bgrBits: `${bits5(b5)} ${bits5(g5)} ${bits5(r5)}`,
    bytesLE: `$${lo.toString(16).toUpperCase().padStart(2, "0")} $${hi.toString(16).toUpperCase().padStart(2, "0")}`,
  };
}

function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  const rgb = parseHexColor(arg);

  if (!rgb) {
    die(`uso: npm run color2snes -- #RRGGBB (ex: npm run color2snes -- #290839)`);
  }

  const base = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // 3 mais escuras e 3 mais claras
  const deltas = [-0.30, -0.20, -0.10, 0, 0.10, 0.20, 0.30];

  const rows = deltas.map((d) => {
    const l = clamp01(base.l + d);
    const { r, g, b } = hslToRgb(base.h, base.s, l);

    let label = "BASE";
    if (d < 0) label = `DARK ${Math.abs(d).toFixed(2)}`;
    if (d > 0) label = `LIGHT ${d.toFixed(2)}`;

    return fmtLine(label, r, g, b);
  });

  console.log("");
  console.log(`[color2snes] Input: ${arg}`);
  console.log("Formato SNES: BGR555 (BBBBB GGGGG RRRRR)");
  console.log("");

  for (const r of rows) {
    console.log(
      `${r.label.padEnd(9)}  ${r.rgb}  ->  ${r.snes}   bits: ${r.bgrBits}   bytes(LE): ${r.bytesLE}`
    );
  }

  console.log("");
}

main();