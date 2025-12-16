png2snes

Ferramenta em Node.js para converter imagens PNG em dados binários compatíveis com o Super Nintendo (SNES), focada em ROM hacking, homebrew e desenvolvimento em Assembly 65816.

O png2snes gera arquivos prontos para uso real no hardware/emulador, respeitando as limitações e o funcionamento interno do SNES.

✨ Principais recursos

Conversão de PNG → CHR / PAL / MAP

Suporte a SPRITES (OBJ) e BACKGROUND (BG), com pipelines separados

Paletas no formato SNES BGR555

Geração de .gpl para edição no GIMP

Deduplicação de tiles (BG)

Metatiles (BG)

Modo interativo ou via flags

Saída limpa, sem arquivos inúteis

📦 Instalação
npm install -g png2snes


Ou via npx:

npx png2snes imagem.png

🚀 Uso básico
png2snes imagem.png


Se rodar sem flags, a ferramenta entra em modo interativo.

🎮 Modo SPRITE (OBJ)

O modo SPRITE é pensado para sprites reais do SNES, não para BG disfarçado.

Comportamento do modo SPRITE

✔ Gera:

.chr — tiles 4bpp (32 bytes por tile)

.pal — 16 cores exatas

.gpl — paleta limpa para GIMP

❌ Não gera:

.map

preview de tileset

metatiles

partes (partN)

merge

❌ Não pergunta:

sub-paleta

deduplicação

opções de BG

Regras técnicas (SPRITE)

Sempre 1 única paleta

Sempre 16 cores

Cor índice 0 = transparência

A escolha da sub-paleta OBJ (0–7) é feita no Assembly, não na ferramenta

Exemplo
png2snes scorpion.png --tipo sprite


Arquivos gerados:

scorpion.chr
scorpion.pal
scorpion.gpl


Prontos para carregar via DMA em VRAM/CGRAM e usar via OAM.

🧱 Modo BACKGROUND (BG)

O modo BG é voltado para cenários, fundos e telas completas.

Comportamento do modo BG

✔ Gera:

.chr — tiles

.map — tilemap SNES (16 bits por entrada)

.pal — múltiplas sub-paletas

.gpl

preview de tileset

metatiles (opcional)

✔ Suporta:

deduplicação de tiles

divisão em partes

merge final

🧩 Deduplicação (BG apenas)

Disponível somente para BG:

none — sem deduplicação

simple — tiles idênticos

h — dedupe com flip horizontal

v — dedupe com flip vertical

full — dedupe completo (H + V)

Sprites nunca usam dedupe, para manter previsibilidade de índices.

🧱 Metatiles (BG apenas)

Permite agrupar tiles em blocos maiores (ex: 16×16 ou 32×32), gerando um .meta.json auxiliar.

🔀 Merge de partes (BG apenas)

Quando o BG é dividido em partes (*-partN), a ferramenta pode unir tudo em um output final.

O merge nunca é oferecido para sprites, pois sprites são sempre unidades únicas.

⚙️ Opções principais
Opção	Descrição
`--tipo sprite	bg`
`--bpp 2	4`
`--tile-size 8x8	16x16`
--sprite-sizes	Combo de tamanhos OBJ (SPRITE)
--dedupe	Deduplicação (BG)
--metatile	Gera metatiles (BG)
--no-interactive	Usa apenas flags
🧠 Filosofia do projeto

SPRITE prioriza fidelidade e controle
BG prioriza otimização e economia

O png2snes evita gerar arquivos ou opções que não fazem sentido no hardware real, mantendo o output:

previsível

correto

fácil de integrar no Assembly

🕹️ Integração com Assembly SNES

Os arquivos gerados podem ser usados diretamente com DMA:

.chr → VRAM

.pal → CGRAM

.map → VRAM (BG)

A lógica de OAM, sub-paletas e prioridades é responsabilidade do código Assembly, como no SNES real.

📄 Licença

MIT