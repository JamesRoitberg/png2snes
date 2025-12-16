// src/warnings/bgMixedSubpalette.js
export function validateTiles({
  tilesData,
  palette,
  bpp,
}) {
  // Só faz sentido para BG 4bpp com sub-paletas
  if (bpp !== 4) return;

  const colorsPerSub = palette.colorsPerSub || 16;
  const problematic = [];

  for (const tile of tilesData.tiles) {
    let baseSub = null;
    const subsSeen = new Set();

    for (const row of tile.tilePixels) {
      for (const colorIndex of row) {
        if (colorIndex === 0) continue; // transparente

        const sub = Math.floor(colorIndex / colorsPerSub);
        subsSeen.add(sub);

        if (baseSub === null) {
          baseSub = sub;
        } else if (sub !== baseSub) {
          problematic.push({
            tileX: tile.mapX,
            tileY: tile.mapY,
            subpalettes: [...subsSeen].sort((a, b) => a - b),
          });
          // tile já é inválido, não precisa continuar varrendo
          subsSeen.clear();
          break;
        }
      }
      if (subsSeen.size === 0) break;
    }
  }

  if (!problematic.length) return;

  console.warn("");
  console.warn(
    "[png2snes][BG] Atenção: existem tiles 8×8 que usam cores de mais de uma sub-paleta."
  );
  console.warn(
    "O SNES só permite uma sub-paleta por tile de BG."
  );
  console.warn(
    "Isso pode causar cores incorretas no jogo."
  );
  console.warn(`Tiles afetados: ${problematic.length}`);

  problematic.slice(0, 16).forEach(t => {
    console.warn(
      `  tile (${t.tileX},${t.tileY}) → sub-paletas [${t.subpalettes.join(", ")}]`
    );
  });

  if (problematic.length > 16) {
    console.warn("  ... (lista truncada)");
  }

  console.warn("");
}
