# Planning - Conversao BG3/HUD 2bpp com subpaletas de 4 cores

## Titulo
Conversao SNES para BG3/HUD 2bpp com grupos de 4 cores.

## Tipo
melhoria tecnica

## Problema percebido
O combine BG3/HUD 2bpp gera um PNG final indexado com paleta concatenada em blocos de 4 cores. Isso e adequado para o SNES, mas a conversao atual rejeita esse PNG quando `bpp=2`, porque trata BG 2bpp como se pudesse ter apenas 4 cores totais.

Erro observado:

```text
[png2snes] Erro: Imagem tem 16 cores, maximo permitido e 4
```

## Entendimento tecnico do SNES
Referencias pesquisadas:

- https://snes.nesdev.org/wiki/Backgrounds
- https://snes.nesdev.org/wiki/Palettes
- https://snes.nesdev.org/wiki/Tiles
- https://snes.nesdev.org/wiki/Tilemap

Resumo:

- Em mode 1, BG1/BG2 sao 4bpp e BG3 e uma camada 2bpp.
- BG3 em mode 1 seleciona cores nos primeiros 32 indices da CGRAM.
- Tiles 2bpp usam pixels locais `0..3`.
- A paleta 2bpp e organizada em grupos de 4 cores.
- A entrada de tilemap tem bits de palette selection `0..7`; para 2bpp, esses bits escolhem qual grupo de 4 cores o tile usa.
- Pixel local `0` e transparente na renderizacao do tile. A cor CGRAM correspondente pode existir e tambem pode funcionar como backdrop, mas dentro do tile o valor local `0` nao pinta.

Conclusao para o `png2snes`:

- Um PNG BG3/HUD 2bpp com 16 cores nao deve ser tratado como "16 cores no mesmo tile".
- Ele deve ser tratado como 4 subpaletas de 4 cores.
- O `.pal` pode exportar essas 16 cores em sequencia.
- O `.chr` deve conter somente valores locais `0..3`.
- O `.map` deve escolher a subpaleta por tile usando os bits 10..12, exatamente como ja acontece para BG 4bpp, mas com grupos de 4.

## Fluxo atual
1. O usuario combina partes BG3/HUD 2bpp e gera algo como `temple-bg3-final.png`.
2. O PNG final tem indices globais em blocos: `0..3`, `4..7`, `8..11`, `12..15`.
3. Na conversao interativa, o usuario escolhe BG + `2 bpp`.
4. `src/index.js` calcula `maxColors = 4` para BG 2bpp.
5. `src/palette.js` le a PLTE inteira do PNG indexado e encontra 16 entradas.
6. A conversao falha antes de gerar `.chr`, `.map`, `.pal` e `.gpl`.

## Objetivo
Permitir converter BG/HUD/Textos 2bpp indexados com ate 8 subpaletas de 4 cores, sem alterar o comportamento de:

- BG 4bpp atual
- sprite atual
- 8bpp atual
- combine atual
- sequence/split/priority/color/analyze-map

## Restricoes
- Mudanca pequena e testavel.
- Nao refatorar o pipeline inteiro.
- Nao mudar defaults do 4bpp.
- Nao introduzir dependencia nova.
- Nao alterar o combine BG3/HUD ja criado, a menos que a spec prove necessidade.
- Preservar PNG 2bpp simples com ate 4 cores.
- Falhar ou avisar claramente quando um tile 8x8 misturar mais de uma subpaleta 2bpp.

## Opcoes de solucao

### Opcao A
Manter BG 2bpp como maximo de 4 cores e exigir que o usuario converta cada grupo separadamente.

**Pros**
- Risco minimo no codigo.
- Nao altera nenhuma parte do pipeline atual.

**Contras**
- Nao atende o fluxo BG3/HUD real.
- Ignora o funcionamento de subpaletas 2bpp no SNES.
- Faz o combine BG3/HUD perder utilidade para conversao SNES.

**Impacto provavel**
- baixo

### Opcao B
Estender apenas BG 2bpp para aceitar ate 8 grupos de 4 cores, reutilizando o pipeline atual de indices reais, tilemap e CHR.

Mudancas provaveis:

- Em `src/index.js`, para `tipo=bg` e `bpp=2`, permitir ate `4 * 8 = 32` cores.
- Em `src/validateTiles.js`, validar/avisar mistura de subpaletas tambem para 2bpp, usando `idx & 0x03` como local e `idx >> 2` como subpaleta.
- Em `src/exporters.js`, permitir `writeTilesetPreview` para `bpp=2`, com blocos de 4 cores.
- Manter `src/tiles.js`, `src/map.js`, `src/dedup.js` e `writeChr` como base, alterando somente se a spec/teste mostrar bug real.

**Pros**
- Segue o formato SNES.
- Usa estruturas ja existentes no projeto.
- Mudanca localizada.
- Mantem BG 4bpp intacto.
- Funciona para PNG combinado com 4, 8, 12, 16, ate 32 cores.

**Contras**
- Requer cuidado no preview e na validacao por tile.
- Pode revelar PNGs 2bpp antigos com paleta maior que 4 que antes falhavam cedo.

**Impacto provavel**
- medio-baixo

### Opcao C
Criar um modo separado explicito para BG3/HUD, por exemplo `--bg3-hud` ou `--palette-groups 4`, e manter `bpp=2` antigo com limite de 4 cores.

**Pros**
- Escopo muito explicito.
- Reduz chance de afetar usos antigos de `bpp=2`.

**Contras**
- Aumenta a quantidade de flags/decisoes no CLI.
- O usuario volta a precisar decorar opcao.
- Duplica uma regra que, na pratica, ja e o comportamento normal de BG 2bpp com subpaletas.

**Impacto provavel**
- medio

## Recomendacao
Seguir a Opcao B.

Ela e a menor mudanca que respeita o SNES e o fluxo atual do projeto. O codigo ja tem boa parte do comportamento necessario:

- `src/tiles.js` ja calcula `local = idx & 3` e `srcPal = idx >> 2` quando `bpp=2`.
- `src/map.js` ja grava palette selection para todo `bpp !== 8`.
- `writeChr` ja exporta tiles 2bpp.
- `src/palette.js` ja evita filtrar cores usadas em BG 2bpp, preservando a ordem da PLTE.

O erro atual esta concentrado principalmente no limite de cores e no preview/validacao que ainda foram pensados para 4bpp.

## Esforco estimado
medio

E uma alteracao pequena em numero de arquivos, mas precisa de testes cuidadosos com PNG indexado, `.pal`, `.chr` e `.map`.

## Arquivos ou areas que provavelmente precisam ser lidos
- `src/index.js`
- `src/palette.js`
- `src/tiles.js`
- `src/map.js`
- `src/validateTiles.js`
- `src/dedup.js`
- `src/exporters.js`
- `src/imageLoader.js`
- `src/cli/conversionOptions.js`
- `tools/vramLayoutHelper.js`

## Arquivos ou areas que provavelmente seriam alterados
- `src/index.js`
- `src/validateTiles.js`
- `src/exporters.js`

Possivelmente, apenas se testes mostrarem necessidade:

- `src/tiles.js`
- `src/dedup.js`
- `src/map.js`

## Riscos
- Um tile 8x8 com pixels de duas subpaletas 2bpp pode gerar cores erradas, porque o SNES so escolhe uma subpaleta por tile.
- Preview de tileset pode ficar incorreto se aplicar regra 4bpp em blocos de 16.
- `.pal` com menos que multiplos de 4 precisa ser tratado de forma previsivel: ou aceitar compacto como hoje, ou preencher no futuro se houver necessidade.
- BG3 nomeado `bg3` hoje provavelmente nao entra no helper de VRAM, que detecta apenas `bg1/bg2`. Isso deve ficar fora da primeira implementacao, salvo decisao explicita na spec.

## Validacao inicial
Antes de implementar, criar fixtures pequenas ou usar uma imagem real como `temple-bg3-final.png`:

1. PNG indexado com 16 cores em blocos de 4.
2. Converter como BG + `2 bpp`.
3. Confirmar que `.pal` tem 16 entradas.
4. Confirmar que `.chr` tem `16 bytes * tiles_unicos`.
5. Confirmar que cada pixel do CHR usa apenas local `0..3`.
6. Confirmar que o `.map` usa palette bits correspondentes aos blocos: indices `0..3` -> subpaleta 0, `4..7` -> subpaleta 1, `8..11` -> subpaleta 2, `12..15` -> subpaleta 3.
7. Confirmar que BG 4bpp continua gerando os mesmos arquivos para um fixture existente.
8. Confirmar que sprite 2bpp continua limitado a uma subpaleta de 4 cores.

## Proximo passo
Se aprovado, criar spec para a Opcao B antes de codar.
