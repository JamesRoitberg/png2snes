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

function buildRanges(layout, sizes) {
  const ranges = [];

  if (sizes.bg1ChrSize != null) {
    ranges.push({
      name: "BG1_TILES",
      start: layout.VRAM_BG1_TILES,
      end: layout.VRAM_BG1_TILES + sizes.bg1ChrSize,
    });
  }

  if (sizes.bg1MapSize != null) {
    ranges.push({
      name: "BG1_MAP",
      start: layout.VRAM_BG1_MAP,
      end: layout.VRAM_BG1_MAP + sizes.BG1_MAP_SIZE_EXPECTED,
    });
  }

  if (sizes.bg2ChrSize != null) {
    ranges.push({
      name: "BG2_TILES",
      start: layout.VRAM_BG2_TILES,
      end: layout.VRAM_BG2_TILES + sizes.bg2ChrSize,
    });
  }

  if (sizes.bg2MapSize != null) {
    ranges.push({
      name: "BG2_MAP",
      start: layout.VRAM_BG2_MAP,
      end: layout.VRAM_BG2_MAP + sizes.BG2_MAP_SIZE_EXPECTED,
    });
  }

  return ranges;
}

function validateRanges(ranges) {
  for (const r of ranges) {
    if (r.start < 0 || r.end > 0x10000) {
      return {
        ok: false,
        message: `${r.name} fora do range de VRAM 16-bit: ${toHex(r.start)}..${toHex(r.end)}`,
      };
    }
  }

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (rangesIntersect(a.start, a.end, b.start, b.end)) {
        return {
          ok: false,
          message:
            `Overlap VRAM entre ${a.name} (${toHex(a.start)}..${toHex(a.end - 1)}) ` +
            `e ${b.name} (${toHex(b.start)}..${toHex(b.end - 1)})`,
        };
      }
    }
  }

  return { ok: true };
}

function validateLayout(layout, sizes) {
  const ranges = buildRanges(layout, sizes);
  const rangeCheck = validateRanges(ranges);

  if (!rangeCheck.ok) {
    return { ok: false, message: rangeCheck.message, ranges };
  }

  return { ok: true, ranges };
}

function enumerateAlignedStarts(size, align) {
  const starts = [];

  for (let start = 0; start + size <= 0x10000; start += align) {
    starts.push(start);
  }

  return starts;
}

function compareRanks(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

function buildFallbackRank(layout, standardLayout, sizes) {
  const fields = [
    ["VRAM_BG1_TILES", sizes.bg1ChrSize != null],
    ["VRAM_BG1_MAP", sizes.bg1MapSize != null],
    ["VRAM_BG2_MAP", sizes.bg2MapSize != null],
    ["VRAM_BG2_TILES", sizes.bg2ChrSize != null],
  ];

  const changed = [];
  const deltas = [];

  for (const [field, enabled] of fields) {
    if (!enabled) {
      changed.push(0);
      deltas.push(0);
      continue;
    }

    const delta = Math.abs(layout[field] - standardLayout[field]);
    changed.push(delta === 0 ? 0 : 1);
    deltas.push(delta);
  }

  const maxEnd = Math.max(
    sizes.bg1ChrSize != null ? layout.VRAM_BG1_TILES + sizes.bg1ChrSize : 0,
    sizes.bg1MapSize != null ? layout.VRAM_BG1_MAP + sizes.BG1_MAP_SIZE_EXPECTED : 0,
    sizes.bg2ChrSize != null ? layout.VRAM_BG2_TILES + sizes.bg2ChrSize : 0,
    sizes.bg2MapSize != null ? layout.VRAM_BG2_MAP + sizes.BG2_MAP_SIZE_EXPECTED : 0
  );

  return [...changed, ...deltas, maxEnd];
}

function findFallbackLayout({ sizes, standardLayout, userForcedBg1Map, userForcedBg2Map }) {
  const bg1TileStarts =
    sizes.bg1ChrSize != null
      ? enumerateAlignedStarts(sizes.bg1ChrSize, 0x2000)
      : [standardLayout.VRAM_BG1_TILES];

  const bg2TileStarts =
    sizes.bg2ChrSize != null
      ? enumerateAlignedStarts(sizes.bg2ChrSize, 0x2000)
      : [standardLayout.VRAM_BG2_TILES];

  const bg1MapStarts =
    sizes.bg1MapSize != null
      ? userForcedBg1Map
        ? [standardLayout.VRAM_BG1_MAP]
        : enumerateAlignedStarts(sizes.BG1_MAP_SIZE_EXPECTED, 0x0800)
      : [standardLayout.VRAM_BG1_MAP];

  const bg2MapStarts =
    sizes.bg2MapSize != null
      ? userForcedBg2Map
        ? [standardLayout.VRAM_BG2_MAP]
        : enumerateAlignedStarts(sizes.BG2_MAP_SIZE_EXPECTED, 0x0800)
      : [standardLayout.VRAM_BG2_MAP];

  let best = null;
  let bestRank = null;

  for (const VRAM_BG1_TILES of bg1TileStarts) {
    for (const VRAM_BG1_MAP of bg1MapStarts) {
      for (const VRAM_BG2_TILES of bg2TileStarts) {
        for (const VRAM_BG2_MAP of bg2MapStarts) {
          const layout = {
            VRAM_BG1_TILES,
            VRAM_BG1_MAP,
            VRAM_BG2_TILES,
            VRAM_BG2_MAP,
          };

          const check = validateLayout(layout, sizes);
          if (!check.ok) continue;

          const rank = buildFallbackRank(layout, standardLayout, sizes);
          if (!best || compareRanks(rank, bestRank) < 0) {
            best = { layout, ranges: check.ranges };
            bestRank = rank;
          }
        }
      }
    }
  }

  return best;
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
  const DEFAULT_VRAM_BG1_TILES = 0x0000;

  let standardBg1Map = args["vram-bg1-map"]
  ? parseHexOrDec(args["vram-bg1-map"])
  : 0x6800;

  const standardBg2Map = args["vram-bg2-map"]
    ? parseHexOrDec(args["vram-bg2-map"])
    : 0xF000;

  if (standardBg1Map == null || Number.isNaN(standardBg1Map)) fail("vram-bg1-map inválido.");
  if (standardBg2Map == null || Number.isNaN(standardBg2Map)) fail("vram-bg2-map inválido.");

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
  const userForcedBg2Map = typeof args["vram-bg2-map"] === "string";

  // Se --auto estiver ligado e o usuário NÃO forçou um VRAM_BG1_MAP manual,
  // move o BG1_MAP pra depois do fim do CHR, alinhado em $0800 (reg BGxSC).
  if (auto && !userForcedBg1Map && bg1ChrSize != null && bg1MapSize != null) {
    const bg1TilesEnd = DEFAULT_VRAM_BG1_TILES + bg1ChrSize;   // end (exclusive)
    const minBg1Map = alignUp(bg1TilesEnd, 0x0800);

    if (minBg1Map > standardBg1Map) {
      console.log(`[vram-layout] INFO: BG1_MAP movido de ${toHex(standardBg1Map)} para ${toHex(minBg1Map)} (CHR invadiu/encostou no map).`);
      standardBg1Map = minBg1Map;
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
  const standardLayout = {
    VRAM_BG1_TILES: DEFAULT_VRAM_BG1_TILES,
    VRAM_BG1_MAP: standardBg1Map,
    VRAM_BG2_TILES: alignUp(standardBg1Map + BG1_MAP_SIZE_EXPECTED, 0x2000),
    VRAM_BG2_MAP: standardBg2Map,
  };

  const sizes = {
    bg1ChrSize,
    bg1MapSize,
    bg2ChrSize,
    bg2MapSize,
    BG1_MAP_SIZE_EXPECTED,
    BG2_MAP_SIZE_EXPECTED,
  };

  let layout = standardLayout;
  let layoutMode = "standard";
  let ranges = [];

  let standardFailureMessage = null;
  if (bg2ChrSize != null) {
    const bg2TilesEnd = standardLayout.VRAM_BG2_TILES + bg2ChrSize;
    if (bg2TilesEnd > standardLayout.VRAM_BG2_MAP) {
      standardFailureMessage =
        `BG2 tiles não cabe antes do BG2 map em ${toHex(standardLayout.VRAM_BG2_MAP)}. ` +
        `BG2_TILES=${toHex(standardLayout.VRAM_BG2_TILES)} + BG2_CHR_SIZE=${toHex(bg2ChrSize)} -> end=${toHex(bg2TilesEnd)}.`;
    }
  }

  const standardCheck = standardFailureMessage
    ? { ok: false, message: standardFailureMessage, ranges: [] }
    : validateLayout(standardLayout, sizes);
  if (standardCheck.ok) {
    ranges = standardCheck.ranges;
  } else if (auto) {
    const fallback = findFallbackLayout({
      sizes,
      standardLayout,
      userForcedBg1Map,
      userForcedBg2Map,
    });

    if (!fallback) {
      const rawTotal =
        (bg1ChrSize || 0) +
        (bg1MapSize || 0) +
        (bg2ChrSize || 0) +
        (bg2MapSize || 0);

      fail(
        `Layout padrão não coube: ${standardCheck.message} ` +
        `Também não encontrei nenhum layout alternativo válido em VRAM 16-bit ` +
        `(uso bruto: ${rawTotal} bytes, ${toHex(rawTotal)}).`
      );
    }

    layout = fallback.layout;
    ranges = fallback.ranges;
    layoutMode = "fallback";

    console.log(
      `[vram-layout] WARN: layout padrão não coube: ${standardCheck.message}`
    );
    console.log(
      "[vram-layout] INFO: usei um layout alternativo automático que cabe na VRAM 16-bit."
    );
  } else {
    fail(standardCheck.message);
  }

  const {
    VRAM_BG1_TILES,
    VRAM_BG1_MAP,
    VRAM_BG2_TILES,
    VRAM_BG2_MAP,
  } = layout;

  const BG1_MAP_END = VRAM_BG1_MAP + BG1_MAP_SIZE_EXPECTED;

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
  if (layoutMode === "fallback") {
    console.log("// Layout alternativo automático: o padrão do projeto não coube.");
  }
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
