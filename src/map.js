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
 */
export function buildTilemap({
  width,
  height,
  tileW,
  tileH,
  tileRefs,
  tipo, // compat (não usado aqui)
  bpp = 4,
  palBase = 0, // NOVO: base de paleta (ex.: 2 para virar 2..5)
}) {

  // ===== defesa: falha alto se palBase vier ausente/NaN =====
  if (bpp !== 8) {
    const palBaseN = Number(palBase);
    if (!Number.isInteger(palBaseN) || palBaseN < 0 || palBaseN > 7) {
      throw new Error(`palBase inválido/ausente no map.js: ${palBase} (esperado 0..7)`);
    }
    palBase = palBaseN;
  }

  const tilesX = width / tileW;
  const tilesY = height / tileH;

  const words = new Uint16Array(tilesX * tilesY);

  for (const ref of tileRefs) {
    const {
      tileIndex,
      hflip = false,
      vflip = false,

      // NOVO/compat:
      // - tileSubpal/subpal: subpaleta do tile (0..7) vinda do loader
      // - palette: mantido por compatibilidade (se você ainda não passou tileSubpal)
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
        throw new Error(`tileSubpal ${tileSub} inválida para tilemap SNES (0–7)`);
      }

      const palFinal = (palBase + tileSub) & 7;
      word |= (palFinal & 7) << 10;
    } else {
      // Em 8bpp, bits 10–12 devem ser 0
      void tilePage;
    }

    // bit 13 : priority
    if (priority) {
      word |= 1 << 13;
    }

    // bit 14 : h flip
    if (hflip) {
      word |= 1 << 14;
    }

    // bit 15 : v flip
    if (vflip) {
      word |= 1 << 15;
    }

    const index = mapY * tilesX + mapX;
    words[index] = word;
  }

  // Escrita little-endian (SNES)
  const buf = Buffer.alloc(words.length * 2);
  for (let i = 0; i < words.length; i++) {
    buf.writeUInt16LE(words[i], i * 2);
  }

  return buf;
}
