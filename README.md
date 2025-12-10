# png2snes

Ferramenta em Node.js inspirada no SuperFamiconv, focada **somente** em SNES e fluxo com GIMP.

Converte um PNG em:

- `.chr` – tiles em formato 2/4/8bpp do SNES
- `.map` – tilemap (16 bits por entrada, vhopppcc cccccccc)
- `.pal` – paleta SNES (BGR555, little‑endian, até 256 cores)
- `.gpl` – paleta no formato do GIMP
- `-tileset.png` – PNG com o tileset resultante (para conferência visual)

## Restrições/assumidas

- Entrada: PNG já indexado ou com quantidade de cores compatível com o modo escolhido
- Paleta externa:
  - `.pal` = 2 bytes por cor (BGR555, little‑endian)
  - `.txt` = linhas `R G B` (0–255), separadas por espaço
- Para 4bpp:
  - BG: usa até 8 sub‑paletas de 16 cores (0–7)
  - Sprites: usa até 8 sub‑paletas de 16 cores (8–15 em CGRAM)

## Uso rápido

```bash
npm install
npx png2snes ./imagem.png
```

O CLI faz perguntas interativas (tipo BG/sprite, bpp, deduplicação, etc.) se você não passar flags.

Para ver as opções:

```bash
npx png2snes --help
```
