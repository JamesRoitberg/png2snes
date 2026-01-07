import { Buffer } from "node:buffer";

/**
 * Constrói tilemap SNES válido (BG).
 *
 * Layout de bits (word 16-bit):
 * bits  0–9  : tile index (0–1023)
 * bit     10 : tile page (não usado aqui)
 * bits 11–12 : palette (2 bits) [IGNORADO em 8bpp]
 * bit     13 : priority
 * bit     14 : hflip
 * bit     15 : vflip
 */
export function buildTilemap({
  width,
  height,
  tileW,
  tileH,
  tileRefs,
  tipo,
  bpp = 4,
}) {
  const tilesX = width / tileW;
  const tilesY = height / tileH;

  const words = new Uint16Array(tilesX * tilesY);

  for (const ref of tileRefs) {
    const {
      tileIndex,
      hflip = false,
      vflip = false,
      palette = 0,
      priority = 0,
      tilePage = 0,
      mapX,
      mapY,
    } = ref;

    // ========= validações SNES =========
    if (tileIndex > 0x3ff) {
      throw new Error(`tileIndex ${tileIndex} excede 1023 (limite SNES)`);
    }
    if (palette > 3) {
      throw new Error(`palette ${palette} inválida para tilemap SNES (0–3)`);
    }
    if (mapX < 0 || mapX >= tilesX || mapY < 0 || mapY >= tilesY) {
      throw new Error(`mapX/mapY fora do mapa: ${mapX},${mapY}`);
    }

    let word = 0;

    // bits 0–9 : tile index
    word |= tileIndex & 0x03ff;

    // bit 10 : tile page
    if (tilePage) {
      word |= 1 << 10;
    }

    // bits 11–12 : palette (somente se NÃO for 8bpp)
    if (bpp !== 8) {
      word |= (palette & 0x03) << 11;
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
