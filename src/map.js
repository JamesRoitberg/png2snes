import { Buffer } from "node:buffer";

/**
 * Constrói tilemap SNES válido (BG).
 *
 * Layout de bits (word 16-bit):
 * bits  0–9  : tile index (0–1023)
 * bits 10–12 : palette (0–7) (3 bits) [IGNORADO em 8bpp]
 * bit     13 : priority
 * bit     14 : hflip
 * bit     15 : vflip
 *
 * Correção (BUG: paleta fixa):
 * - Em 2bpp/4bpp, a paleta final do tilemap deve ser calculada por tile:
 *   palFinal = (palBase + tileSubpal) & 7
 *   word = (tileIndex&0x3FF) | ((palFinal&7)<<10) | (prio<<13) | (hflip<<14) | (vflip<<15)
 *
 * - tileSubpal (0..7) vem do loader (ex.: idx>>4 do tile), ignorando pixels local==0.
 *
 * Observações:
 * - Não existe "tilePage" nesse formato; `tilePage` recebido é ignorado (compat).
 * - Para 8bpp (Mode 3), não gravar bits 10–12 (ficam 0).
 *
 * Layout do .map (PPU):
 * - 32×32: linear == snes
 * - >32×32: PPU espera "telas" 32×32 concatenadas (esq→dir, depois próxima linha de telas)
 */
export function buildTilemap({
  width,
  height,
  tileW,
  tileH,
  tileRefs,
  tipo, // compat (não usado aqui)
  bpp = 4,
  palBase = 0, // base de paleta (ex.: 2 para virar 2..5)
  // "auto" (default): usa "snes" quando tilesX>32 ou tilesY>32; senão "linear"
  // "snes": reordena para layout PPU (telas 32×32)
  // "linear": row-major (debug/compat)
  mapLayout = "auto",
}) {
  // ===== defesa: falha alto se palBase vier ausente/NaN =====
  if (bpp !== 8) {
    const palBaseN = Number(palBase);
    if (!Number.isInteger(palBaseN) || palBaseN < 0 || palBaseN > 7) {
      throw new Error(
        `palBase inválido/ausente no map.js: ${palBase} (esperado 0..7)`
      );
    }
    palBase = palBaseN;
  }

  const tilesX = width / tileW;
  const tilesY = height / tileH;

  // defesa: tiles precisam ser inteiros
  if (!Number.isInteger(tilesX) || !Number.isInteger(tilesY)) {
    throw new Error(
      `buildTilemap: width/height não divisíveis por tileW/tileH (tilesX=${tilesX}, tilesY=${tilesY})`
    );
  }

  const words = new Uint16Array(tilesX * tilesY);

  for (const ref of tileRefs) {
    const {
      tileIndex,
      hflip = false,
      vflip = false,

      // - tileSubpal/subpal: subpaleta do tile (0..7) vinda do loader
      // - palette: compat (se ainda não passou tileSubpal)
      tileSubpal,
      subpal,
      palette = 0,

      priority = 0,
      tilePage = 0, // ignorado (compat)
      mapX,
      mapY,
    } = ref;

    // ========= validações SNES =========
    if (tileIndex > 0x3ff) {
      throw new Error(`tileIndex ${tileIndex} excede 1023 (limite SNES)`);
    }

    if (mapX < 0 || mapX >= tilesX || mapY < 0 || mapY >= tilesY) {
      throw new Error(`mapX/mapY fora do mapa: ${mapX},${mapY}`);
    }

    let word = 0;

    // bits 0–9 : tile index
    word |= tileIndex & 0x03ff;

    // bits 10–12 : palette (somente se NÃO for 8bpp)
    if (bpp !== 8) {
      const tileSub = (tileSubpal ?? subpal ?? palette ?? 0) | 0;

      if (tileSub < 0 || tileSub > 7) {
        throw new Error(
          `tileSubpal ${tileSub} inválida para tilemap SNES (0–7)`
        );
      }

      const palFinal = (palBase + tileSub) & 7;
      word |= (palFinal & 7) << 10;
    } else {
      // Em 8bpp, bits 10–12 devem ser 0
      void tilePage;
    }

    // bit 13 : priority
    if (priority) word |= 1 << 13;

    // bit 14 : h flip
    if (hflip) word |= 1 << 14;

    // bit 15 : v flip
    if (vflip) word |= 1 << 15;

    const index = mapY * tilesX + mapX;
    words[index] = word;
  }

  // ===== Layout de escrita do .map =====
  const layout =
    mapLayout === "auto"
      ? tilesX > 32 || tilesY > 32
        ? "snes"
        : "linear"
      : mapLayout;

  if (layout !== "linear" && layout !== "snes") {
    throw new Error(`mapLayout inválido: ${layout} (use "auto"|"snes"|"linear")`);
  }

  // Para layout "snes", o PPU espera blocos 32×32 (telas) concatenados.
  // Requer tilesX/tilesY múltiplos de 32 (ex.: 32 ou 64).
  if (layout === "snes") {
    if (tilesX % 32 !== 0 || tilesY % 32 !== 0) {
      throw new Error(
        `mapLayout="snes" exige tilesX/tilesY múltiplos de 32 (tilesX=${tilesX}, tilesY=${tilesY})`
      );
    }
  }

  // Escrita little-endian (SNES)
  const buf = Buffer.alloc(words.length * 2);

  if (layout === "linear" || (tilesX <= 32 && tilesY <= 32)) {
    // 32×32: linear == snes
    for (let i = 0; i < words.length; i++) {
      buf.writeUInt16LE(words[i], i * 2);
    }
    return buf;
  }

  // layout "snes": reordena para telas 32×32 concatenadas
  const screensPerRow = tilesX >> 5; // tilesX/32

  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      const src = y * tilesX + x;

      const screenX = x >> 5;
      const screenY = y >> 5;
      const screen = screenX + screenY * screensPerRow;

      const sx = x & 31;
      const sy = y & 31;

      const dst = screen * 1024 + sy * 32 + sx;
      buf.writeUInt16LE(words[src], dst * 2);
    }
  }

  return buf;
}
