#!/usr/bin/env node
// mergeBg.js - CLI independente (CommonJS)

const fs = require("fs");
const path = require("path");

async function main() {
  const inDir = process.argv[2] || ".";
  const outFlag = process.argv.indexOf("-o");
  let outDir = null;

  if (outFlag !== -1 && process.argv[outFlag + 1]) {
    outDir = process.argv[outFlag + 1];
  } else {
    outDir = path.join(inDir, "final");
  }

  // Usar import() pois mergeParts é ESModule
  const { mergeParts } = await import("./mergeParts.js");

  try {
    const result = await mergeParts(inDir, outDir);
    console.log("Merge concluído:");
    console.log(result);
  } catch (err) {
    console.error("mergeBg - erro:", err.message);
    process.exit(1);
  }
}

main();
