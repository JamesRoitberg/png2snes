# png2snes

## Português

### Descrição curta

**png2snes** converte **PNG indexado** em assets prontos para o **Super Nintendo (SNES)**:

- **.chr** (tiles)
- **.map** (tilemap)
- **.pal** (paleta em formato SNES)
- **.gpl** (paleta para GIMP)
- **\*-tileset.png** (preview/inspeção rápida)

O foco do projeto é **preservar os índices do PNG** (workflow com imagens indexadas) para que o resultado seja previsível no SNES, inclusive quando você trabalha com **múltiplas subpaletas** em BG 4bpp.

---

### Estrutura esperada do repositório

- `bin/png2snes.js` (CLI)
- `src/*` (core)
- `combine-indexed.js` (script auxiliar para combinar pgns indexados separados por paletas para uma imagem final)

---

## Fluxos suportados

### A) BG 4bpp (Mode 1 / BG1-BG2) com múltiplas subpaletas

**Objetivo:** montar um cenário maior usando **várias partes**, onde cada parte tem **16 cores** (1 subpaleta), e no final gerar **um PNG “final”** que **mantém os índices** de cada parte.

#### Passo 1 — Criar partes no GIMP (indexado)
- Crie cada parte do cenário como **PNG indexado (16 cores)**.
- Grid 8x8 (tiles do SNES).
- Cada parte **usa uma subpaleta** (16 cores).

Exemplo de nomes:
- `arena-part1.png`
- `arena-part2.png`
- `arena-part3.png`

#### Passo 2 — Unir as partes preservando índices (combine-indexed)
O GIMP pode **reordenar/remapear índices** quando você “achata” camadas e exporta, e isso quebra a consistência (o pixel continua “igual”, mas o **índice** muda).

Use o script `combine-indexed.js` (ou equivalente no toolchain) para gerar:

- `arena-final.png` (indexado, preservando os índices das partes)

#### Passo 3 — Rodar png2snes (BG, 4bpp, Mode 1)
Exemplo realista:

```bash
npx png2snes arena-final.png \
  --tipo bg \
  --bpp 4 \
  --modo 1 \
  --bg-pal-base 2 \
  --tile-size 8x8 \
  --dedupe h \
  --out-dir out/arena \
  --no-interactive
Como o BG 4bpp funciona aqui (pontos importantes)
CHR (tiles): os pixels do tile usam índice local 0..15 (4bpp).

MAP (tilemap): cada tile carrega também o número da subpaleta (0..7 para BG), e o --bg-pal-base aplica um offset nesse número.

Por que existe --bg-pal-base?
Para você não “bater” em subpaletas reservadas (ex.: HUD em BG3). Ex.: usar --bg-pal-base 2 desloca seu BG para subpaletas 2.. em vez de 0...

Warning: “tile mistura subpaletas”
O png2snes em BG 4bpp pode emitir um aviso do tipo:

tile mistura subpaletas

Isso significa que dentro do mesmo tile 8x8, existem pixels que vêm de subpaletas diferentes (ex.: parte do tile usa índices da subpaleta 1 e parte usa da subpaleta 2). No SNES, um tile 4bpp só pode apontar para uma subpaleta no MAP — então o resultado no hardware tende a ficar errado.

Por que esse warning agora é confiável?
Porque a detecção passou a usar o índice real do PNG (não “igualdade de cor”/pipeta/Select by Color). Ou seja: se ele acusar mistura, é porque os índices realmente vêm de subpaletas diferentes.

B) Sprite 4bpp
Objetivo: um PNG indexado com 16 cores (1 paleta) para gerar tiles e paleta de OBJ.

Entrada: 1 PNG (16 cores indexadas)

Saída: .chr + .pal

Não gera .map (sprites não usam tilemap BG)

Exemplo:

npx png2snes scorpion.png \
  --tipo sprite \
  --bpp 4 \
  --tile-size 8x8 \
  --dedupe none \
  --out-dir out/scorpion \
  --no-interactive
Notas:

Para sprite, o tool força/assume --dedupe none (dedupe é focado em BG/tilemap).

Não existe prompt de subpaleta (subpaleta é escolha de CGRAM/OBJ no seu código SNES, na hora de escrever em CGRAM).

C) BG 8bpp (Mode 3)
Objetivo: BG 8bpp (até 256 cores) para Mode 3.

Entrada: PNG indexado até 256 cores

Saída: .chr + .map + .pal

O MAP não usa bits de paleta por tile (em 8bpp não existe “subpaleta por tile” como no 4bpp).

Exemplo:

npx png2snes title.png \
  --tipo bg \
  --bpp 8 \
  --modo 3 \
  --tile-size 8x8 \
  --dedupe simple \
  --out-dir out/title \
  --no-interactive
Flags / CLI
Principais flags
--tipo bg|sprite
Define o fluxo (BG gera map; sprite não).

--bpp 2|4|8
Bits por pixel do tile.

--modo 1|3|7
Modo alvo (explicação prática do toolchain):

4bpp BG → normalmente Mode 1

8bpp BG → aqui é Mode 3

Mode 7 reservado/para usos específicos (depende do seu pipeline/uso)

--bg-pal-base 0..7 (somente BG 4bpp)
Offset de subpaleta aplicado ao MAP. Útil para evitar sobrescrever HUD.

--tile-size 8x8|16x16
Define como o PNG é fatiado para extração (tiles 8x8 ou blocos 16x16).
(Para SNES o tile base é 8x8; 16x16 é útil em pipelines que geram metatiles.)

--dedupe none|simple|h|v|full
Deduplicação de tiles (normalmente útil em BG):

none: sem dedupe

simple: remove tiles idênticos (sem flips)

h: dedupe considerando flip horizontal

v: dedupe considerando flip vertical

full: dedupe considerando ambos flips
Limitação atual: dedupe é voltado a BG/tilemap; sprite força none.

--no-interactive
Roda sem prompts (bom para scripts/CI). Use junto com as flags necessárias.

--out-dir <pasta>
Pasta de saída.

Exemplos (copiar e colar)
BG 4bpp com subpaletas e offset (evitar HUD):

npx png2snes arena-final.png \
  --tipo bg --bpp 4 --modo 1 --bg-pal-base 2 \
  --tile-size 8x8 --dedupe h \
  --out-dir out/arena --no-interactive
Sprite 4bpp (sem map):

npx png2snes scorpion.png \
  --tipo sprite --bpp 4 \
  --tile-size 8x8 --dedupe none \
  --out-dir out/scorpion --no-interactive
BG 8bpp Mode 3 (sem paleta por tile no map):

npx png2snes title.png \
  --tipo bg --bpp 8 --modo 3 \
  --tile-size 8x8 --dedupe simple \
  --out-dir out/title --no-interactive
Outputs
.chr (tiles)
4bpp: 32 bytes por tile 8x8

8bpp: 64 bytes por tile 8x8

Formato planar SNES (pronto para DMA em VRAM).

.map (tilemap)
Palavras 16-bit little-endian (SNES BG map entry).

BG 4bpp (Mode 1/2 etc.) usa:

bits 0–9: índice do tile (0–1023)

bits 10–12: palette/subpaleta (0–7 para BG)

bit 13: priority

bit 14: hflip

bit 15: vflip

BG 8bpp (Mode 3):

não usa “bits de paleta por tile” (não existe subpaleta por tile como no 4bpp)

.pal (paleta SNES)
Paleta compacta: inclui apenas as cores usadas.

Ordem sagrada: segue a ordem/índices do PNG indexado.

Cada cor é armazenada como SNES BGR555 em 2 bytes (little-endian).

.gpl
Export para inspeção/edição no GIMP (útil para validar ordem/índices).

*-tileset.png (preview)
Imagem gerada para inspecionar rapidamente o tileset/tilemap e identificar erros de índice/dedupe.

Observações SNES importantes
Por que bg-pal-base=2 costuma ser útil
Em muitos jogos, BG3 é usado para HUD e ocupa subpaletas baixas (ex.: 0–1).
Ao colocar seu cenário em base 2, você reduz o risco de sobrescrever paletas que o HUD espera.

Planejamento de DMA para CGRAM (BG 4bpp)
Cada subpaleta BG tem 16 cores.

Para escrever sua paleta em CGRAM com offset:

comece em palBase * 16 (em “cor”, não em byte)

exemplo: bg-pal-base=2 → começar na cor 32 (2 * 16)

Limites
BG 4bpp: até 8 subpaletas (0..7) → 128 cores no total (8 * 16)

Mode 3 (8bpp): até 256 cores

Requisitos e instalação
Node.js >= 18

Instalar deps:

npm i
Rodar via repo:

node bin/png2snes.js <arquivo.png> [flags...]
Rodar via npx (quando publicado/instalável no seu ambiente):

npx png2snes <arquivo.png> [flags...]
Toolchain auxiliar (opcional)
combine-indexed.js
Use para combinar PNGs indexados mantendo índices (evita remap do GIMP ao exportar).

## English
Short description
png2snes converts indexed PNG assets into SNES-ready files:

.chr (tiles)

.map (tilemap)

.pal (SNES palette)

.gpl (GIMP palette export)

*-tileset.png (quick preview)

The main focus is preserving PNG indices (indexed workflow) so results stay deterministic on SNES hardware—especially for multi-subpalette BG 4bpp pipelines.

Expected repository layout
bin/png2snes.js (CLI)

src/* (core)

combine-indexed.js (helper script; may live in combine-pngs/)

Supported workflows
A) BG 4bpp (Mode 1 / BG1-BG2) with multiple subpalettes
Goal: build a larger background from multiple 16-color indexed parts, then produce one final indexed PNG that preserves indices.

Step 1 — Create parts in GIMP (indexed)
Each part is an indexed PNG (16 colors).

8x8 grid (SNES tile size).

Each part uses one subpalette (16 colors).

Step 2 — Combine while preserving indices (combine-indexed)
GIMP may reorder/remap indices when flattening/exporting, which breaks SNES pipelines (pixels look the same but their indices change).

Use combine-indexed.js (or equivalent) to generate:

*-final.png (indexed, indices preserved across parts)

Step 3 — Run png2snes (BG, 4bpp, Mode 1)
Example:

npx png2snes arena-final.png \
  --tipo bg \
  --bpp 4 \
  --modo 1 \
  --bg-pal-base 2 \
  --tile-size 8x8 \
  --dedupe h \
  --out-dir out/arena \
  --no-interactive
How BG 4bpp works here
CHR (tiles): pixels use local indices 0..15 (4bpp).

MAP (tilemap): each tile stores a subpalette id (0..7 for BG), and --bg-pal-base applies an offset to that id.

Why --bg-pal-base?
To avoid overwriting reserved subpalettes (e.g., HUD). Using --bg-pal-base 2 shifts your BG usage to subpalettes 2.. instead of 0...

Warning: “tile mixes subpalettes”
The tool can warn that a single 8x8 tile uses indices from multiple subpalettes. On SNES, a 4bpp BG tile can only reference one subpalette in the MAP entry—so rendering will be wrong on hardware.

Why the warning is now reliable:
Detection uses the actual PNG indices (not “same RGB color” heuristics).

B) Sprite 4bpp
Goal: one 16-color indexed PNG to generate OBJ tiles and palette.

Input: one PNG (16 colors indexed)

Output: .chr + .pal

No .map output (sprites do not use BG tilemaps)

Example:

npx png2snes scorpion.png \
  --tipo sprite \
  --bpp 4 \
  --tile-size 8x8 \
  --dedupe none \
  --out-dir out/scorpion \
  --no-interactive
Notes:

Sprite flow forces/assumes --dedupe none.

Subpalette placement is handled later when you DMA your OBJ palette into CGRAM.

C) BG 8bpp (Mode 3)
Goal: Mode 3 background using up to 256 indexed colors.

Input: indexed PNG up to 256 colors

Output: .chr + .map + .pal

MAP entries do not contain per-tile palette bits (no subpalette per tile in 8bpp Mode 3).

Example:

npx png2snes title.png \
  --tipo bg \
  --bpp 8 \
  --modo 3 \
  --tile-size 8x8 \
  --dedupe simple \
  --out-dir out/title \
  --no-interactive
CLI flags
--tipo bg|sprite

--bpp 2|4|8

--modo 1|3|7 (8bpp is Mode 3 in this toolchain)

--bg-pal-base 0..7 (BG 4bpp only)

--tile-size 8x8|16x16

--dedupe none|simple|h|v|full (sprites force none)

--no-interactive

--out-dir <dir>

Outputs
.chr
4bpp: 32 bytes per 8x8 tile

8bpp: 64 bytes per 8x8 tile

.map
16-bit little-endian words.

4bpp BG map entry:

bits 0–9 tile id

bits 10–12 palette/subpalette

bit 13 priority

bit 14 hflip

bit 15 vflip

8bpp Mode 3: no per-tile palette bits.

.pal
Compact (only used colors)

Index order matches the PNG indexed order (do not reorder).

Stored as SNES BGR555, 2 bytes per color (little-endian).

.gpl
GIMP palette export for inspection/editing.

*-tileset.png
Quick visual preview to validate indices/dedupe/tile layout.

SNES notes
bg-pal-base=2 is commonly used to avoid overwriting HUD subpalettes (often on BG3).

CGRAM planning (BG 4bpp):

each BG subpalette = 16 colors

write starting at palBase * 16 (color index)

Limits:

BG 4bpp: 8 subpalettes (128 colors total)

Mode 3 (8bpp): 256 colors

Requirements & install
Node.js >= 18

Install:

npm i
Run from repo:

node bin/png2snes.js <input.png> [flags...]
Run via npx:

npx png2snes <input.png> [flags...]
Optional helper scripts
combine-indexed.js: combine indexed PNGs while preserving indices (recommended for multi-part BG workflows, works great if you split your bgs by palette color, and use it to merge into a final bg).
