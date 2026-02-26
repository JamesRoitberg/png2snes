// checkMap.js
const fs = require("fs");

function check(mapPath, tilesBytes, label) {
  const buf = fs.readFileSync(mapPath);
  const tileCount = Math.floor(tilesBytes / 32);

  let maxTile = 0;
  let bad = 0;

  for (let i = 0; i < buf.length; i += 2) {
    const entry = buf[i] | (buf[i + 1] << 8);
    const tile = entry & 0x03ff; // 10 bits
    if (tile > maxTile) maxTile = tile;
    if (tile >= tileCount) bad++;
  }

  console.log(label);
  console.log(" tileCount =", tileCount);
  console.log(" maxTile   =", maxTile);
  console.log(" badRefs   =", bad, "(tile >= tileCount)");
  console.log("");
}

check("assets/waterfront1.map", 25024, "BG1");
check("assets/waterfront2.map", 17536, "BG2");