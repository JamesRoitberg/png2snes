# Spec - Perguntar prioridade apos conversao no CLI

## Titulo
Encadear aplicacao opcional de prioridade apos conversao BG interativa.

## Tipo
ajuste de CLI

## Contexto
O item `BL-007` registra uma melhoria de usabilidade: depois de converter um BG para SNES, o usuario precisa abrir o menu de novo e escolher manualmente `5. Aplicar prioridade de BG`.

O planning em `docs/planning-cli-convert-priority-followup.md` aprovou a Opcao A: apos uma conversao BG interativa concluida, perguntar se o usuario quer aplicar prioridade de BG.

## Objetivo
No fluxo interativo `1. Converter PNG para SNES`, perguntar apos uma conversao BG concluida se o usuario quer aplicar prioridade de BG.

Se o usuario escolher `Sim`, o CLI deve reaproveitar o fluxo normal de prioridade usando:

- PNG base: o PNG de entrada da conversao;
- MAP: o `.map` gerado pela conversao em `converted/<stem>.map`;
- saida: `converted/<stem>-pri.map`;
- mascara: caminho inferido, ou perguntado manualmente se nao for encontrado.

## Nao mudar
- Nao perguntar prioridade apos conversao de sprite.
- Nao mudar o subcomando direto `konvert2snes convert <input>`.
- Nao aplicar prioridade automaticamente sem pergunta.
- Nao mudar como `runPng2Snes` gera assets.
- Nao mudar como `tools/bgPriority.js` aplica prioridade.
- Nao mudar como `inferPriorityFromPng` funciona para o fluxo manual atual.
- Nao mudar defaults, perguntas ou validacoes de `resolveConversionOptions`.
- Nao mudar `sequence`, `combine`, `split`, `color` ou `analyze-map`.
- Nao adicionar dependencia.

## Funcionalidade envolvida
Fluxo interativo de conversao de PNG para SNES e fluxo interativo de prioridade de BG.

### Entradas
- Escolha do menu: `1. Converter PNG para SNES`.
- PNG indexado de entrada.
- Opcoes normais de conversao:
  - tipo `bg` ou `sprite`;
  - `bpp`;
  - tile size ou sprite sizes;
  - dedupe;
  - `bg-pal-base`, quando aplicavel;
  - confirmacao de execucao da conversao.
- Nova escolha `Sim` ou `Não` para aplicar prioridade, apresentada como opcoes no menu, sem campo de texto livre.
- Se `Sim`, mascara inferida ou caminho de mascara informado manualmente.
- Confirmacao final da prioridade.

### Saidas
Hoje, depois da conversao BG:

- Assets em `<baseOutDir>/converted/<stem>.*`.
- Para BG, pelo menos `.chr`, `.map`, `.pal`, `.gpl` e `-tileset.png`.
- Comando equivalente da conversao.
- O menu encerra quando a conversao foi executada.

### Saidas desejadas
Depois da conversao BG:

- Manter assets gerados exatamente como hoje.
- Manter comando equivalente da conversao.
- Perguntar se deve aplicar prioridade de BG agora.
- Se responder `Não`, encerrar como hoje.
- Se responder `Sim`, mostrar resumo da prioridade, pedir confirmacao e executar `runPriorityFlow`.
- Se a prioridade executar, gerar `converted/<stem>-pri.map`.
- Se a prioridade executar, imprimir comando equivalente de `priority`.
- Se o usuario cancelar a confirmacao da prioridade, manter a conversao concluida e encerrar sem gerar `-pri.map`.

### Quem chama hoje
- `openMainMenu` chama `runInteractiveConvert` quando a acao escolhida e `convert`.
- `runInteractiveConvert` seleciona o PNG e chama `runInteractiveConvertKnownInput`.
- `runInteractiveConvertKnownInput` hoje:
  - valida o PNG;
  - chama `resolveConversionOptions({ interactive: true })`;
  - mostra resumo;
  - pede confirmacao;
  - chama `runConvertFlow`;
  - imprime comando equivalente.
- `openMainMenu` chama `runInteractivePriority` quando a acao escolhida e `priority`.
- `runInteractivePriority` hoje:
  - seleciona um PNG base;
  - chama `inferPriorityFromPng`;
  - pede mascara/map manualmente quando necessario;
  - mostra resumo;
  - pede confirmacao;
  - chama `runPriorityFlow`;
  - imprime comando equivalente.

### Quem depende hoje
- `bin/png2snes.js` abre `openMainMenu` quando o CLI roda sem argumentos.
- O subcomando direto `convert` em `bin/png2snes.js` usa `runConvertFlow`, mas nao passa por `runInteractiveConvertKnownInput`.
- O subcomando direto `priority` usa `inferPriorityFromPng` e `runPriorityFlow`.
- `src/index.js` define o contrato atual de saida da conversao:
  - `baseOutDir = options.outDir ?? path.dirname(inputPath)`;
  - `outDir = path.join(baseOutDir, "converted")`;
  - `outBase = path.join(outDir, stem)`.
- `src/cli/discovery.js` valida PNG/MAP e infere mascara para o fluxo manual.
- `src/cli/toolRunner.js` concentra a execucao real das tools.

### Efeitos colaterais e mensagens de erro
- Se a conversao for cancelada, a pergunta de prioridade nao deve aparecer.
- Se a conversao falhar, a pergunta de prioridade nao deve aparecer.
- Se a conversao for sprite, a pergunta de prioridade nao deve aparecer.
- Se o `.map` esperado nao existir apos a conversao BG, a prioridade nao deve executar; o erro deve ser claro.
- Se nenhuma mascara for inferida, o CLI deve pedir o caminho manualmente, como o fluxo manual ja faz.
- Erros de prioridade devem continuar capturados pelo `try/catch` de `openMainMenu` e impressos com `[konvert2snes] Erro: ...`.
- O comando equivalente da conversao deve continuar visivel mesmo quando o usuario escolher aplicar prioridade depois.

### Impacto
Impacto restrito ao menu interativo. O core, os subcomandos diretos e os scripts auxiliares devem permanecer iguais.

Se a conversao for chamada a partir do follow-up `combine -> convert`, este novo follow-up tambem pode aparecer depois da conversao BG, criando a cadeia:

```text
combine -> convert -> priority
```

Isso e desejado, desde que cada etapa continue exigindo escolha explicita e confirmacao antes de executar.

## Arquivos para ler antes de editar
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/cli/conversionOptions.js`
- `src/cli/discovery.js`
- `src/index.js`
- `tools/bgPriority.js`
- `bin/png2snes.js`
- `README.md`
- `docs/backlog.md`
- `docs/planning-cli-convert-priority-followup.md`

## Arquivos que devem ser alterados
- `src/cli/menu.js`

No fechamento validado:

- `docs/backlog.md`

Somente se for decidido documentar esta melhoria agora:

- `README.md`

## Estrategia
Fazer a menor mudanca possivel em `src/cli/menu.js`.

1. Criar uma pergunta de follow-up apos conversao BG.
   - Nome sugerido: `confirmApplyPriorityAfterConvert`.
   - Pergunta sugerida: `Aplicar prioridade de BG agora?`
   - Usar selecao por opcoes (`Sim`/`Não`), nao input de texto.
   - Default sugerido: `true`, porque esse e um proximo passo comum, mas ainda exige escolha explicita.

2. Criar um helper para inferir os caminhos gerados pela conversao.
   - Nome sugerido: `getConvertedBgPaths(inputPath, options)`.
   - Regra:
     - `baseOutDir = options.outDir ? path.resolve(options.outDir) : path.dirname(inputPath)`;
     - `convertedDir = path.join(baseOutDir, "converted")`;
     - `stem = path.basename(inputPath, ".png")`;
     - `mapPath = path.join(convertedDir, `${stem}.map`)`;
     - `outPath = path.join(convertedDir, `${stem}-pri.map`)`.
   - Nao alterar `runPng2Snes` para retornar caminhos nesta etapa.

3. Criar um helper pequeno para inferir mascara.
   - Nome sugerido: `findPriorityMaskForConvertedBg(inputPath, convertedDir)`.
   - Candidatos, nesta ordem:
     - ao lado do PNG de entrada:
       - `<stem>-priority.png`
       - `<stem>-prio.png`
     - dentro de `converted/`:
       - `<stem>-priority.png`
       - `<stem>-prio.png`
   - Se nenhum existir, retornar `null` e deixar o fluxo pedir manualmente.

4. Criar uma funcao auxiliar para aplicar prioridade com contexto conhecido.
   - Nome sugerido: `runInteractivePriorityKnownContext({ pngPath, mapPath, outPath, maskPath })`.
   - Validar `pngPath` com `validatePngFile`.
   - Validar `mapPath` com `validateMapFile`.
   - Se `maskPath` existir, validar com `validatePngFile`.
   - Se `maskPath` nao existir, pedir `Máscara PNG` manualmente com prompt `input`, reaproveitando validacao atual.
   - Mostrar resumo da prioridade de BG.
   - Chamar `confirmExecution`.
   - Se confirmado, chamar `runPriorityFlow` com `layout: "auto"`.
   - Imprimir comando equivalente de `priority`.
   - Retornar `true` quando aplicar prioridade e `false` quando o usuario cancelar a confirmacao.

5. Evitar duplicacao grande no fluxo manual de prioridade.
   - Se ficar simples e seguro, `runInteractivePriority` pode passar a chamar `runInteractivePriorityKnownContext` depois de resolver seus caminhos.
   - Nao alterar mensagens, validacoes ou comportamento do fluxo manual alem dessa deduplicacao pequena.

6. Ajustar `runInteractiveConvertKnownInput`.
   - Depois de `runConvertFlow` e do comando equivalente de convert:
     - se `options.tipo !== "bg"`, retornar `true`;
     - perguntar `Aplicar prioridade de BG agora?`;
     - se `Não`, retornar `true`;
     - se `Sim`, inferir `mapPath`, `outPath` e `maskPath`;
     - chamar `runInteractivePriorityKnownContext`.
   - Cancelar a confirmacao da prioridade nao deve voltar ao menu nem desfazer a conversao.

7. Nao alterar subcomandos diretos.
   - `bin/png2snes.js` deve permanecer igual nesta tarefa, salvo se a implementacao revelar necessidade inesperada.

## Risco de quebra
baixo-medio

Motivo: a mudanca deve ficar concentrada em `src/cli/menu.js`, mas precisa reproduzir o contrato de saida da conversao para encontrar o `.map` em `converted/`.

## Validacao manual
1. Validar subcomando direto sem pergunta extra:

```bash
node bin/konvert2snes.js convert /tmp/exemplo-bg.png --tipo bg --bpp 4 --tile-size 8x8 --bg-pal-base 0 --no-interactive
```

Resultado esperado:

- Executa a conversao como antes.
- Nao pergunta se deve aplicar prioridade.

2. Validar fluxo interativo BG com resposta `Não`:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `1. Converter PNG para SNES`;
- selecionar um PNG BG;
- escolher opcoes de BG;
- confirmar conversao;
- responder `Não` para prioridade.

Resultado esperado:

- Assets de conversao sao gerados.
- Comando equivalente de convert e impresso.
- Nenhuma prioridade roda.
- O fluxo encerra como antes.

3. Validar fluxo interativo BG com resposta `Sim` e mascara existente:

Preparar junto ao PNG de entrada uma mascara `<stem>-priority.png` ou `<stem>-prio.png`.

Passos:

- escolher `1. Converter PNG para SNES`;
- confirmar conversao BG;
- responder `Sim` para prioridade;
- confirmar aplicacao de prioridade.

Resultado esperado:

- `.map` gerado em `converted/<stem>.map` e usado como entrada.
- mascara inferida automaticamente.
- `converted/<stem>-pri.map` e gerado.
- Comando equivalente de convert e comando equivalente de priority aparecem.

4. Validar fluxo interativo BG com mascara manual:

Passos:

- repetir o fluxo sem mascara inferivel;
- responder `Sim` para prioridade;
- informar manualmente uma mascara PNG valida;
- cancelar em `Executar agora?`.

Resultado esperado:

- Conversao permanece concluida.
- Prioridade nao roda.
- Nenhum `-pri.map` novo e gerado.

5. Validar conversao sprite:

Passos:

- escolher `1. Converter PNG para SNES`;
- escolher `Sprite`;
- confirmar conversao.

Resultado esperado:

- Nao pergunta prioridade.

6. Validar comandos basicos:

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
4. atualizar `docs/backlog.md` para marcar `BL-007` como done se validado
5. parar
