# bgPriority

Ferramenta auxiliar (script Node.js) para aplicar **prioridade de BG (bit 13)** em arquivos `.map` do SNES usando uma **máscara PNG transparente**.

Objetivo: permitir que você marque visualmente, no GIMP, quais tiles devem ficar com prioridade 1, **sem alterar o png2snes** (nem CHR/PAL) e sem depender do layout interno do PPU manualmente.

---

## O que ela faz

- Lê:
  - um **PNG final** (ex.: saída do `combine-indexed`) — usado apenas para obter dimensão e grid 8×8
  - uma **máscara PNG** (mesmo tamanho do PNG final) — onde você “pinta” os tiles com prioridade
  - um arquivo **`.map`** gerado pelo png2snes
- Gera:
  - um novo **`.map`** idêntico ao original, porém com o **bit 13 (priority)** ligado nos tiles marcados na máscara

✅ Não muda: tileIndex, paleta, hflip, vflip (só OR no bit 13).  
✅ Funciona para: 32×32, 64×32, 32×64, 64×64 (e outros múltiplos de 8; para layout SNES exige múltiplos de 32).  
✅ Automático por tamanho: para mapas > 32×32 tiles, usa layout **SNES (telas 32×32)** por padrão.

---

## Requisitos

- Node.js
- Dependência: `pngjs`

Instalação:

```bash
npm i pngjs
Uso
Exemplo (The Pit BG2 512×256):

node bgPriority.js \
  --png ../to-convert/converted/pit-bg2.png \ 
  --mask ../to-convert/converted/pit-bg2-priority.png \
  --map ../to-convert/converted/pit-bg2.map \
  --out ../to-convert/converted/pit-bg2-pri.map

Versão com 1 linha para evitar erros
  node bgPriority.js --png ../to-convert/converted/courtyard-bg2-final.png --mask ../to-convert/converted/courtyard-bg2-prio.png --map ../to-convert/converted/courtyard-bg2-final.map --out ../to-convert/converted/courtyard-bg2-prio.map


Opção de layout (raramente necessário)
Por padrão --layout auto:

auto → usa snes quando tilesX > 32 ou tilesY > 32, senão linear

snes → layout PPU (screens 32×32 concatenadas)

linear → row-major simples (debug/compat)

Exemplo forçando:

node tools/bgPriority.js ... --layout linear
Use --layout linear apenas se você estiver aplicando prioridade em um .map antigo que foi serializado em linear.

Como criar a máscara no GIMP
Regras da máscara
A máscara deve ser um PNG com transparência (alpha)

Deve ter o mesmo tamanho do PNG final (ex.: 512×256, 512×512)

Um tile 8×8 é considerado “marcado” se existir qualquer pixel com alpha > 0 dentro daquele bloco 8×8

A cor não importa (pode ser vermelho, magenta, etc.). O que vale é o alpha

Passo a passo
Abra o final.png no GIMP

Ative o grid:

Image > Configure Grid… → 8×8

View > Show Grid

Crie uma camada transparente:

Layer > New Layer… → Fill with: Transparency

Pinte os tiles desejados nessa camada (pincel 2×2 funciona bem)

Exporte somente a máscara:

Desligue a visibilidade do final.png, deixe visível apenas a camada da máscara

File > Export As… → something-priority.png

Validações que o script faz (falha alto)
png e mask precisam ter mesmas dimensões

dimensões precisam ser múltiplas de 8

.map precisa ter tamanho exato:

bytes == (width/8) * (height/8) * 2

Assim ele evita gerar .map inválido ou desalinhado.

Notas técnicas (SNES)
Bit de prioridade no tilemap: bit 13 (mask 0x2000)

Word do tilemap (BG):

bits 0–9: tileIndex

bits 10–12: pal (4bpp)

bit 13: priority

bit 14: hflip

bit 15: vflip

Layout do .map:

32×32: linear == SNES

32×32: o PPU espera “screens” 32×32 concatenadas:

64×32: 2 screens lado a lado

32×64: 2 screens empilhadas

64×64: 4 screens (2×2)

English (short)
bgPriority sets SNES BG tile priority (bit 13) in a .map using a transparent PNG mask painted over the final background PNG. It outputs a new .map with only bit 13 changed, preserving tile index/palette/flips. Default layout is auto (uses SNES 32×32 screen layout when map is larger than 32×32 tiles).


Se você quiser, eu adapto o README para o estilo do seu repo (ex.: incluir exemplo específico do The Pit, paths padrão, e um “quick checklist” para 64×32 vs 64×64).
::contentReference[oaicite:0]{index=0}