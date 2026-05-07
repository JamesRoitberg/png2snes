# Spec - Conversao BG3/HUD 2bpp com subpaletas de 4 cores

## Titulo
Converter BG3/HUD 2bpp com grupos de 4 cores e subpaleta base.

## Tipo
melhoria

## Contexto
O combine BG3/HUD 2bpp gera PNGs indexados com paleta final concatenada em blocos de 4 cores:

- parte 0 -> indices `0..3`
- parte 1 -> indices `4..7`
- parte 2 -> indices `8..11`
- parte 3 -> indices `12..15`

Ao tentar converter `temple-bg3-final.png` como BG `2 bpp`, o fluxo atual falha com:

```text
[png2snes] Erro: Imagem tem 16 cores, maximo permitido e 4
```

Esse limite atual trata BG 2bpp como se tivesse apenas 4 cores totais, mas no SNES o BG 2bpp usa grupos de 4 cores selecionados pelo tilemap.

Referencias tecnicas:

- https://snes.nesdev.org/wiki/Backgrounds
- https://snes.nesdev.org/wiki/Palettes
- https://snes.nesdev.org/wiki/Tiles
- https://snes.nesdev.org/wiki/Tilemap

## Objetivo
Permitir converter PNGs indexados BG/HUD/Textos `2 bpp` com multiplas subpaletas de 4 cores, usando o fluxo normal de BG para escolher a subpaleta base SNES.

Exemplo desejado:

- PNG tem 16 cores em 4 blocos de 4.
- Usuario escolhe BG + `2 bpp`.
- CLI pergunta subpaleta base do BG.
- Se a base escolhida for `1`, os blocos do PNG devem ir para subpaletas SNES `1..4`.
- A subpaleta SNES `0` fica livre/reservada para outro uso, como HUD/backdrop do projeto.

Regra equivalente ao BG 4bpp atual:

- Em BG 4bpp, uma imagem com 32 cores vira 2 subpaletas de 16 cores.
- Em BG 2bpp, uma imagem com 8 cores vira 2 subpaletas de 4 cores.
- Em BG 2bpp, uma imagem com 32 cores vira 8 subpaletas de 4 cores.
- O tilemap escolhe por tile qual mini-subpaleta 2bpp usar.

Exemplo pratico para BG3:

- Velas/elementos de baixo podem usar a mini-subpaleta SNES `1`.
- HUD/textos no topo podem usar a mini-subpaleta SNES `0`.
- Isso significa que dois grupos de 4 cores ficam ocupados: `0..3` para HUD/textos e `4..7` para velas, ou o inverso conforme a `bg-pal-base` escolhida em cada conversao.
- Se converter apenas as velas agora com `--bg-pal-base 1`, os indices PNG `0..3` desse asset devem apontar para a subpaleta SNES `1`, preservando a `0` para o HUD/textos futuro.

## Nao mudar
- Nao alterar BG 4bpp.
- Nao alterar sprite 2bpp: sprite 2bpp continua limitado a 4 cores.
- Nao alterar 8bpp.
- Nao mexer em combine, split, sequence, priority, color ou analyze-map.
- Nao mudar nomes de saida: `.chr`, `.map`, `.pal`, `.gpl`, `-tileset.png`.
- Nao adicionar flags novas se `--bg-pal-base` puder ser reaproveitado.
- Nao mexer no helper de VRAM para BG3 nesta etapa, salvo se algum teste mostrar bloqueio direto.

## Funcionalidade envolvida
Conversao principal de PNG para assets SNES, no caminho `tipo=bg` e `bpp=2`.

### Entradas
- PNG indexado, normalmente vindo do combine BG3/HUD 2bpp.
- Opcoes do fluxo interativo ou CLI:
  - `--tipo bg`
  - `--bpp 2`
  - `--tile-size 8x8` ou `16x16`
  - `--dedupe`
  - `--bg-pal-base <n>`
- PLTE do PNG em blocos de 4 cores.
- Indices reais do PNG.

### Saidas
Hoje, para BG 2bpp com mais de 4 cores, nao gera assets; falha antes em `buildPalette`.

### Saidas desejadas
- `.chr` com tiles 2bpp, 16 bytes por tile unico.
- `.map` com tile index, flip, priority e palette selection.
- `.pal` com a paleta compacta exportada em ordem de PLTE.
- `.gpl` com as mesmas cores para debug/edicao.
- `-tileset.png` renderizado corretamente para preview.

### Quem chama hoje
- `bin/png2snes.js` pelo comando `png2snes convert <input>`.
- `src/cli/menu.js` pelo fluxo interativo "Converter PNG para SNES".
- `src/sequence.js` tambem usa partes do pipeline de conversao, mas esta spec deve focar no fluxo principal. Se a alteracao tocar helper compartilhado, sequence precisa ser validado ao menos por sintaxe ou smoke test.

### Quem depende hoje
- `src/index.js` orquestra a conversao.
- `src/palette.js` valida limite de cores e preserva PLTE.
- `src/tiles.js` fatia tiles e calcula local/subpaleta por indice.
- `src/dedup.js` deduplica tiles e preserva subpaleta por entrada de tilemap.
- `src/map.js` grava os bits de subpaleta no MAP.
- `src/exporters.js` grava CHR/PAL/GPL/preview.
- `src/validateTiles.js` emite warnings para tiles BG que misturam subpaletas.
- `src/cli/conversionOptions.js` resolve perguntas/flags do CLI.

### Efeitos colaterais e mensagens de erro
Comportamento atual relevante:

- BG 4bpp exige `palBase` vindo do CLI e falha se ausente.
- BG 2bpp hoje nao pergunta `palBase` interativamente.
- BG 2bpp hoje usa `maxColors = 4`.
- `writeTilesetPreview` hoje aceita apenas `bpp=4` ou `bpp=8`.

Mensagens desejadas:

- Se `--bg-pal-base` for invalido: manter padrao atual de erro `bg-pal-base inválido`.
- Se BG 2bpp tiver cores demais para caber a partir da base escolhida, erro claro. Exemplo: paleta com 32 cores e base `1` exigiria subpaletas `1..8`, mas `8` nao existe.
- Se um tile misturar mais de uma subpaleta 2bpp, emitir warning claro equivalente ao warning atual de 4bpp, usando grupos de 4.

### Impacto
Impacta somente conversao BG `bpp=2`, mas toca arquivos compartilhados. A implementacao deve manter branches explicitos por `bpp` para evitar alterar 4bpp por acidente.

## Arquivos para ler antes de editar
- `src/index.js`
- `src/cli/conversionOptions.js`
- `src/palette.js`
- `src/tiles.js`
- `src/dedup.js`
- `src/map.js`
- `src/exporters.js`
- `src/validateTiles.js`
- `src/imageLoader.js`
- `src/sequence.js`

## Arquivos que devem ser alterados
Provaveis:

- `src/index.js`
- `src/cli/conversionOptions.js`
- `src/validateTiles.js`
- `src/exporters.js`

Somente se testes mostrarem necessidade:

- `src/tiles.js`
- `src/dedup.js`
- `src/map.js`

## Estrategia
Fazer a menor mudanca possivel, em etapas.

1. Resolver `palBase` para BG 2bpp do mesmo jeito que BG 4bpp.
   - Reaproveitar `--bg-pal-base <n>`.
   - No interativo, perguntar subpaleta base quando `tipo=bg` e `bpp` for `2` ou `4`.
   - Incluir `palBase` em `finalOpts` para BG 2bpp.

2. Ajustar limite de cores somente para BG 2bpp.
   - Para sprite 2bpp: continuar `maxColors = 4`.
   - Para BG 2bpp: permitir ate 32 cores no total, mas validar contra `palBase`.
   - Regra recomendada: `maxColors = (8 - palBase) * 4`.
   - Exemplos:
     - `palBase=0` -> max 32 cores.
     - `palBase=1` -> max 28 cores.
     - `palBase=4` -> max 16 cores.
   - A divisao em subpaletas deve ser automatica por blocos de 4, igual o BG 4bpp ja faz por blocos de 16.

3. Garantir que indices globais 2bpp viram local/subpaleta corretamente.
   - `src/tiles.js` ja parece fazer:
     - `local = idx & 3`
     - `srcPal = idx >> 2`
   - Manter sem alterar se testes confirmarem.

4. Garantir que MAP aplica a subpaleta base.
   - `src/map.js` ja soma `palBase + tileSubpal`.
   - Manter sem alterar se testes confirmarem.
   - Evitar wrap silencioso para BG 2bpp; se `palBase + srcPal > 7`, falhar antes.

5. Estender validacao de tiles para 2bpp.
   - Para `bpp=2`, um tile e valido quando todos os pixels nonzero pertencem a mesma subpaleta `idx >> 2`.
   - Ignorar pixels cujo local `idx & 3` seja `0`.
   - Reutilizar o formato do warning atual, ajustando texto para 2bpp/grupos de 4.

6. Estender preview de tileset para 2bpp.
   - `writeTilesetPreview` deve aceitar `bpp=2`.
   - Calcular `colorsPerSub = 4`.
   - Usar `srcPalette` do tile e `local 0..3`.
   - Renderizar com `colorIndex = srcPalette * 4 + local` dentro da paleta compacta.
   - Levar `palBase` em conta apenas para validacao de range, sem deslocar o indice dentro da `.pal` compacta.

7. Validar sem mexer em outras tools.

## Risco de quebra
medio-baixo

Motivo: a alteracao toca arquivos centrais do pipeline, mas o comportamento novo deve ficar restrito a `tipo=bg` e `bpp=2`. O maior risco e alterar sem querer preview, palBase ou validacao de BG 4bpp.

## Validacao manual
1. Converter o caso real:

```bash
node bin/png2snes.js convert to-convert/temple-bg3-final.png --tipo bg --bpp 2 --tile-size 8x8 --dedupe h --bg-pal-base 1
```

Resultado esperado:

- Nao deve falhar com "Imagem tem 16 cores, maximo permitido e 4".
- Deve gerar `to-convert/converted/temple-bg3-final.chr`.
- Deve gerar `to-convert/converted/temple-bg3-final.map`.
- Deve gerar `to-convert/converted/temple-bg3-final.pal`.
- Deve gerar `to-convert/converted/temple-bg3-final.gpl`.
- Deve gerar `to-convert/converted/temple-bg3-final-tileset.png`.

2. Verificar tamanhos:

```bash
stat -c "%n %s" to-convert/converted/temple-bg3-final.chr to-convert/converted/temple-bg3-final.map to-convert/converted/temple-bg3-final.pal
```

Resultado esperado:

- `.chr` multiplo de 16 bytes.
- `.map` com tamanho esperado para as dimensoes do PNG.
- `.pal` com `cores * 2`; para 16 cores, 32 bytes.

3. Validar subpaleta base no MAP.

Com `--bg-pal-base 1`, tiles que usam indices PNG:

- `0..3` devem gravar palette selection `1`.
- `4..7` devem gravar palette selection `2`.
- `8..11` devem gravar palette selection `3`.
- `12..15` devem gravar palette selection `4`.

Tambem validar o caso de 8 cores:

- Com `--bg-pal-base 0`, indices PNG `0..3` devem gravar palette selection `0` e indices `4..7` devem gravar palette selection `1`.
- Com `--bg-pal-base 1`, indices PNG `0..3` devem gravar palette selection `1` e indices `4..7` devem gravar palette selection `2`.

4. Validar erro de range.

Usar PNG 2bpp com 32 cores e `--bg-pal-base 1`.

Resultado esperado:

- Deve falhar claramente porque 8 subpaletas a partir da base 1 extrapolam `0..7`.

5. Validar que sprite 2bpp nao mudou.

```bash
node bin/png2snes.js convert algum-sprite-2bpp-com-mais-de-4-cores.png --tipo sprite --bpp 2 --no-interactive
```

Resultado esperado:

- Deve continuar falhando por limite de 4 cores.

6. Validar que BG 4bpp nao mudou.

Converter um PNG BG 4bpp conhecido com o mesmo comando/opcoes usados antes e comparar tamanhos/saida basica.

7. Validar interativo.

Rodar:

```bash
node bin/png2snes.js
```

Fluxo esperado:

- Escolher "Converter PNG para SNES".
- Escolher `temple-bg3-final.png`.
- Escolher BG.
- Escolher `2 bpp`.
- O CLI deve perguntar subpaleta base do BG, como ja faz para BG 4bpp.
- Escolher `1`.
- Converter com sucesso.

## Etapas
1. analise dos arquivos alvo completos
2. mudar `conversionOptions` para palBase em BG 2bpp/4bpp
3. mudar limite de cores em `index.js`
4. estender validacao 2bpp em `validateTiles.js`
5. estender preview 2bpp em `exporters.js`
6. rodar validacoes manuais/automatizadas
7. parar e reportar
