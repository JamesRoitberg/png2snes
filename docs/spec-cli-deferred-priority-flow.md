# Spec - Melhorar fluxo de prioridade adiada no CLI

## Titulo
Aplicar prioridade de BG depois de revisar a arte convertida.

## Tipo
ajuste de CLI

## Contexto
O fluxo completo `combine -> convert -> priority` esta bom quando o usuario executa tudo em uma unica sessao interativa. Nesse caso, o CLI ainda tem contexto da conversao recem-feita e consegue aplicar prioridade com pouco atrito.

O problema aparece quando o usuario faz somente `combine -> convert`, para depois revisar a arte gerada e criar a mascara de prioridade. Ao voltar mais tarde no menu e escolher `5. Aplicar prioridade de BG`, o CLI nao tem mais o contexto da conversao anterior. O fluxo manual atual sugere `to-convert/converted`, lista muitos PNGs parecidos e infere os arquivos relacionados de forma mais restrita, o que torna facil escolher a mascara, tileset ou PNG errado.

## Objetivo
Melhorar o fluxo interativo `5. Aplicar prioridade de BG` para funcionar melhor como "prioridade adiada".

O usuario deve poder escolher o PNG final/base do cenario, normalmente em `to-convert/<stem>.png`, e o CLI deve inferir:

- MAP de entrada em `to-convert/converted/<stem>.map`;
- mascara ao lado do PNG base ou em `to-convert/converted`;
- saida em `to-convert/converted/<stem>-pri.map`.

O fluxo deve continuar pedindo confirmacao antes de executar.

## Nao mudar
- Nao mudar o subcomando direto `konvert2snes priority <input>`.
- Nao mudar `tools/bgPriority.js`.
- Nao mudar como a conversao gera `.chr`, `.map`, `.pal`, `.gpl` ou `-tileset.png`.
- Nao mudar o fluxo bom ja existente `combine -> convert -> priority`.
- Nao aplicar prioridade automaticamente.
- Nao adicionar dependencia.
- Nao mudar formato, nome ou significado de `*-pri.map`.
- Nao impedir o uso manual de MAP ou mascara quando a inferencia nao encontrar os arquivos.

## Funcionalidade envolvida
Fluxo interativo de aplicacao de prioridade de BG no menu principal.

### Entradas
- Escolha do menu: `5. Aplicar prioridade de BG`.
- PNG base/final do cenario:
  - preferencialmente `to-convert/<stem>.png`;
  - ainda deve aceitar um PNG em `to-convert/converted` quando esse for o fluxo do usuario.
- Mascara PNG:
  - inferida por nome;
  - ou informada manualmente quando nao for encontrada.
- MAP:
  - inferido por nome;
  - ou informado manualmente quando nao for encontrado.
- Confirmacao final `Executar agora?`.

### Saidas
Hoje, no fluxo manual:

- o usuario escolhe um PNG em `to-convert/converted`;
- `inferPriorityFromPng` procura `<stem>.map`, `<stem>-priority.png` ou `<stem>-prio.png` no mesmo diretorio do PNG escolhido;
- a saida padrao tambem fica nesse mesmo diretorio, como `<stem>-pri.map`;
- se mascara ou MAP nao forem encontrados, o menu pede caminho manual.

### Saidas desejadas
Depois da mudanca:

- o usuario pode escolher o PNG final/base em `to-convert`;
- o CLI usa `to-convert/converted/<stem>.map` como MAP preferencial quando existir;
- o CLI usa `to-convert/converted/<stem>-pri.map` como saida preferencial quando o PNG base estiver fora de `converted`;
- a mascara pode ser encontrada ao lado do PNG base ou dentro de `converted`;
- candidatos de mascara e preview, como `*-prio.png`, `*-priority.png` e `*-tileset.png`, nao devem poluir a lista principal de PNGs base quando possivel;
- antes de executar, o resumo deve deixar claro qual PNG, mascara, MAP e saida serao usados.

### Quem chama hoje
- `openMainMenu` chama `runInteractivePriority` quando a acao escolhida e `priority`.
- `runInteractivePriority` seleciona um PNG, chama `inferPriorityFromPng`, e depois chama `runInteractivePriorityKnownContext`.
- `runInteractivePriorityKnownContext` valida PNG, mascara e MAP, mostra resumo, pede confirmacao e chama `runPriorityFlow`.
- `runPriorityFlow` executa `tools/bgPriority.js`.

### Quem depende hoje
- Menu interativo aberto quando o CLI roda sem argumentos.
- Fluxo encadeado `convert -> priority`, que ja usa `runInteractivePriorityKnownContext` com contexto conhecido.
- Subcomando direto `konvert2snes priority <input>`, que usa `inferPriorityFromPng` em `bin/png2snes.js`.

### Efeitos colaterais e mensagens de erro
- Se a mascara inferida nao existir, o menu deve continuar pedindo o caminho manualmente.
- Se o MAP preferencial nao existir, o menu pode cair para a inferencia antiga ou pedir o MAP manualmente.
- Se o usuario cancelar em `Executar agora?`, nenhum `-pri.map` novo deve ser gerado.
- Erros de tamanho de imagem, tamanho de MAP e layout continuam vindo de `tools/bgPriority.js`.
- O comando equivalente de `priority` deve continuar sendo impresso apos execucao confirmada.

### Impacto
Impacto restrito ao menu interativo. O core de conversao, os scripts auxiliares e os subcomandos diretos devem permanecer iguais.

## Arquivos para ler antes de editar
- `src/cli/menu.js`
- `src/cli/discovery.js`
- `src/cli/toolRunner.js`
- `src/index.js`
- `tools/bgPriority.js`
- `bin/png2snes.js`
- `README.md`
- `docs/spec-cli-convert-priority-followup.md`

## Arquivos que devem ser alterados
- `src/cli/menu.js`

Somente se for decidido documentar a melhoria no fechamento:

- `README.md`
- `docs/backlog.md`

## Estrategia
Fazer a menor mudanca possivel em `src/cli/menu.js`.

1. Melhorar a selecao de PNG base no fluxo `runInteractivePriority`.
   - Preferir `to-convert` como diretorio inicial para o caso adiado.
   - Preservar a possibilidade de usar `Outro diretorio...`.
   - Evitar listar PNGs que claramente nao sao base de cenario, como `*-prio.png`, `*-priority.png` e `*-tileset.png`.

2. Criar ou ajustar helper local para inferir contexto de prioridade adiada.
   - Entrada: PNG escolhido pelo usuario.
   - Se o PNG estiver fora de uma pasta `converted`, procurar o MAP em `<dir>/converted/<stem>.map`.
   - Definir saida preferencial em `<dir>/converted/<stem>-pri.map`.
   - Procurar mascara com os mesmos candidatos ja usados pelo follow-up pos-conversao:
     - ao lado do PNG base;
     - dentro de `converted`;
     - usando stems derivados, quando aplicavel, como `<stem>` e `<stem>-final`.

3. Manter fallback para o comportamento atual.
   - Se o PNG escolhido ja estiver em `converted`, `inferPriorityFromPng` ainda deve funcionar como hoje.
   - Se o MAP preferencial nao existir, permitir prompt manual de MAP como hoje.

4. Reaproveitar `runInteractivePriorityKnownContext`.
   - Nao duplicar a execucao real de prioridade.
   - Manter resumo, confirmacao e comando equivalente em um unico fluxo.

5. Nao alterar `inferPriorityFromPng` nesta etapa.
   - Isso evita mudar o contrato usado pelo subcomando direto `priority`.

## Risco de quebra
baixo-medio

Motivo: a mudanca deve ficar concentrada no menu interativo, mas mexe na inferencia de caminhos de uma funcionalidade que escreve `.map`. O maior risco e inferir um MAP ou mascara diferente do esperado quando existem arquivos parecidos.

## Validacao manual
1. Validar prioridade adiada escolhendo PNG em `to-convert`:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `5. Aplicar prioridade de BG`;
- selecionar `to-convert`;
- escolher `to-convert/<stem>.png`, por exemplo `to-convert/bridge-bg2-final.png`;
- ter previamente `to-convert/converted/<stem>.map`;
- ter previamente uma mascara em `to-convert/<stem>-prio.png` ou `to-convert/converted/<stem>-prio.png`;
- confirmar execucao.

Resultado esperado:

- resumo mostra PNG base em `to-convert`;
- resumo mostra MAP em `to-convert/converted/<stem>.map`;
- resumo mostra mascara inferida;
- gera `to-convert/converted/<stem>-pri.map`;
- imprime comando equivalente.

2. Validar mascara manual:

- repetir o fluxo sem mascara inferivel;
- informar manualmente uma mascara PNG valida;
- cancelar em `Executar agora?`.

Resultado esperado:

- nenhum `-pri.map` novo e gerado;
- o fluxo encerra sem alterar arquivos de conversao.

3. Validar compatibilidade do fluxo antigo:

- escolher um PNG base em `to-convert/converted`;
- manter `<stem>.map` e `<stem>-prio.png` no mesmo diretorio;
- confirmar execucao.

Resultado esperado:

- comportamento continua equivalente ao fluxo manual atual.

4. Validar subcomando direto sem mudanca:

```bash
node bin/konvert2snes.js priority to-convert/converted/<stem>.png --mask to-convert/converted/<stem>-prio.png
```

Resultado esperado:

- continua usando a inferencia/validacao atual do subcomando direto;
- nao depende da nova inferencia interativa.

5. Validar comandos basicos:

```bash
node --check src/cli/menu.js
node bin/konvert2snes.js examples
node bin/konvert2snes.js --help
```

Resultado esperado:

- comandos continuam funcionando.

## Etapas
1. criar esta spec
2. aguardar aprovacao
3. fazer mudanca pequena em `src/cli/menu.js`
4. validar manualmente/smoke test
5. parar
