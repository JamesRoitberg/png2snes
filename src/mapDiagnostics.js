import { Buffer } from "node:buffer";

/**
 * Lê um .map (buffer) e imprime métricas objetivas:
 * - maxTileIndex
 * - histograma de paletas (word>>10)&7
 * - contagem de hflip/vflip/priority
 *
 * Observação:
 * - Para 8bpp, bits 10-12 podem ser 0; ainda assim mostramos o histograma.
 */
export function analyzeMapBuffer(mapBuf, chrTiles = null) {
  if (!Buffer.isBuffer(mapBuf)) {
    throw new Error("analyzeMapBuffer: mapBuf deve ser Buffer");
  }
  if (mapBuf.length % 2 !== 0) {
    throw new Error(`analyzeMapBuffer: tamanho inválido: ${mapBuf.length} (esperado múltiplo de 2)`);
  }

  const words = mapBuf.length / 2;
  const palHist = Array.from({ length: 8 }, () => 0);
  let maxTileIndex = 0;
  let hflipCount = 0;
  let vflipCount = 0;
  let prioCount = 0;

  for (let i = 0; i < words; i++) {
    const w = mapBuf.readUInt16LE(i * 2);
    const tileIndex = w & 0x03ff;
    const pal = (w >> 10) & 7;
    const prio = (w >> 13) & 1;
    const hflip = (w >> 14) & 1;
    const vflip = (w >> 15) & 1;

    if (tileIndex > maxTileIndex) maxTileIndex = tileIndex;
    palHist[pal]++;
    if (prio) prioCount++;
    if (hflip) hflipCount++;
    if (vflip) vflipCount++;
  }

  console.log("[png2snes] MAP DIAG:");
  console.log("  words:", words);
  console.log("  maxTileIndex:", maxTileIndex);
  if (typeof chrTiles === "number") {
    console.log("  chrTiles:", chrTiles);
    if (maxTileIndex >= chrTiles) {
      console.log("  WARNING: maxTileIndex >= chrTiles (map referencia tile fora do CHR)");
    }
  }
  console.log("  palette histogram (0..7):", palHist.join(", "));
  console.log("  priority count:", prioCount);
  console.log("  hflip count:", hflipCount);
  console.log("  vflip count:", vflipCount);
}