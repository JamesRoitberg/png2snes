png2snes

Ferramenta CLI em Node.js para converter imagens PNG em tiles, tilemap e paletas compatíveis com SNES.

Ela pega um PNG (geralmente indexado) e gera automaticamente:

Arquivo CHR (tiles em formato SNES)

Arquivo MAP (tilemap SNES)

Arquivo PAL (paleta BGR555)

Arquivo GPL (paleta no formato do GIMP)

Tileset Preview em PNG para fácil visualização dos tiles gerados

Foi criada para facilitar workflows de ROM hacking e desenvolvimento SNES, substituindo fluxos complexos de ferramentas como superfamiconv.

Instalação

Clone o repositório e instale as dependências:

git clone https://github.com/JamesRoitberg/png2snes.git
cd png2snes
npm install


Uso direto com npx:

npx png2snes ./minha-imagem.png

Como funciona

Você fornece uma imagem PNG (idealmente indexada com as cores que deseja usar) e a ferramenta:

Carrega a imagem

Constrói a paleta SNES (BGR555)

Divide em tiles 8×8

Deduplica tiles iguais (opcional)

Gera:

.chr – bloco de tiles

.map – tilemap com índices + flags SNES

.pal – paleta SNES

.gpl – paleta GIMP

tileset.png – visualização dos tiles

Salva tudo no diretório desejado

Uso básico
npx png2snes ./imagem.png


Se nenhuma flag for fornecida, o programa entra no modo interativo, perguntando:

Se é BG ou Sprite

Profundidade de cor (2bpp, 4bpp, 8bpp)

Se deve deduplicar tiles

Pasta de saída

Uso avançado (sem modo interativo)

Veja as flags disponíveis:

npx png2snes --help


Exemplo:

npx png2snes ./bg.png --bpp 4 --out ./dist


Saída típica:

dist/bg.chr
dist/bg.map
dist/bg.pal
dist/bg.gpl
dist/bg-tileset.png

Dicas importantes

Para garantir cores corretas, use PNG indexado (paleta fixa).

Se a imagem já estiver no padrão BGR555, a ferramenta mantém as cores — não altera.

Se estiver criando um BG completo, pode conectar o MAP e o CHR diretamente na VRAM via ROM hacking.

A deduplicação reduz tamanho removendo tiles repetidos.

A visualização (tileset.png) ajuda a conferir rapidamente se os tiles e paletas ficaram corretos.

Estrutura do projeto
src/
  imageLoader.js
  palette.js
  tiles.js
  dedup.js
  map.js
  exporters.js
bin/
  png2snes (CLI)

Licença

MIT License.