// src/warnings/bgMixedSubpalette.js
export function validateTiles({
  tilesData,
  palette,
  bpp,
  indices,
  width,
  height,
  tileW,
  tileH,
}) {
  // Só faz sentido para BG 2bpp/4bpp com sub-paletas
  if (![2, 4].includes(bpp)) return;

  const problematic = [];
  const localMask = bpp === 2 ? 0x03 : 0x0f;
  const subpalShift = bpp === 2 ? 2 : 4;

  const srcIndices = indices ?? tilesData?.indices ?? null;

  // Dimensões para varrer pixels no array linear de índices reais
  const imgW = width ?? tilesData?.width ?? null;
  const imgH = height ?? tilesData?.height ?? null;
  const tw = tileW ?? tilesData?.tileW ?? 8;
  const th = tileH ?? tilesData?.tileH ?? 8;

  // Caminho correto (índices reais):
  // - ignora pixels cujo indice local == 0 (cor zero pode existir em vários bancos)
  // - sub = idx >> 2 (2bpp) ou idx >> 4 (4bpp)
  if (srcIndices && imgW && imgH) {
    for (const tile of tilesData.tiles) {
      const x0 = tile.mapX * tw;
      const y0 = tile.mapY * th;

      const subsSeen = new Set();

      for (let y = 0; y < th; y++) {
        const py = y0 + y;
        if (py < 0 || py >= imgH) continue;

        for (let x = 0; x < tw; x++) {
          const px = x0 + x;
          if (px < 0 || px >= imgW) continue;

          const idx = srcIndices[py * imgW + px] | 0;

          // Regra: ignorar "cor 0" do banco para evitar falso positivo.
          if ((idx & localMask) === 0) continue;

          subsSeen.add(idx >> subpalShift);

          // Early exit: já misturou
          if (subsSeen.size > 1) break;
        }
        if (subsSeen.size > 1) break;
      }

      if (subsSeen.size > 1) {
        problematic.push({
          tileX: tile.mapX,
          tileY: tile.mapY,
          subpalettes: [...subsSeen].sort((a, b) => a - b),
        });
      }
      // subsSeen.size === 0 -> tile todo "zero" (ok)
      // subsSeen.size === 1 -> ok
    }
  } else {
    // Fallback antigo (melhor esforço): se não tiver índices reais, não dá pra validar corretamente.
    // Mantém sem warning para evitar falso positivo.
    return;
  }

  if (!problematic.length) return;

  const colorsPerSub = bpp === 2 ? 4 : 16;

  console.warn("");
  if (bpp === 4) {
    console.warn(
      "[konvert2snes][BG] Atenção: existem tiles 8×8 que usam cores de mais de uma sub-paleta."
    );
  } else {
    console.warn(
      "[konvert2snes][BG 2bpp] Atenção: existem tiles 8×8 que usam cores de mais de uma mini-sub-paleta."
    );
  }
  console.warn(`O SNES só permite uma sub-paleta de ${colorsPerSub} cores por tile de BG.`);
  console.warn("Isso pode causar cores incorretas no jogo.");
  console.warn(`Tiles afetados: ${problematic.length}`);

  problematic.slice(0, 16).forEach((t) => {
    console.warn(
      `  tile (${t.tileX},${t.tileY}) → sub-paletas [${t.subpalettes.join(", ")}]`
    );
  });

  if (problematic.length > 16) {
    console.warn("  ... (lista truncada)");
  }

  console.warn("");
}
