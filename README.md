# png2snes 2.0

CLI para converter PNG indexado em assets prontos para SNES e centralizar o workflow em um hub único.

## O que gera

- `.chr` para tiles SNES
- `.map` para BG
- `.pal` em BGR555
- `.gpl` para inspeção no GIMP
- `*-tileset.png` para preview de tiles BG

## O que mudou na 2.0

- `png2snes` virou o ponto central de entrada
- rodar sem argumentos abre um menu interativo
- agora existem subcomandos consistentes para os fluxos principais
- os comandos antigos continuam funcionando nesta fase

## Instalação

```bash
npm install
```

Para testar localmente dentro do repositório:

```bash
node bin/png2snes.js
```

Se quiser usar `png2snes` direto no shell:

```bash
npm link
```

## Menu interativo

Sem argumentos:

```bash
node bin/png2snes.js
```

O menu guia os fluxos principais:

1. Converter PNG para SNES
2. Converter animação por sequência de frames
3. Combinar partes de um PNG/cenário
4. Splitar PNG em vários frames
5. Aplicar prioridade de BG
6. Converter cor para SNES
7. Analisar arquivo MAP
8. Ver exemplos de comandos
9. Sair

O modo interativo prioriza entradas naturais, como arquivo PNG, arquivo MAP, pasta ou cor hexadecimal. Quando possível, o CLI tenta inferir `dir`, `stem`, sequência de frames e arquivos relacionados.

## Subcomandos principais

### Converter PNG

```bash
png2snes convert to-convert/tomb-bg2-final.png
```

### Converter sequência

```bash
png2snes sequence to-convert/tomb-anim-01.png
```

O CLI detecta a pasta, o `stem` e mostra preview dos frames encontrados.

### Combinar partes

```bash
png2snes combine to-convert/tomb-bg2-part1.png
```

O CLI detecta as outras partes relacionadas e mostra preview antes de executar.

### Splitar PNG

```bash
png2snes split to-convert/tomb-anim-sheet.png --name tomb-anim --sepIndex 0
```

### Aplicar prioridade de BG

```bash
png2snes priority to-convert/converted/tomb-bg2-final.png
```

O CLI tenta inferir `.map`, máscara `-priority.png` ou `-prio.png` e nome do arquivo de saída.

### Converter cor

```bash
png2snes color ad1808
```

Aceita com ou sem `#`.

### Analisar MAP

```bash
png2snes analyze-map to-convert/converted/tomb-bg2-final.map
```

### Ver exemplos

```bash
png2snes examples
```

## Opções de conversão

As opções abaixo valem para `convert`, `sequence` e para o fluxo legado:

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

## Compatibilidade com comandos antigos

Os fluxos antigos continuam aceitos:

```bash
png2snes to-convert/tomb-bg2-final.png
node bin/png2snes.js --sequence --dir to-convert --stem tomb-anim
npm run color2snes -- ad1808
npm run bg-priority -- --dir to-convert/converted --stem tomb-bg2-final
npm run png-combine -- to-convert/tomb-bg2-part*.png
npm run png-split -- --dir to-convert --stem tomb-anim --name tomb-anim --sepIndex 0
```

## Scripts auxiliares ainda disponíveis

```bash
npm run analyze-map -- <arquivo.map>
npm run bg-priority -- --dir <dir> --stem <stem>
npm run png-combine -- <arquivos...>
npm run png-split -- --dir <dir> --stem <stem> --sepIndex 0
npm run color2snes -- ad1808
```

## Estrutura

- `bin/png2snes.js`: entrada principal do CLI
- `src/`: core de conversão e orquestração do hub
- `tools/`: scripts auxiliares legados
- `scripts/`: scripts auxiliares simples

## Observações

- A saída de conversão continua indo para `converted/`
- Para BG 4bpp, informe `--bg-pal-base`
- Para sprite, o fluxo força `dedupe none`
- O hub mostra resumo antes de executar, preview quando detecta múltiplos arquivos e comando equivalente ao final do fluxo interativo
