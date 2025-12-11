📘 png2snes — Conversor PNG → Gráficos SNES / PNG to SNES Graphics Converter
PT-BR
O que é

png2snes é uma ferramenta de linha de comando em Node.js que converte imagens PNG em arte SNES (tiles, mapas e paletas) organizados e prontos para uso em ROM hacks ou homebrew. 
GitHub

Isso inclui:

Tiles SNES (.chr)

Tilemap SNES (.map)

Paleta SNES (.pal)

Paleta GIMP (.gpl)

Tileset de visualização (*-tileset.png)

Meta dados opcionais (.meta.json)
Tudo modular e configurável. 
GitHub

EN
What it is

png2snes is a Node.js CLI tool that converts PNG images into SNES graphics (tiles, maps, and palettes) organized and ready for use in ROM hacks or homebrew.

It generates:

SNES tiles (.chr)

SNES tilemap (.map)

SNES palette (.pal)

GIMP palette (.gpl)

Tileset preview (*-tileset.png)

Optional metadata (.meta.json)
All modular and configurable. 
GitHub

PT-BR
Instalação

Clone o repositório e instale:

git clone https://github.com/JamesRoitberg/png2snes.git
cd png2snes
npm install


Para usar globalmente:

npm link


Ou direto com npx:

npx png2snes ./imagem.png

EN
Installation

Clone and install:

git clone https://github.com/JamesRoitberg/png2snes.git
cd png2snes
npm install


To install globally:

npm link


Or use with npx:

npx png2snes ./image.png

PT-BR
Como funciona

O programa:

Lê o PNG de entrada

Extrai a paleta

Divide a imagem em tiles 8×8

(Opcional) Deduplica tiles repetidos

Gera:

.chr (tiles)

.map (tilemap)

.pal (paleta SNES)

.gpl (paleta GIMP)

*-tileset.png (visualização)

.meta.json (info extra)

Salva no diretório de saída escolhido.

EN
How it works

The program:

Loads the input PNG

Extracts the palette

Splits the image into 8×8 tiles

(Optional) Deduplicates repeated tiles

Generates:

.chr (tiles)

.map (tilemap)

.pal (SNES palette)

.gpl (GIMP palette)

*-tileset.png (preview)

.meta.json (extra info)

Saves everything in the output directory

PT-BR
Uso (modo interativo)
npx png2snes ./meu_sprite.png


O CLI entra no modo interativo se não houver flags:

✔ Tipo (BG ou Sprite)?
✔ Profundidade de bits (2bpp / 4bpp / 8bpp)?
✔ Deduplicar tiles?
✔ Pasta de saída?

EN
Interactive usage
npx png2snes ./my_sprite.png


Without flags the CLI runs interactively:

✔ Type (BG or Sprite)?
✔ Bit depth (2bpp / 4bpp / 8bpp)?
✔ Deduplicate tiles?
✔ Output folder?

PT-BR
Uso sem interativo

Para ver todas as opções:

npx png2snes --help


Exemplo sem prompts:

npx png2snes ./bg.png --bpp 4 --out ./build


Saída esperada:

build/bg.chr
build/bg.map
build/bg.pal
build/bg.gpl
build/bg-tileset.png

EN
Non-interactive usage

Check options:

npx png2snes --help


Example:

npx png2snes ./bg.png --bpp 4 --out ./build


Expected output:

build/bg.chr
build/bg.map
build/bg.pal
build/bg.gpl
build/bg-tileset.png

PT-BR
Dicas

Use imagens indexadas para controle exato de paleta.

A deduplicação reduz tamanho do .chr.

A visualização tileset.png ajuda a checar se os tiles ficaram corretos.

EN
Tips

Use indexed PNGs to control palette exactly.

Deduplication reduces .chr size.

The tileset.png preview helps check the tiles visually.

PT-BR
Estrutura do projeto
bin/        # comando CLI
src/        # lógica principal
README.md   # documentação
package.json

EN
Project layout
bin/        # CLI entrypoint
src/        # main logic
README.md   # documentation
package.json

PT-BR
Contribuições

Quer melhorar, achar bugs ou adicionar recursos? Abra uma issue ou um pull request.

EN
Contributing

Want to improve it, report bugs or add features? Open an issue or pull request.

PT-BR
Licença

MIT.

EN
License

MIT.