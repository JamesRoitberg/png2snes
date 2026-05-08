# Spec - Perguntar conversao de sequencia apos split no CLI

## Titulo
Encadear conversao opcional de sequencia apos split interativo.

## Tipo
ajuste de CLI

## Contexto
O item `BL-006` registra uma melhoria de usabilidade: depois de splitar uma sheet em frames PNG numerados, o usuario precisa abrir o menu de novo e escolher manualmente `2. Converter animacao por sequencia de frames`.

O planning em `docs/planning-cli-split-sequence-followup.md` aprovou a Opcao A: apos o split interativo concluido, perguntar se o usuario quer converter a sequencia de frames gerada.

## Objetivo
No fluxo interativo `4. Splitar PNG em varios frames`, perguntar apos o split concluido se o usuario quer converter a sequencia gerada.

Se o usuario escolher `Sim`, o CLI deve usar o primeiro frame gerado como entrada do fluxo normal de sequence, pedindo as opcoes de conversao e confirmacao antes de executar.

## Nao mudar
- Nao mudar o subcomando direto `konvert2snes split <input>`.
- Nao converter automaticamente sem pergunta.
- Nao mudar como `tools/splitPng.js` gera frames.
- Nao mudar como `inferSequenceFromFrame` detecta frames.
- Nao mudar como `runSequenceFlow` valida dimensoes, paleta e frames.
- Nao mudar defaults, perguntas ou validacoes de `resolveConversionOptions`.
- Nao mudar o core de conversao.
- Nao mudar `convert`, `combine`, `priority`, `color` ou `analyze-map`.
- Nao adicionar dependencia.

## Funcionalidade envolvida
Fluxo interativo do menu principal para split de PNG em frames e conversao posterior por sequencia.

### Entradas
- Escolha do menu: `4. Splitar PNG em varios frames`.
- PNG indexado de entrada.
- Nome base de saida.
- `sepIndex`.
- Confirmacao atual de execucao do split.
- Nova escolha `Sim` ou `Não` para converter a sequencia, apresentada como opcoes no menu, sem campo de texto livre.
- Se `Sim`, respostas normais do fluxo de sequence:
  - tipo `bg` ou `sprite`
  - `bpp`
  - tile size ou sprite sizes
  - dedupe
  - `bg-pal-base`, quando aplicavel
  - confirmacao de execucao da sequence

### Saidas
Hoje, depois do split:

- Frames PNG em `splitInfo.outDir`, no formato `<name>-NN.png`.
- Comando equivalente do split.
- O menu encerra quando o split foi executado.

### Saidas desejadas
Depois do split:

- Manter frames gerados exatamente como hoje.
- Manter comando equivalente do split.
- Perguntar se deve converter a sequencia de frames agora.
- Se responder `Não`, encerrar como hoje.
- Se responder `Sim`, usar `<outDir>/<name>-01.png` como frame inicial.
- Mostrar preview e resumo da sequencia usando `inferSequenceFromFrame`, como o fluxo manual ja faz.
- Pedir confirmacao antes de executar `runSequenceFlow`.
- Se a sequence executar, imprimir comando equivalente de `sequence` para o primeiro frame.
- Se o usuario cancelar a confirmacao da sequence, manter o split concluido e encerrar sem converter.

### Quem chama hoje
- `openMainMenu` chama `runInteractiveSplit` quando a acao escolhida e `split`.
- `runInteractiveSplit` usa:
  - `selectPngFileFromDirectory`
  - `getSuggestedSplitName`
  - `parseInteger`
  - `printSummary`
  - `confirmExecution`
  - `runSplitFlow`
  - `printEquivalentCommand`
- `runInteractiveSequence` usa:
  - `inferSequenceFromFrame`
  - `printPreview`
  - `resolveConversionOptions`
  - `runSequenceFlow`
  - `buildConversionCommand`

### Quem depende hoje
- `bin/png2snes.js` abre `openMainMenu` quando o CLI roda sem argumentos.
- O subcomando direto `split` em `bin/png2snes.js` usa `runSplitFlow`, mas nao passa por `runInteractiveSplit`.
- O subcomando direto `sequence` usa `inferSequenceFromFrame` e `runSequenceFlow`.
- `src/cli/toolRunner.js` concentra a execucao real das tools.
- `src/cli/conversionOptions.js` concentra perguntas e defaults de conversao.
- `src/sequence.js` concentra descoberta, validacao e conversao da sequencia.

### Efeitos colaterais e mensagens de erro
- Se o split falhar, a nova pergunta nao deve aparecer.
- Se `<outDir>/<name>-01.png` nao existir apos `runSplitFlow`, a sequence nao deve iniciar; o erro deve ser claro pelo `validatePngFile`/`inferSequenceFromFrame`.
- Erros de sequence devem continuar capturados pelo `try/catch` de `openMainMenu` e impressos com `[konvert2snes] Erro: ...`.
- O comando equivalente do split deve continuar visivel mesmo quando o usuario escolher converter depois.

### Impacto
Impacto restrito ao menu interativo. O core, os subcomandos diretos e os scripts auxiliares devem permanecer iguais.

## Arquivos para ler antes de editar
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/cli/conversionOptions.js`
- `src/cli/discovery.js`
- `src/sequence.js`
- `tools/splitPng.js`
- `bin/png2snes.js`
- `README.md`
- `docs/backlog.md`
- `docs/planning-cli-split-sequence-followup.md`

## Arquivos que devem ser alterados
- `src/cli/menu.js`

No fechamento validado:

- `docs/backlog.md`

Somente se for decidido documentar esta melhoria agora:

- `README.md`

## Estrategia
Fazer a menor mudanca possivel em `src/cli/menu.js`.

1. Criar uma funcao auxiliar pequena para converter uma sequencia a partir de um frame ja conhecido.
   - Nome sugerido: `runInteractiveSequenceKnownFrame(inputPath)`.
   - Validar/inferir usando `inferSequenceFromFrame(inputPath)`.
   - Imprimir preview com `printPreview`, igual `runInteractiveSequence`.
   - Chamar `resolveConversionOptions({ interactive: true })`.
   - Imprimir o mesmo resumo usado por `runInteractiveSequence`.
   - Chamar `confirmExecution`.
   - Se confirmado, chamar `runSequenceFlow({ sequenceInfo, options })`.
   - Imprimir `printEquivalentCommand(buildConversionCommand("sequence", inputPath, options))`.
   - Retornar `true` quando converter e `false` quando o usuario cancelar a confirmacao da sequence.

2. Evitar duplicacao grande no fluxo de sequence.
   - `runInteractiveSequence` deve selecionar o frame e chamar a nova auxiliar.
   - Nao alterar perguntas nem defaults de conversao.

3. Criar uma pergunta de follow-up apos o split.
   - Nome sugerido: `confirmConvertSplitSequence`.
   - Pergunta sugerida: `Converter a sequência de frames agora?`
   - Usar selecao por opcoes (`Sim`/`Não`), nao input de texto.
   - Default sugerido: `true`, porque esse e o proximo passo comum, mas ainda exige escolha explicita.

4. Inferir o primeiro frame gerado.
   - Como o split interativo nao pergunta `pad`, usar o default atual do script: `2`.
   - Caminho esperado: `path.join(splitInfo.outDir, `${answers.name}-01.png`)`.
   - Usar esse frame apenas depois de `runSplitFlow` concluir.

5. Ajustar `runInteractiveSplit`.
   - Manter `runSplitFlow` no mesmo ponto.
   - Imprimir o comando equivalente de split logo apos o split, como hoje.
   - Depois perguntar se quer converter a sequencia.
   - Se `Não`, retornar `true`.
   - Se `Sim`, chamar a funcao auxiliar de sequence com o primeiro frame e depois retornar `true`.
   - Cancelar a confirmacao da sequence nao deve voltar ao menu nem desfazer o split.

6. Nao alterar o subcomando direto.
   - `bin/png2snes.js` deve permanecer igual nesta tarefa, salvo se a implementacao revelar necessidade inesperada.

## Risco de quebra
baixo

Motivo: a mudanca deve ficar concentrada em `src/cli/menu.js` e reutilizar funcoes existentes. O principal risco e inferir incorretamente o primeiro frame se o formato de saida do split interativo mudar no futuro.

## Validacao manual
1. Validar subcomando direto sem pergunta extra:

```bash
node bin/konvert2snes.js split /tmp/exemplo-sheet.png --name exemplo --sepIndex 0 --out-dir /tmp/png2snes-split-check
```

Resultado esperado:

- Executa o split como antes.
- Nao pergunta se deve converter a sequencia.

2. Validar fluxo interativo com resposta `Não`:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `4. Splitar PNG em varios frames`;
- selecionar um PNG de sheet;
- confirmar execucao;
- responder `Não` para converter a sequencia.

Resultado esperado:

- Frames sao gerados.
- Comando equivalente do split e impresso.
- Nenhuma sequence roda.
- O fluxo encerra como antes.

3. Validar fluxo interativo com resposta `Sim`:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `4. Splitar PNG em varios frames`;
- confirmar o split;
- responder `Sim` para converter a sequencia;
- escolher opcoes normais de sequence;
- confirmar a sequence.

Resultado esperado:

- Frames sao gerados.
- Sequence roda usando o primeiro frame gerado.
- Arquivos de conversao da sequencia sao gerados no mesmo padrao atual.
- Comando equivalente de `split` e comando equivalente de `sequence` aparecem.

4. Validar cancelamento da sequence:

Passos:

- repetir o fluxo com resposta `Sim`;
- nas opcoes de sequence, chegar ao resumo;
- responder `Não` em `Executar agora?`.

Resultado esperado:

- Split permanece concluido.
- Sequence nao roda.
- Fluxo encerra sem erro.

5. Validar comandos basicos:

```bash
node bin/konvert2snes.js examples
node bin/konvert2snes.js --help
```

Resultado esperado:

- Saida continua funcionando.
- Menu e subcomandos continuam listados como antes.

## Etapas
1. analise e leitura dos arquivos envolvidos
2. mudanca pequena em `src/cli/menu.js`
3. validacao manual/smoke test
4. atualizar `docs/backlog.md` para marcar `BL-006` como done se validado
5. parar
