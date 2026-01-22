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
  // Só faz sentido para BG 4bpp com sub-paletas
  if (bpp !== 4) return;

  const problematic = [];

  const srcIndices = indices ?? tilesData?.indices ?? null;

  // Dimensões para varrer pixels no array linear de índices reais
  const imgW = width ?? tilesData?.width ?? null;
  const imgH = height ?? tilesData?.height ?? null;
  const tw = tileW ?? tilesData?.tileW ?? 8;
  const th = tileH ?? tilesData?.tileH ?? 8;

  // Caminho correto (índices reais):
  // - ignora pixels cujo (idx & 0x0F) == 0 (cor zero pode existir em vários bancos)
  // - sub = idx >> 4
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

          // Regra: ignorar "cor 0" do banco (low nibble == 0), para evitar falso positivo
          if ((idx & 0x0f) === 0) continue;

          subsSeen.add(idx >> 4);

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

  // Mantém exatamente o formato do warning atual
  console.warn("");
  console.warn(
    "[png2snes][BG] Atenção: existem tiles 8×8 que usam cores de mais de uma sub-paleta."
  );
  console.warn("O SNES só permite uma sub-paleta por tile de BG.");
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
