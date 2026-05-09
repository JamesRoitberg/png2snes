# Planning - Integracao com Kombat Core/Kreator

## Titulo
Integrar konvert2snes com Kombat Core/Kreator.

## Tipo
melhoria tecnica

## Problema percebido
Depois que o `konvert2snes` gera assets finais em `converted/`, ainda existe uma etapa manual para levar esses arquivos ate o projeto/jogo que vai usa-los.

Duas dores principais foram identificadas:

- assets finais prontos precisam ser transferidos para a pasta de assets do cenario correspondente;
- os valores de layout de VRAM gerados no fim da conversao de BG1/BG2 precisam ser copiados para o config do cenario alvo.

Hoje isso depende de decisao manual, copia manual e copiar/colar valores. Isso funciona, mas pode gerar erro humano quando o volume de cenarios crescer.

Este planning corresponde ao item `BL-013` do backlog.

## Fluxo atual
No fluxo atual deste repositorio:

1. O usuario prepara PNGs em `to-convert/`.
2. O CLI combina, splita, converte ou aplica prioridade.
3. A conversao principal grava os assets em `<baseOutDir>/converted/<stem>.*`.
4. Para BG, os arquivos principais gerados incluem `.chr`, `.map`, `.pal`, `.gpl` e `-tileset.png`.
5. Para nomes `bg1`/`bg2`, `tools/vramLayoutHelper.js` pode imprimir um layout sugerido de VRAM.
6. O usuario leva manualmente os assets e os valores de VRAM para o projeto alvo.

No estado atual deste repositorio, nao ha contrato conhecido de:

- caminho dos assets dentro do Kombat Core/Kreator;
- formato do config de cenario;
- nome final esperado de cada asset;
- quais arquivos devem ser copiados em cada tipo de cenario;
- como o Kreator deve chamar ou importar resultado do `konvert2snes`.

## Objetivo
Criar uma direcao segura para integrar o `konvert2snes` com Kombat Core/Kreator sem acoplar cedo demais os projetos.

O objetivo final desejado e:

- copiar assets finais de `converted/` para a pasta correta do cenario alvo;
- atualizar ou sugerir atualizacao do config do cenario com valores de VRAM BG1/BG2;
- reduzir copia manual;
- manter previsibilidade, com preview/dry-run antes de escrever fora da pasta de trabalho;
- evitar quebrar o fluxo atual do CLI.

## Divisao recomendada em tarefas
Esta integracao deve virar duas tarefas separadas, porque os riscos e contratos sao diferentes.

### Tarefa 1: valores de VRAM para config do cenario
Objetivo: levar os valores finais de layout de VRAM para o config do cenario alvo.

Escopo futuro:

- descobrir onde o config do cenario guarda os valores de VRAM;
- obter valores de BG1/BG2 quando o helper ja tiver os dois lados corretos;
- preferir saida estruturada, como JSON, em vez de parsear texto de console;
- mostrar dry-run/diff antes de alterar config;
- nao copiar assets nesta tarefa.

### Tarefa 2: copia de assets finais para o cenario
Objetivo: copiar somente os assets finais necessarios para a pasta de assets do cenario correspondente.

Regra inicial:

- copiar apenas `.chr`, `.pal` e `.map`;
- nao copiar `.gpl`, `-tileset.png`, PNGs intermediarios ou arquivos auxiliares;
- se existir um priority map final, por exemplo `<stem>-pri.map`, usar esse arquivo no lugar do `.map` normal;
- o plano/dry-run deve deixar claro qual `.map` sera copiado e se ele veio de prioridade.

Essa tarefa nao deve alterar config de VRAM. Se depois fizer sentido, um fluxo maior pode chamar as duas tarefas em sequencia, mas elas devem continuar testaveis separadamente.

## Restricoes
- Nao implementar ainda sem conhecer o contrato real do Kombat Core/Kreator.
- Nao escrever em outro repositorio sem confirmacao explicita.
- Nao usar caminhos absolutos hardcoded de maquina local.
- Nao misturar essa integracao dentro do core de conversao.
- Preservar `converted/` como saida atual do pipeline.
- Preservar comandos existentes.
- Evitar novas dependencias enquanto nao houver necessidade clara.
- Tratar `.map` de tilemap e "layout de VRAM" como coisas diferentes.
- Preferir saida estruturada para valores de VRAM em vez de parsear texto de console.
- Antes de alterar config externo, exigir backup, dry-run ou diff claro.
- Nao misturar a copia de assets com a escrita do config de VRAM na primeira implementacao.
- Na copia de assets, limitar explicitamente os arquivos a `.chr`, `.pal` e um unico `.map` final.

## Opcoes de solucao

### Opcao A
Criar uma tool separada de handoff/export.

Exemplo futuro:

```bash
konvert2snes export-stage <cenario> --from to-convert/converted --out /tmp/kombat-handoff
```

Essa tool nao escreveria diretamente no Kombat Core/Kreator. Ela geraria um pacote intermediario com:

- assets finais selecionados, limitados a `.chr`, `.pal` e `.map`;
- um manifesto estruturado com nomes, paths, hashes/tamanhos e tipo de asset;
- valores de VRAM em JSON, quando disponiveis;
- instrucoes ou resumo do que deve ser importado.

Para assets com prioridade, o manifesto deve apontar o `-pri.map` como mapa final quando ele existir, em vez do `.map` normal.

Depois, Kombat Kreator/Core poderia importar esse pacote.

**Pros**
- Menor risco de quebrar projeto externo.
- Boa primeira etapa quando o contrato do destino ainda esta indefinido.
- Permite validar nomes, arquivos e valores antes de automatizar escrita.
- Pode evoluir para deploy direto depois.
- Mantem a integracao isolada em uma unidade nova.

**Contras**
- Ainda exige uma etapa extra de importacao.
- Nao resolve sozinho a copia direta para a pasta final.
- Precisa definir formato de manifesto.

**Impacto provavel**
- medio

### Opcao B
Criar uma tool separada de deploy/sync direto para o projeto alvo.

Exemplo futuro:

```bash
konvert2snes deploy-stage <cenario> --target ../kombat-core --dry-run
```

A tool leria uma configuracao de mapeamento, mostraria um plano e, se confirmado:

- copiaria somente `.chr`, `.pal` e um `.map` final para a pasta do cenario;
- usaria `-pri.map` no lugar do `.map` normal quando o priority map existir;
- atualizaria o config do cenario com valores de VRAM;
- faria backup ou mostraria diff antes de alterar config;
- recusaria sobrescrever arquivos inesperados sem confirmacao.

**Pros**
- Resolve diretamente o fluxo desejado.
- Reduz bastante trabalho manual quando o contrato do destino estiver claro.
- Pode ser uma UX boa para producao de cenarios.

**Contras**
- Depende de conhecer a estrutura real do Kombat Core/Kreator.
- Escrever config externo aumenta risco.
- Exige validacao cuidadosa para nao copiar assets para cenario errado.
- Provavelmente precisa de dry-run, backup e mensagens muito claras.

**Impacto provavel**
- medio-alto

### Opcao C
Fazer a integracao pelo lado do Kombat Kreator.

O Kreator chamaria o `konvert2snes` como ferramenta auxiliar, receberia os assets gerados e seria responsavel por copiar arquivos e atualizar config.

**Pros**
- O Kreator provavelmente conhece melhor o cenario alvo, paths e config.
- Pode oferecer uma experiencia mais amigavel.
- Evita que `konvert2snes` conheca detalhes demais do projeto/jogo.

**Contras**
- Depende de mudancas fora deste repositorio.
- Pode exigir uma API/saida estruturada mais estavel no `konvert2snes`.
- A validacao passa a envolver dois projetos.

**Impacto provavel**
- medio

### Opcao D
Adicionar pergunta de follow-up apos conversao: enviar para Kombat Core/Kreator agora?

Depois de converter BG1/BG2, o menu interativo perguntaria se deve transferir assets e VRAM para o cenario alvo.

**Pros**
- Muito conveniente para o usuario.
- Segue o estilo dos follow-ups interativos recentes.

**Contras**
- Acopla a conversao a um destino externo.
- Pode ser cedo demais enquanto paths/configs nao estao definidos.
- Aumenta risco de escrita errada fora do repositorio.
- Pode tornar o fluxo principal menos previsivel.

**Impacto provavel**
- alto

## Recomendacao
Seguir em duas frentes separadas, com a Opcao A como primeira direcao geral.

Primeiro, criar um formato de handoff/export ou manifesto estruturado que descreva claramente:

- quais assets finais foram gerados;
- a qual cenario eles pertencem;
- quais arquivos deveriam ser usados pelo destino;
- quais valores de VRAM foram calculados;
- quais passos ainda precisam ser feitos pelo Kombat Core/Kreator.

Dentro desse contrato, separar desde o inicio:

1. tarefa de VRAM/config, responsavel apenas por valores de layout de VRAM;
2. tarefa de copia de assets, responsavel apenas por `.chr`, `.pal` e `.map`, escolhendo `-pri.map` como mapa final quando existir.

Depois que esses contratos estiverem validados com cenarios reais, evoluir para a Opcao B, com deploy direto, dry-run e backup.

A Opcao D deve ficar para depois, se o deploy separado provar que o contrato esta estavel. Assim o fluxo principal de conversao continua limpo enquanto a integracao amadurece.

## Esforco estimado
medio

A primeira etapa pode ser moderada se for apenas manifesto/export. O deploy direto tende a ser maior porque exige entender e alterar com seguranca arquivos de outro projeto.

## Arquivos ou areas que provavelmente precisam ser lidos
Neste repositorio:

- `src/index.js`
- `src/sequence.js`
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/cli/discovery.js`
- `tools/vramLayoutHelper.js`
- `README.md`
- `docs/backlog.md`

No Kombat Core/Kreator, antes de qualquer spec:

- estrutura de pastas de assets de cenario;
- config de cenario;
- exemplos reais de BG1/BG2 ja integrados;
- nomes esperados para `.chr`, `.map`, `.pal` e arquivos relacionados;
- onde valores de VRAM entram;
- se o Kreator ja tem algum formato de projeto/metadata que possa receber um manifesto.

## Arquivos ou areas que provavelmente seriam alterados
Primeira etapa provavel neste repositorio:

- nova tool ou modulo isolado para export/handoff;
- `bin/png2snes.js` ou entrada equivalente do hub para expor o comando;
- `tools/vramLayoutHelper.js`, se for necessario emitir JSON estruturado;
- `README.md`, documentando o fluxo;
- `docs/backlog.md`, no fechamento da tarefa.

Etapa futura de deploy direto, se aprovada:

- modulo separado para plano de copia/deploy;
- modulo separado para escrita segura de config;
- possivel arquivo de configuracao/manifesto de mapeamento por cenario.

Specs futuras devem ser separadas:

- uma spec para VRAM/config;
- uma spec para copia de assets.

## Riscos
- Copiar assets para o cenario errado.
- Sobrescrever assets bons com arquivos incompletos.
- Atualizar config com valores de VRAM de outro par BG1/BG2.
- Confundir tilemap `.map` com layout de VRAM.
- Criar acoplamento forte com um layout de pastas ainda instavel.
- Tentar parsear texto humano do helper de VRAM em vez de usar dados estruturados.
- Criar uma automacao que funciona na maquina local, mas nao em Windows/Linux de outro usuario.
- Aumentar complexidade do CLI principal antes da integracao estar madura.

## Validacao inicial
Antes de criar spec, validar manualmente com pelo menos um cenario real:

1. listar quais arquivos em `converted/` sao considerados finais;
2. definir o nome do cenario alvo;
3. mapear para onde cada arquivo deveria ir no Kombat Core/Kreator;
4. identificar exatamente quais campos de config recebem valores de VRAM;
5. confirmar se BG1 e BG2 precisam estar ambos presentes para gerar o layout final;
6. decidir se valores de VRAM devem vir de JSON do helper, de um arquivo gerado, ou de uma chamada direta;
7. confirmar que a copia de assets deve incluir somente `.chr`, `.pal` e um `.map`;
8. confirmar a regra de prioridade: se `<stem>-pri.map` existir, ele substitui `<stem>.map` no destino;
9. desenhar um dry-run esperado para copia de assets;
10. desenhar um dry-run esperado para config de VRAM;
11. confirmar que cancelar nao altera nada.

## Proximo passo
Manter este planning aberto ate existir um exemplo concreto do Kombat Core/Kreator.

Quando houver um cenario alvo real e a estrutura de destino estiver clara, escolher entre:

- criar uma spec da tarefa de VRAM/config;
- criar uma spec separada da tarefa de copia de assets;
- ou criar planning complementar mais detalhado para a Opcao B, se o deploy direto ja parecer seguro.
