#!/usr/bin/env node
import fs from "node:fs";
import { analyzeMapBuffer } from "../src/mapDiagnostics.js";

const mapPath = process.argv[2];
const chrTilesArg = process.argv[3];

if (!mapPath) {
  console.error("uso: node scripts/analyze-map.js <arquivo.map> [chrTiles]");
  process.exit(1);
}

const buf = fs.readFileSync(mapPath);
const chrTiles =
  typeof chrTilesArg === "undefined" ? null : Number(chrTilesArg);

analyzeMapBuffer(buf, Number.isFinite(chrTiles) ? chrTiles : null);