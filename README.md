# png2snes

## Português

### Descrição

**png2snes** converte **PNG indexado** em assets prontos para o **Super Nintendo (SNES)**:

- **.chr** — tiles (formato planar SNES)
- **.map** — tilemap *(apenas BG)*
- **.pal** — paleta em formato SNES (BGR555)
- **.gpl** — paleta para GIMP
- **\*-tileset.png** — preview para inspeção rápida *(BG)*

O foco do projeto é **preservar os índices do PNG** (workflow com imagens indexadas), para que o resultado seja previsível no SNES — inclusive quando você usa **múltiplas subpaletas** em BG 4bpp.

---

### Estrutura do repositório

- `bin/png2snes.js` — CLI
- `src/*` — core
- `tools/*` — scripts auxiliares (combine, split, bgPriority etc.)

---

## Fluxos suportados

### A) BG 4bpp (Mode 1 / BG1–BG2) com múltiplas subpaletas

**Objetivo:** montar um cenário maior usando várias partes (cada parte com **16 cores**) e gerar um PNG final indexado preservando índices para o SNES.

#### Passo 1 — criar as partes (GIMP)
- Exporte cada parte como **PNG indexado** (até 16 cores).
- Use grid **8×8** (tile do SNES).
- Cada parte deve respeitar uma subpaleta (16 cores).

Exemplo:
- `waterfront-bg1-part1.png`
- `waterfront-bg1-part2.png`
- ...

#### Passo 2 — combinar as partes preservando índices (combine-indexed)
O GIMP pode remapear índices ao achatar/exportar camadas. Use o **combine-indexed** para manter os índices.

Modo curto (recomendado):

```bash
npm run png:combine -- --dir to-convert --stem waterfront-bg1

Convenção:

Entradas: to-convert/<stem>-partN.png

Saída: to-convert/<stem>-final.png

Passo 3 — converter para SNES (png2snes)

Exemplo:

npx png2snes to-convert/waterfront-bg1-final.png \
  --tipo bg \
  --bpp 4 \
  --modo 1 \
  --bg-pal-base 2 \
  --tile-size 8x8 \
  --dedupe h \
  --out-dir to-convert \
  --no-interactive

Como o BG 4bpp funciona aqui

CHR (.chr): os pixels do tile usam índice local 0..15 (4bpp)

MAP (.map): cada tile carrega também o número da subpaleta (0..7)
--bg-pal-base aplica um offset nesse número.

Por que existe --bg-pal-base?
Para evitar conflito com subpaletas reservadas (ex.: HUD). Ex.: --bg-pal-base 2 desloca o cenário para subpaletas 2.. em vez de 0..

Warning: “tile mistura subpaletas”

O png2snes pode avisar que um tile 8×8 mistura índices de subpaletas diferentes. No SNES, um tile 4bpp só pode usar uma subpaleta no MAP, então o resultado tende a ficar errado no hardware.

A detecção é confiável porque usa o índice real do PNG (não heurística por cor).

B) Sprite 4bpp

Entrada: PNG indexado com 16 cores
Saída: .chr + .pal
Não gera .map (sprites não usam tilemap BG)

Exemplo:

npx png2snes scorpion.png \
  --tipo sprite \
  --bpp 4 \
  --tile-size 8x8 \
  --dedupe none \
  --out-dir to-convert \
  --no-interactive

Notas:

Para sprite, o tool força --dedupe none.

Subpaleta/offset de OBJ é definida no seu código SNES ao escrever CGRAM.

C) BG 8bpp (Mode 3)

Entrada: PNG indexado até 256 cores
Saída: .chr + .map + .pal

No 8bpp, o MAP não usa bits de subpaleta por tile.

Exemplo:

npx png2snes title.png \
  --tipo bg \
  --bpp 8 \
  --modo 3 \
  --tile-size 8x8 \
  --dedupe simple \
  --out-dir to-convert \
  --no-interactive
VRAM Layout Helper (BG)

Quando --tipo bg, o png2snes imprime automaticamente um bloco pronto para copiar/colar no assembly:

VRAM_BG1_TILES, VRAM_BG1_MAP, VRAM_BG2_TILES, VRAM_BG2_MAP

REG_BG12NBA ($210B), REG_BG1SC ($2107), REG_BG2SC ($2108)

Desativar

Por padrão imprime. Para desativar:

npx png2snes arena-final.png --tipo bg --no-print-vram-layout
Regras usadas (resumo)

VRAM_BG1_TILES fixo: $0000

VRAM_BG1_MAP default: $6800 (64×64 = $2000)

VRAM_BG2_MAP fixo: $F000 (64×32 = $1000)

VRAM_BG2_TILES = alignUp(BG1_MAP_END, $2000)

Auto-ajuste do BG1_MAP (quando CHR invade o map)

Se o BG1_CHR_SIZE crescer a ponto de encostar/invadir o map default, o helper move automaticamente:

VRAM_BG1_MAP = alignUp(endChr, $0800) (unidade do BGxSC)

CLI / Flags principais

--tipo bg|sprite

--bpp 2|4|8

--modo 1|3|7

--bg-pal-base 0..7 (somente BG 4bpp)

--tile-size 8x8|16x16

--dedupe none|simple|h|v|full (sprite força none)

--no-interactive

--out-dir <pasta> (saída vai para <out-dir>/converted)

--no-print-vram-layout (BG)

Outputs (formatos)
.chr (tiles)

4bpp: 32 bytes por tile 8×8

8bpp: 64 bytes por tile 8×8
Formato planar SNES (pronto para DMA).

.map (tilemap)

Palavras 16-bit little-endian (SNES BG map entry).

BG 4bpp:

bits 0–9: tile id (0–1023)

bits 10–12: palette/subpaleta (0–7)

bit 13: priority

bit 14: hflip

bit 15: vflip

BG 8bpp (Mode 3):

não usa bits de subpaleta por tile

.pal

paleta compacta (somente cores usadas)

ordem segue a ordem/índices do PNG indexado

formato SNES BGR555 (2 bytes little-endian por cor)

.gpl

Paleta para inspeção no GIMP.

*-tileset.png

Preview rápido para inspecionar tiles/tilemap.

Tools (scripts auxiliares)

Estas ferramentas são opcionais e fazem parte do workflow de backgrounds.

bgPriority (patch de prioridade no tilemap)

Aplica o bit 13 (priority) em um .map SNES usando uma máscara PNG.

Uso curto:

npm run bg:priority -- --dir to-convert/converted --stem pit-bg2

Convenção:

PNG: to-convert/converted/<stem>.png

MAP: to-convert/converted/<stem>.map

MASK: to-convert/converted/<stem>-priority.png

OUT: to-convert/converted/<stem>-pri.map

combine-indexed

Junta partes PNG indexadas (até 16 cores cada) preservando índices/paletas e gerando um *-final.png (indexado 8bpp até 256 cores).

Uso curto:

npm run png:combine -- --dir to-convert --stem waterfront-bg1

Convenção:

Partes: to-convert/<stem>-partN.png

Saída: to-convert/<stem>-final.png

splitIndexedByEmptyTiles

Split de uma folha PNG indexada em vários PNGs indexados, separando por “ilhas” de tiles 8×8 não-vazios (vazio = todos os pixels == sepIndex).

Uso curto:

npm run png:split -- --dir to-convert --stem river-animation --sepIndex 0

Mais detalhes em tools/README.md.

Observações (Linux)

Alguns desktops podem identificar .chr como áudio (heurística por conteúdo). O arquivo continua correto (binário).

Requisitos e instalação

Node.js >= 18

npm i

Rodar via repo:

node bin/png2snes.js <arquivo.png> [flags...]

Rodar via npx:

npx png2snes <arquivo.png> [flags...]
English
Summary

png2snes converts indexed PNG assets into SNES-ready files:

.chr (tiles)

.map (tilemap, BG only)

.pal (SNES palette, BGR555)

.gpl (GIMP palette)

*-tileset.png (quick preview, BG)

The main focus is preserving PNG indices so results remain deterministic on SNES hardware, including multi-subpalette BG 4bpp workflows.

Requirements

Node.js >= 18

Install / Run
npm i
node bin/png2snes.js <input.png> [flags...]
npx png2snes <input.png> [flags...]

For tools usage, see tools/README.md.