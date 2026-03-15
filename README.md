# png2snes

CLI para transformar PNGs indexados em assets prontos para SNES.

English version: [README.en.md](README.en.md)

## O que a ferramenta faz

O `png2snes` converte imagens indexadas em arquivos usados no fluxo de BG e sprites no SNES:

- `.chr` com tiles em formato SNES
- `.map` para cenários e backgrounds
- `.pal` em BGR555
- `.gpl` para inspeção de paleta
- `*-tileset.png` para preview visual dos tiles de BG

Além da conversão principal, ele também centraliza algumas tasks comuns do pipeline:

- converter sequências de frames
- combinar partes de cenário
- splitar sheets em vários PNGs
- aplicar prioridade de BG
- converter cor hexadecimal para SNES
- analisar arquivos `.map`

## Quando usar

Use o `png2snes` quando você precisa:

- converter um PNG indexado de cenário ou sprite
- gerar assets de uma animação quadro a quadro
- montar um cenário grande a partir de partes
- calcular e revisar layout de VRAM para BG1/BG2
- rodar tasks auxiliares sem lembrar scripts separados

## Instalação

```bash
npm install
```

Para testar localmente dentro do repositório:

```bash
node bin/png2snes.js
```

Para usar `png2snes` direto no shell:

```bash
npm link
```

## Uso rápido

Sem argumentos, o CLI abre um menu interativo:

```bash
node bin/png2snes.js
```

Esse modo é o caminho mais simples para uso manual. Ele pede entradas naturais, como:

- arquivo PNG
- arquivo MAP
- pasta
- cor hexadecimal

Quando possível, o CLI tenta inferir automaticamente:

- diretório
- stem/base name
- sequência de frames
- partes relacionadas
- arquivos associados para prioridade e análise

## Subcomandos principais

### Converter PNG para SNES

```bash
png2snes convert to-convert/tomb-bg2-final.png
```

### Converter sequência de frames

```bash
png2snes sequence to-convert/tomb-anim-01.png
```

### Combinar partes de cenário

```bash
png2snes combine to-convert/tomb-bg2-part1.png
```

### Splitar PNG em vários frames

```bash
png2snes split to-convert/tomb-anim-sheet.png --name tomb-anim --sepIndex 0
```

### Aplicar prioridade de BG

```bash
png2snes priority to-convert/converted/tomb-bg2-final.png
```

### Converter cor para SNES

```bash
png2snes color ad1808
```

### Analisar MAP

```bash
png2snes analyze-map to-convert/converted/tomb-bg2-final.map
```

### Ver exemplos

```bash
png2snes examples
```

## Fluxo interativo

O menu interativo cobre estes fluxos:

1. Converter PNG para SNES
2. Converter animação por sequência de frames
3. Combinar partes de um PNG/cenário
4. Splitar PNG em vários frames
5. Aplicar prioridade de BG
6. Converter cor para SNES
7. Analisar arquivo MAP
8. Ver exemplos de comandos
9. Sair

Durante esses fluxos, o hub tenta:

- validar entradas básicas antes de rodar
- mostrar preview quando detectar múltiplos arquivos
- mostrar um resumo antes da execução
- imprimir o comando equivalente ao final

## Opções de conversão

Essas opções valem para `convert`, `sequence` e para o fluxo legado:

- `--tipo bg|sprite`
- `--bpp 2|4|8`
- `--modo 1|3|7`
- `--tile-size 8x8|16x16`
- `--sprite-sizes <sizes>`
- `--dedupe none|simple|h|v|full`
- `--bg-pal-base 0..7`
- `--paleta <arquivo>`
- `--debug-map`
- `--out-dir <dir>`
- `--no-interactive`
- `--no-print-vram-layout`

## Compatibilidade

Os comandos antigos continuam funcionando:

```bash
png2snes to-convert/tomb-bg2-final.png
node bin/png2snes.js --sequence --dir to-convert --stem tomb-anim
npm run color2snes -- ad1808
npm run bg-priority -- --dir to-convert/converted --stem tomb-bg2-final
npm run png-combine -- to-convert/tomb-bg2-part*.png
npm run png-split -- --dir to-convert --stem tomb-anim --name tomb-anim --sepIndex 0
```

Os scripts auxiliares ainda podem ser chamados direto via `npm run`:

```bash
npm run analyze-map -- <arquivo.map>
npm run bg-priority -- --dir <dir> --stem <stem>
npm run png-combine -- <arquivos...>
npm run png-split -- --dir <dir> --stem <stem> --sepIndex 0
npm run color2snes -- ad1808
```

## Saída e observações

- A conversão principal grava a saída em `converted/`
- Para BG 4bpp, informe `--bg-pal-base`
- Para sprite, o fluxo força `dedupe none`
- Para BG com nomes `bg1` e `bg2`, o helper imprime um layout sugerido de VRAM

## Estrutura

- `bin/png2snes.js`: entrada principal do CLI
- `src/`: core de conversão e orquestração
- `tools/`: tools auxiliares legadas
- `scripts/`: scripts auxiliares simples
