# Tools (png2snes)

Scripts auxiliares para o workflow de assets SNES.

---

## bgPriority

Aplica o bit 13 (priority) em um `.map` SNES usando uma máscara PNG sobre o PNG final.

### Regra da máscara
Para cada tile 8×8: se existir **qualquer pixel** com `alpha > 0` no bloco 8×8 da máscara, o tile recebe `priority=1`.

### Uso (modo curto — recomendado)

```bash
npm run bg:priority -- --dir to-convert/converted --stem pit-bg2

Convenção de nomes no modo curto:

PNG: <dir>/<stem>.png

MAP: <dir>/<stem>.map

MASK: <dir>/<stem>-priority.png

OUT: <dir>/<stem>-pri.map

Uso (modo direto — paths completos)
node tools/bgPriority.js --png final.png --mask mask.png --map in.map --out out.map [--layout auto|snes|linear]
Layout

--layout auto (default): usa snes se tilesX > 32 || tilesY > 32, senão linear

snes: layout em screens 32×32 concatenadas (exige múltiplos de 32)

linear: indexação simples linha a linha

combine-indexed

Junta vários PNGs indexados (colorType 3) preservando índices/paletas, gerando um *-final.png indexado (8bpp, até 256 cores).

Resumo do comportamento:

Cada parte tem até 16 cores (índices 0..15)

Paleta final = concatenação das paletas (blocos de 16 por parte)

Índice 0 é tratado como transparência (não pinta)

Partes posteriores sobrescrevem anteriores

Pós-processo por tile 8×8 para reduzir mistura de subpaletas (normaliza o tile para um único banco)

Uso (modo curto — recomendado)
npm run png:combine -- --dir to-convert --stem waterfront-bg1

Convenção de nomes:

Entradas: <dir>/<stem>-partN.png (ex.: waterfront-bg1-part1.png, waterfront-bg1-part2.png, ...)

Saída: <dir>/<stem>-final.png

Uso (modo direto — lista de arquivos)
node tools/combine-indexed.js part1.png part2.png part3.png ...

Dica (glob):

npm run png:combine -- to-convert/waterfront-bg1-part*.png

Recomendação: use part01, part02, ... se houver chance de passar de 9 partes (para manter ordenação alfabética consistente).

splitIndexedByEmptyTiles

Divide uma folha PNG indexada em vários PNGs indexados, separando por “ilhas” de tiles 8×8 não-vazios.

Definição de tile vazio:

Um tile é vazio se todos os 64 pixels do bloco 8×8 forem iguais ao sepIndex.

Conectividade:

Flood fill usa conectividade de 8 direções (diagonais contam como conectado).

Uso (modo curto — recomendado)
npm run png:split -- --dir to-convert --stem river-animation --sepIndex 0

Defaults no modo curto:

--in vira <dir>/<stem>.png

--outdir vira <dir>/

--name vira <stem> (se não for informado)

Uso (modo direto — completo)
node tools/splitIndexedByEmptyTiles.js --in sheet.png --outdir out --name river --sepIndex 0
Opções

--tile 8 (default 8)

--sepIndex 0 (default 0)

--pad 2 (zeros no número; default 2)