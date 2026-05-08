# Planning - Perguntar conversao de sequencia apos split no CLI

## Titulo
Perguntar se deve converter os frames gerados apos split.

## Tipo
melhoria de UX

## Problema percebido
Depois de splitar uma sheet em varios PNGs numerados pelo menu interativo, o usuario precisa voltar manualmente ao menu e iniciar a conversao de animacao por sequencia de frames. Esse e um proximo passo comum, porque o split gera exatamente o tipo de entrada que o fluxo `sequence` espera.

Este planning corresponde ao item `BL-006` do backlog.

## Fluxo atual
No menu interativo:

1. O usuario escolhe `4. Splitar PNG em varios frames`.
2. O CLI pede diretorio e PNG de entrada.
3. `getSuggestedSplitName` sugere:
   - `pngPath`
   - `outDir`
   - `suggestedName`
4. O CLI pergunta `Nome base de saida` e `sepIndex`.
5. O CLI mostra resumo.
6. O usuario confirma a execucao.
7. `runSplitFlow` chama `tools/splitPng.js`.
8. O script gera arquivos numerados no formato `<name>-NN.png`, com `pad` default `2`.
9. O CLI imprime o comando equivalente de `split`.
10. `runInteractiveSplit` retorna `true` e `openMainMenu` encerra o menu.

Para converter os frames, o usuario precisa rodar outro comando ou abrir o menu de novo e escolher `2. Converter animacao por sequencia de frames`.

## Objetivo
Reduzir o atrito do fluxo interativo perguntando, apos um split concluido, se o usuario quer converter a sequencia de frames gerada.

O comportamento deve continuar manual e previsivel:

- nao converter automaticamente sem confirmacao;
- nao mudar o subcomando direto `konvert2snes split`;
- nao alterar como o split gera os PNGs;
- nao alterar como o sequence valida frames, dimensoes e paleta;
- nao alterar defaults de conversao existentes.

## Restricoes
- Mudanca pequena e testavel.
- Preservar o comportamento atual quando o usuario responder `Não`.
- Usar opcoes `Sim`/`Não` no prompt, sem input de texto livre.
- Nao mexer no core de conversao.
- Nao mexer em `tools/splitPng.js` se o primeiro frame puder ser inferido com seguranca.
- Nao criar dependencias novas.
- Manter o comando equivalente do split atual.
- Se houver comando equivalente da sequencia, ele deve seguir o formato ja usado pelo menu.
- Nao tentar converter se o primeiro frame esperado nao existir apos o split.

## Opcoes de solucao

### Opcao A
Apos `runSplitFlow`, perguntar `Converter a sequência de frames agora?`.

Se o usuario responder `Sim`, inferir o primeiro frame gerado como:

```text
<outDir>/<name>-01.png
```

Depois chamar um pequeno fluxo local que reaproveita `inferSequenceFromFrame`, `resolveConversionOptions({ interactive: true })`, preview/resumo, confirmacao e `runSequenceFlow`.

**Pros**
- Resolve a dor diretamente.
- Mantem o usuario no controle das opcoes de conversao.
- Pode ficar concentrado em `src/cli/menu.js`.
- Reaproveita o contrato atual do sequence: um frame numerado e suficiente.
- Nao muda subcomandos diretos nem scripts legados.
- Fica bem parecido com a melhoria aprovada para `combine -> convert`.

**Contras**
- Depende do pad default atual do split interativo (`2`) para inferir `-01`.
- Se no futuro o menu passar `pad` customizado para split, essa inferencia precisa acompanhar.

**Impacto provavel**
- baixo

### Opcao B
Apos `runSplitFlow`, retornar ao menu principal em vez de encerrar, permitindo que o usuario escolha manualmente a opcao `2. Converter animacao por sequencia de frames`.

**Pros**
- Menor mudanca tecnica.
- Evita encadear sequence dentro do fluxo de split.

**Contras**
- Nao passa automaticamente o primeiro frame gerado para o sequence.
- O usuario ainda precisa navegar, escolher diretorio e selecionar frame.
- Resolve pouco da dor registrada na BL-006.

**Impacto provavel**
- baixo

### Opcao C
Alterar `runSplitFlow` ou `tools/splitPng.js` para retornar/listar os caminhos gerados de forma estruturada e usar o primeiro deles no follow-up.

**Pros**
- Evita depender da convencao `-01`.
- Pode ser util para futuras integracoes.

**Contras**
- Exige mexer em tool legada ou no wrapper de execucao.
- Aumenta o escopo para uma melhoria de UX pequena.
- Pode alterar saidas/logs de script legado sem necessidade.

**Impacto provavel**
- medio

### Opcao D
Adicionar uma nova opcao de menu separada, por exemplo `Splitar e converter sequencia`.

**Pros**
- Deixa o fluxo explicito no menu.
- Evita mudar a opcao de split existente.

**Contras**
- Aumenta o menu principal.
- Duplica boa parte da logica de split e sequence.
- Pode confundir o usuario entre split simples e split com conversao.
- Mais superficie para manter.

**Impacto provavel**
- medio

## Recomendacao
Seguir a Opcao A.

Ela entrega a melhoria de usabilidade com o menor impacto no projeto. O split continua igual, o subcomando direto continua igual, e a conversao da sequencia so acontece depois de uma escolha explicita `Sim`/`Não`. A entrada do sequence ja e um frame numerado, e o split interativo hoje gera exatamente `<name>-01.png` como primeiro frame.

Para reduzir risco, a implementacao futura deve ficar concentrada em `src/cli/menu.js`, criando no maximo uma funcao auxiliar pequena para converter uma sequencia a partir de um frame ja conhecido.

## Esforco estimado
baixo

O fluxo atual ja tem quase todas as pecas. A mudanca principal e encadear uma pergunta opcional depois do split interativo e validar que o primeiro frame gerado existe.

## Arquivos ou areas que provavelmente precisam ser lidos
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/cli/conversionOptions.js`
- `src/cli/discovery.js`
- `src/sequence.js`
- `tools/splitPng.js`
- `bin/png2snes.js`
- `README.md`
- `docs/backlog.md`

## Arquivos ou areas que provavelmente seriam alterados
- `src/cli/menu.js`

Possivelmente, apenas se a spec decidir documentar o novo comportamento:

- `README.md`
- `docs/backlog.md`, no fechamento da tarefa

## Riscos
- Inferir `-01` incorretamente se o split interativo passar `pad` customizado no futuro.
- Tentar converter uma sequencia quando o split falhou ou nao gerou frames.
- Esconder o comando equivalente do split.
- Reutilizar opcoes de sequence de um jeito diferente do fluxo `Converter animacao por sequencia de frames`.
- Sequence pode falhar por dimensoes ou paletas divergentes entre frames; isso deve continuar sendo erro normal do sequence, nao uma regra nova do split.

## Validacao inicial
Antes de implementar, a spec deve confirmar:

1. a pergunta aparece somente depois de split confirmado e concluido;
2. a pergunta usa opcoes `Sim` e `Não`, sem texto livre;
3. responder `Não` encerra o fluxo como hoje;
4. responder `Sim` abre as perguntas normais de sequence usando `<outDir>/<name>-01.png`;
5. cancelar a confirmacao da sequence nao desfaz o split;
6. o subcomando direto `konvert2snes split <input>` continua sem pergunta extra;
7. `konvert2snes examples` e `--help` continuam funcionando.

## Decisao aprovada
Seguir com a Opcao A.

A justificativa aprovada e que esta melhoria reaproveita o mesmo contexto da melhoria `combine -> convert`: o fluxo apenas encurta uma acao manual que o usuario ja faria pelo menu. Depois do split, o CLI pode usar o primeiro frame gerado como entrada do fluxo `sequence`, mantendo as perguntas normais de conversao e confirmacao.

## Proximo passo
Se aprovado, criar spec para a Opcao A antes de codar.
