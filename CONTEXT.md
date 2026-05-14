# CONTEXT.md - png2snes / konvert2snes

Glossario vivo e curto da linguagem do projeto. Este arquivo nao define fluxo novo, nao substitui README/specs e nao cria regra de implementacao.

## Identidade

- `konvert2snes`: nome atual do CLI principal no README/package; em contextos antigos pode aparecer como rename planejado ou em transicao.
- `png2snes`: nome historico do projeto e/ou alias legado mantido por compatibilidade.
- pipeline: conjunto de tools para preparar PNGs indexados e gerar assets SNES.

## Imagem e paleta

- PNG indexado: PNG com pixels apontando para indices de uma paleta, em vez de guardar RGB direto por pixel.
- PLTE: paleta interna do PNG indexado.
- indices reais do PNG: valores indexados gravados no PNG. Quando disponiveis, devem ser preservados como fonte principal de cor/subpaleta, evitando recalcular cor por RGBA sem necessidade.
- palette / paleta: lista de cores usada pelo asset. No output SNES vira `.pal`.
- subpalette / subpaleta: grupo de cores selecionavel pelo tilemap. Em BG 4bpp sao grupos de 16 cores; em BG 2bpp sao grupos de 4 cores.
- `--bg-pal-base`: subpaleta SNES inicial usada por BG 2bpp/4bpp para deslocar os grupos do PNG.

## Tiles, bpp e tilemap

- tile 8x8: bloco base de 8 por 8 pixels usado pelo SNES e pelas tools do projeto.
- tamanho de tile: em CHR SNES, um tile 8x8 ocupa 16 bytes em 2bpp, 32 bytes em 4bpp e 64 bytes em 8bpp.
- 2bpp: formato com 2 bits por pixel. Em BG, usa pixels locais `0..3` e subpaletas de 4 cores.
- 4bpp: formato com 4 bits por pixel. Em BG, usa pixels locais `0..15` e subpaletas de 16 cores.
- 8bpp: formato com 8 bits por pixel; no tilemap, os bits de selecao de paleta nao sao usados do mesmo jeito.
- tilemap: mapa que diz qual tile aparece em cada posicao do BG e com quais atributos.
- flip: atributo do tilemap para espelhar tile horizontalmente e/ou verticalmente.
- priority: bit do tilemap que indica prioridade de desenho do tile no BG.

## Conversao e reducao

- dedupe: deduplicacao de tiles repetidos para reduzir CHR.
- `dedupe simple`: junta tiles identicos.
- `dedupe h`: junta tiles iguais considerando flip horizontal.
- `dedupe v`: junta tiles iguais considerando flip vertical.
- `dedupe full`: junta tiles considerando flips horizontal e vertical.
- Sprite: fluxo de objetos/sprites; hoje força `dedupe none`.
- BG: fluxo de background/cenario; gera `.chr`, `.map`, `.pal`, `.gpl` e preview de tileset.

## Tools auxiliares

- combine: junta partes `*-partN.png` em um `*-final.png`, preservando indices/paletas.
- split-png / `png-split`: divide uma sheet PNG indexada em frames PNG separados.
- sequence: converte uma sequencia de frames, normalmente `*-01.png`, `*-02.png`, etc.
- bg-priority: aplica priority em um `.map` usando uma mascara PNG; pode gerar `*-pri.map`.
- color2snes: converte uma cor hexadecimal para valor de cor SNES.
- analyze-map: inspeciona um arquivo `.map`.
- vramLayoutHelper: tool que analisa outputs de BG e sugere constantes de VRAM/PPU para carregar BG1/BG2 com menor risco de colisao.

## Nomes comuns no projeto

- `to-convert/`: pasta usual para PNGs de entrada e trabalho.
- `converted/`: pasta usual para outputs gerados.
- `*-partN.png`: partes de um BG/cenario antes do combine.
- `*-final.png`: PNG final depois do combine.
- `*-anim-01.png`: primeiro frame de uma sequencia.
- `*-prio.png` ou `*-priority.png`: mascara PNG usada para prioridade.
- `*-pri.map`: MAP final com priority aplicada.

## Pontos que costumam confundir

- `.map` e layout de VRAM nao sao a mesma coisa. `.map` e tilemap; layout de VRAM e sugestao de enderecos/organizacao para carregar BG1/BG2.
- `.pal` e a paleta exportada; subpalette e o grupo selecionado por tile no tilemap.
- `png2snes` ainda aparece por compatibilidade, mas a identidade atual do CLI e `konvert2snes`.
- BG3 2bpp pode usar varias subpaletas de 4 cores; isso nao significa que cada tile 8x8 possa misturar qualquer grupo de cores.
