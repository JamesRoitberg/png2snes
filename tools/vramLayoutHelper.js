// tools/vramLayoutHelper.js (ESM)
// -----------------------------------------------------------------------------
// Lê tamanhos de .chr/.map gerados e imprime:
// - VRAM_BG1_TILES / VRAM_BG1_MAP / VRAM_BG2_TILES / VRAM_BG2_MAP
// - REG_BG12NBA / REG_BG1SC / REG_BG2SC
//
// NÃO modifica nenhum arquivo. Apenas lê e imprime.
// Sai com código 1 em caso de erro (tamanho inválido, não múltiplo de bytesPerTile, overlap, não cabe).
// -----------------------------------------------------------------------------

import fs from "node:fs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;

    const key = a.slice(2);
    const next = argv[i + 1];

    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function toHex(value, width = 4) {
  const s = (value >>> 0).toString(16).toUpperCase().padStart(width, "0");
  return `$${s}`;
}

function parseHexOrDec(s) {
  if (typeof s !== "string") return null;
  if (s.startsWith("$")) return Number.parseInt(s.slice(1), 16);
  if (s.startsWith("0x") || s.startsWith("0X")) return Number.parseInt(s.slice(2), 16);
  return Number.parseInt(s, 10);
}

function alignUp(v, a) {
  return (v + (a - 1)) & ~(a - 1);
}

function fileSizeOrNull(path) {
  if (!path) return null;
  if (!fs.existsSync(path)) return null;
  return fs.statSync(path).size;
}

function fail(msg) {
  console.error(`[vram-layout] ERRO: ${msg}`);
  process.exit(1);
}

function rangesIntersect(a0, a1, b0, b1) {
  // ranges half-open: [start, end)
  return a0 < b1 && b0 < a1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const bpp = args["bpp"] ? Number.parseInt(args["bpp"], 10) : 4;

  let bytesPerTile = 32;
  if (bpp === 2) bytesPerTile = 16;
  else if (bpp === 4) bytesPerTile = 32;
  else if (bpp === 8) bytesPerTile = 64;
  else fail(`bpp inválido: ${args["bpp"]} (use 2,4,8)`);

  const bg1ChrPath = args["bg1-chr"] || null;
  const bg1MapPath = args["bg1-map"] || null;
  const bg2ChrPath = args["bg2-chr"] || null;
  const bg2MapPath = args["bg2-map"] || null;

  // Defaults (política do projeto)
  const VRAM_BG1_TILES = 0x0000;

  let VRAM_BG1_MAP = args["vram-bg1-map"]
  ? parseHexOrDec(args["vram-bg1-map"])
  : 0x6800;

  const VRAM_BG2_MAP = args["vram-bg2-map"]
    ? parseHexOrDec(args["vram-bg2-map"])
    : 0xF000;

  if (VRAM_BG1_MAP == null || Number.isNaN(VRAM_BG1_MAP)) fail("vram-bg1-map inválido.");
  if (VRAM_BG2_MAP == null || Number.isNaN(VRAM_BG2_MAP)) fail("vram-bg2-map inválido.");

  const BG1_MAP_SIZE_EXPECTED = 0x2000; // 64x64 * 2
  const BG2_MAP_SIZE_EXPECTED = 0x1000; // 64x32 * 2

  const bg1ChrSize = fileSizeOrNull(bg1ChrPath);
  const bg1MapSize = fileSizeOrNull(bg1MapPath);
  const bg2ChrSize = fileSizeOrNull(bg2ChrPath);
  const bg2MapSize = fileSizeOrNull(bg2MapPath);

  // Validações de MAP (se fornecido)
  if (bg1MapPath && bg1MapSize == null) fail(`BG1 map não encontrado: ${bg1MapPath}`);
  if (bg2MapPath && bg2MapSize == null) fail(`BG2 map não encontrado: ${bg2MapPath}`);

  if (bg1MapSize != null && bg1MapSize !== BG1_MAP_SIZE_EXPECTED) {
    fail(`BG1 map tamanho inesperado: ${bg1MapSize} (${toHex(bg1MapSize)}) esperado ${BG1_MAP_SIZE_EXPECTED} (${toHex(BG1_MAP_SIZE_EXPECTED)})`);
  }

  if (bg2MapSize != null && bg2MapSize !== BG2_MAP_SIZE_EXPECTED) {
    fail(`BG2 map tamanho inesperado: ${bg2MapSize} (${toHex(bg2MapSize)}) esperado ${BG2_MAP_SIZE_EXPECTED} (${toHex(BG2_MAP_SIZE_EXPECTED)})`);
  }

  const auto = args["auto"] === true;
  const userForcedBg1Map = typeof args["vram-bg1-map"] === "string";

  // Se --auto estiver ligado e o usuário NÃO forçou um VRAM_BG1_MAP manual,
  // move o BG1_MAP pra depois do fim do CHR, alinhado em $0800 (reg BGxSC).
  if (auto && !userForcedBg1Map && bg1ChrSize != null && bg1MapSize != null) {
    const bg1TilesEnd = VRAM_BG1_TILES + bg1ChrSize;   // end (exclusive)
    const minBg1Map = alignUp(bg1TilesEnd, 0x0800);

    if (minBg1Map > VRAM_BG1_MAP) {
      console.log(`[vram-layout] INFO: BG1_MAP movido de ${toHex(VRAM_BG1_MAP)} para ${toHex(minBg1Map)} (CHR invadiu/encostou no map).`);
      VRAM_BG1_MAP = minBg1Map;
    }
  }

  // Validações de CHR (se fornecido)
  if (bg1ChrPath && bg1ChrSize == null) fail(`BG1 chr não encontrado: ${bg1ChrPath}`);
  if (bg2ChrPath && bg2ChrSize == null) fail(`BG2 chr não encontrado: ${bg2ChrPath}`);

  if (bg1ChrSize != null && (bg1ChrSize % bytesPerTile) !== 0) {
    fail(`BG1 chr não é múltiplo de ${bytesPerTile} bytes: ${bg1ChrSize} (${toHex(bg1ChrSize)})`);
  }
  if (bg2ChrSize != null && (bg2ChrSize % bytesPerTile) !== 0) {
    fail(`BG2 chr não é múltiplo de ${bytesPerTile} bytes: ${bg2ChrSize} (${toHex(bg2ChrSize)})`);
  }

  // Política de layout: BG2_TILES = alignUp(BG1_MAP_END, $2000)
  // BG1_MAP_SIZE é fixo pela política (mesmo se BG1 map não for fornecido).
  const BG1_MAP_END = VRAM_BG1_MAP + BG1_MAP_SIZE_EXPECTED;
  const VRAM_BG2_TILES = alignUp(BG1_MAP_END, 0x2000);

  // Check BG2 tiles cabe antes do BG2 map fixo (se BG2 chr existe)
  if (bg2ChrSize != null) {
    const bg2TilesEnd = VRAM_BG2_TILES + bg2ChrSize;
    if (bg2TilesEnd > VRAM_BG2_MAP) {
      fail(
        `BG2 tiles não cabe antes do BG2 map fixo em ${toHex(VRAM_BG2_MAP)}. ` +
        `BG2_TILES=${toHex(VRAM_BG2_TILES)} + BG2_CHR_SIZE=${toHex(bg2ChrSize)} -> end=${toHex(bg2TilesEnd)}. ` +
        `Mova BG1_MAP ou BG2_MAP.`
      );
    }
  }

  // Ranges VRAM (half-open)
  const ranges = [];

  if (bg1ChrSize != null) {
    ranges.push({ name: "BG1_TILES", start: VRAM_BG1_TILES, end: VRAM_BG1_TILES + bg1ChrSize });
  }
  // BG1 map range sempre existe como layout (mas só valida overlap com ele se o map foi gerado)
  if (bg1MapSize != null) {
    ranges.push({ name: "BG1_MAP", start: VRAM_BG1_MAP, end: VRAM_BG1_MAP + BG1_MAP_SIZE_EXPECTED });
  }

  if (bg2ChrSize != null) {
    ranges.push({ name: "BG2_TILES", start: VRAM_BG2_TILES, end: VRAM_BG2_TILES + bg2ChrSize });
  }
  if (bg2MapSize != null) {
    ranges.push({ name: "BG2_MAP", start: VRAM_BG2_MAP, end: VRAM_BG2_MAP + BG2_MAP_SIZE_EXPECTED });
  }

  // Validar VRAM 16-bit
  for (const r of ranges) {
    if (r.start < 0 || r.end > 0x10000) {
      fail(`${r.name} fora do range de VRAM 16-bit: ${toHex(r.start)}..${toHex(r.end)}`);
    }
  }

  // Overlap check
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (rangesIntersect(a.start, a.end, b.start, b.end)) {
        fail(`Overlap VRAM entre ${a.name} (${toHex(a.start)}..${toHex(a.end - 1)}) e ${b.name} (${toHex(b.start)}..${toHex(b.end - 1)})`);
      }
    }
  }

  // Regs
  // BG12NBA só imprime se ambos CHR existem (evita confusão)
  let REG_BG12NBA = null;
  if (bg1ChrSize != null && bg2ChrSize != null) {
    const bg1Nibble = (VRAM_BG1_TILES / 0x2000) & 0x0F;
    const bg2Nibble = (VRAM_BG2_TILES / 0x2000) & 0x0F;
    REG_BG12NBA = ((bg2Nibble << 4) | bg1Nibble) & 0xFF;
  }

  // BGxSC só imprime se map existe
  let REG_BG1SC = null;
  let REG_BG2SC = null;

  if (bg1MapSize != null) {
    const baseBits = (VRAM_BG1_MAP / 0x0800) & 0x3F;
    const sizeBits = 3; // 64x64
    REG_BG1SC = ((baseBits << 2) | sizeBits) & 0xFF;
  }

  if (bg2MapSize != null) {
    const baseBits = (VRAM_BG2_MAP / 0x0800) & 0x3F;
    const sizeBits = 1; // 64x32
    REG_BG2SC = ((baseBits << 2) | sizeBits) & 0xFF;
  }

  // Output
  console.log("");
  console.log("// -----------------------------------------------------------------------------");
  console.log("// VRAM layout (png2snes helper) — pronto para copiar/colar");
  console.log("// -----------------------------------------------------------------------------");
  if (bg1ChrSize != null || bg1MapSize != null) {
    console.log(`constant VRAM_BG1_TILES = ${toHex(VRAM_BG1_TILES)}`);
    console.log(`constant VRAM_BG1_MAP   = ${toHex(VRAM_BG1_MAP)}`);
  }
  if (bg2ChrSize != null || bg2MapSize != null) {
    console.log(`constant VRAM_BG2_TILES = ${toHex(VRAM_BG2_TILES)} // calculado`);
    console.log(`constant VRAM_BG2_MAP   = ${toHex(VRAM_BG2_MAP)}`);
  }
  console.log("");

  if (REG_BG12NBA != null) {
    console.log(`constant REG_BG12NBA = ${toHex(REG_BG12NBA, 2)}`);
  }
  if (REG_BG1SC != null) {
    console.log(`constant REG_BG1SC   = ${toHex(REG_BG1SC, 2)}`);
  }
  if (REG_BG2SC != null) {
    console.log(`constant REG_BG2SC   = ${toHex(REG_BG2SC, 2)}`);
  }

  console.log("");
  console.log("// -----------------------------------------------------------------------------");
  console.log("// Resumo");
  console.log("// -----------------------------------------------------------------------------");

  function printSize(label, size) {
    if (size == null) return;
    console.log(`${label}: ${size} bytes (${toHex(size)})`);
  }

  printSize("BG1_CHR_SIZE", bg1ChrSize);
  if (bg1ChrSize != null) console.log(`BG1 tiles: ${bg1ChrSize / bytesPerTile} tiles (${bpp}bpp)`);
  printSize("BG1_MAP_SIZE", bg1MapSize);

  console.log("");

  printSize("BG2_CHR_SIZE", bg2ChrSize);
  if (bg2ChrSize != null) console.log(`BG2 tiles: ${bg2ChrSize / bytesPerTile} tiles (${bpp}bpp)`);
  printSize("BG2_MAP_SIZE", bg2MapSize);

  console.log("");

  for (const r of ranges) {
    console.log(`${r.name} VRAM: ${toHex(r.start)}..${toHex(r.end - 1)} (len ${toHex(r.end - r.start)})`);
  }

  // Warnings de “gap pequeno”
  const gap = VRAM_BG2_TILES - BG1_MAP_END;
  if ((bg2ChrSize != null || bg2MapSize != null) && gap > 0 && gap < 0x200) {
    console.log(`WARN: gap pequeno entre BG1_MAP_END (${toHex(BG1_MAP_END)}) e BG2_TILES (${toHex(VRAM_BG2_TILES)}): ${toHex(gap)}`);
  }

  console.log("");
}

main();