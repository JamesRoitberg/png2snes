# Spec - Perguntar conversao apos combine no CLI

## Titulo
Encadear conversao opcional apos combine interativo.

## Tipo
ajuste de CLI

## Contexto
O item `BL-005` registra uma melhoria de usabilidade: depois de combinar partes em um PNG final, o usuario precisa abrir o menu de novo e escolher manualmente `1. Converter PNG para SNES`.

O planning em `docs/planning-cli-combine-convert-followup.md` aprovou a Opcao A: apos o combine interativo concluido, perguntar se o usuario quer converter o PNG final agora.

## Objetivo
No fluxo interativo `3. Combinar partes de um PNG/cenario`, perguntar apos o combine concluido se o usuario quer converter o PNG final gerado.

Se o usuario responder `sim`, o CLI deve reaproveitar o fluxo normal de conversao para o PNG final, pedindo as opcoes de conversao e confirmacao antes de executar.

## Nao mudar
- Nao mudar o subcomando direto `konvert2snes combine <file>`.
- Nao converter automaticamente sem pergunta.
- Nao mudar como `inferCombineFromPart` detecta partes e `outPath`.
- Nao mudar como `runCombineFlow` gera o PNG final.
- Nao mudar defaults, perguntas ou validacoes de `resolveConversionOptions`.
- Nao mudar o core de conversao.
- Nao mudar `sequence`, `split`, `priority`, `color` ou `analyze-map`.
- Nao adicionar dependencia.

## Funcionalidade envolvida
Fluxo interativo do menu principal para combine de partes.

### Entradas
- Escolha do menu: `3. Combinar partes de um PNG/cenario`.
- Tipo de combine:
  - `bg4-16`
  - `bg3-2bpp-4`
- Um arquivo PNG no formato `<stem>-partN.png`.
- Confirmacao atual de execucao do combine.
- Nova escolha `Sim` ou `Não` para converter o PNG final, apresentada como opcoes no menu, sem campo de texto livre.
- Se `sim`, respostas normais do fluxo de conversao:
  - tipo `bg` ou `sprite`
  - `bpp`
  - tile size ou sprite sizes
  - dedupe
  - `bg-pal-base`, quando aplicavel
  - confirmacao de execucao da conversao

### Saidas
Hoje, depois do combine:

- PNG final em `combineInfo.outPath`, normalmente `<stem>-final.png`.
- Logs/saida do script de combine.
- Comando equivalente do combine.
- O menu encerra quando o combine foi executado.

### Saidas desejadas
Depois do combine:

- Manter PNG final gerado exatamente como hoje.
- Manter comando equivalente do combine.
- Perguntar se deve converter o PNG final agora.
- Se responder `nao`, encerrar como hoje.
- Se responder `sim`, mostrar resumo da conversao do PNG final, pedir confirmacao e executar `runConvertFlow`.
- Se a conversao executar, imprimir comando equivalente de `convert` para o PNG final.
- Se o usuario cancelar a confirmacao da conversao, manter o combine concluido e encerrar sem converter.

### Quem chama hoje
- `openMainMenu` chama `runInteractiveCombine` quando a acao escolhida e `combine`.
- `runInteractiveCombine` usa:
  - `selectCombineType`
  - `selectPngFileFromDirectory`
  - `inferCombineFromPart`
  - `printPreview`
  - `printSummary`
  - `confirmExecution`
  - `runCombineFlow`
  - `printEquivalentCommand`
  - `buildCombineCommand`

### Quem depende hoje
- `bin/png2snes.js` abre `openMainMenu` quando o CLI roda sem argumentos.
- O subcomando direto `combine` em `bin/png2snes.js` usa `inferCombineFromPart` e `runCombineFlow`, mas nao passa por `runInteractiveCombine`.
- `src/cli/toolRunner.js` concentra a execucao real das tools.
- `src/cli/conversionOptions.js` concentra perguntas e defaults de conversao.

### Efeitos colaterais e mensagens de erro
- Se o combine falhar, a nova pergunta nao deve aparecer.
- Se o PNG final nao existir apos `runCombineFlow`, a conversao deve falhar com validacao clara antes de pedir opcoes ou executar conversao.
- Erros de conversao devem continuar capturados pelo `try/catch` de `openMainMenu` e impressos com `[konvert2snes] Erro: ...`.
- O comando equivalente do combine deve continuar visivel mesmo quando o usuario escolher converter depois.

### Impacto
Impacto restrito ao menu interativo. O core, os subcomandos diretos e os scripts auxiliares devem permanecer iguais.

## Arquivos para ler antes de editar
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/cli/conversionOptions.js`
- `src/cli/discovery.js`
- `bin/png2snes.js`
- `README.md`
- `docs/backlog.md`
- `docs/planning-cli-combine-convert-followup.md`

## Arquivos que devem ser alterados
- `src/cli/menu.js`

No fechamento validado:

- `docs/backlog.md`

Somente se for decidido documentar esta melhoria agora:

- `README.md`

## Estrategia
Fazer a menor mudanca possivel em `src/cli/menu.js`.

1. Criar uma funcao auxiliar pequena para converter um PNG ja conhecido.
   - Nome sugerido: `runInteractiveConvertKnownInput(inputPath)`.
   - Validar o arquivo com `validatePngFile(inputPath, "PNG final")`.
   - Chamar `resolveConversionOptions({ interactive: true })`.
   - Imprimir o mesmo resumo usado por `runInteractiveConvert`.
   - Chamar `confirmExecution`.
   - Se confirmado, chamar `runConvertFlow({ inputPath, options })`.
   - Imprimir `printEquivalentCommand(buildConversionCommand("convert", inputPath, options))`.
   - Retornar `true` quando converter e `false` quando o usuario cancelar a confirmacao da conversao.

2. Evitar duplicacao grande no fluxo de conversao.
   - Se ficar mais simples e seguro, `runInteractiveConvert` pode chamar a nova funcao auxiliar depois de selecionar o PNG.
   - Nao alterar perguntas nem defaults de conversao.

3. Criar uma pergunta de follow-up apos o combine.
   - Nome sugerido: `confirmConvertGeneratedPng`.
   - Pergunta sugerida: `Converter o PNG final agora?`
   - Usar selecao por opcoes (`Sim`/`Não`), nao input de texto.
   - Default sugerido: `true`, porque esse e o proximo passo comum, mas ainda exige confirmacao explicita.

4. Ajustar `runInteractiveCombine`.
   - Manter `runCombineFlow` no mesmo ponto.
   - Imprimir o comando equivalente de combine logo apos o combine, como hoje.
   - Depois perguntar se quer converter `combineInfo.outPath`.
   - Se `nao`, retornar `true`.
   - Se `sim`, chamar a funcao auxiliar de conversao com `combineInfo.outPath` e depois retornar `true`.
   - Cancelar a confirmacao da conversao nao deve voltar ao menu nem desfazer o combine.

5. Nao alterar o subcomando direto.
   - `bin/png2snes.js` deve permanecer igual nesta tarefa, salvo se a implementacao revelar necessidade inesperada.

## Risco de quebra
baixo

Motivo: a mudanca deve ficar concentrada em `src/cli/menu.js` e reutilizar funcoes existentes. O principal risco e alterar sem querer o comportamento do fluxo `Converter PNG para SNES`, caso a nova auxiliar seja compartilhada.

## Validacao manual
1. Validar subcomando direto sem pergunta extra:

```bash
node bin/konvert2snes.js combine to-convert/exemplo-part1.png
```

Resultado esperado:

- Executa o combine como antes.
- Nao pergunta se deve converter.
- Continua aceitando `--combine-type`.

2. Validar fluxo interativo com resposta `nao`:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `3. Combinar partes de um PNG/cenario`;
- selecionar tipo de combine;
- selecionar um `partN.png`;
- confirmar execucao;
- responder `nao` para converter o PNG final.

Resultado esperado:

- PNG final e gerado.
- Comando equivalente do combine e impresso.
- Nenhuma conversao roda.
- O fluxo encerra como antes.

3. Validar fluxo interativo com resposta `sim`:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `3. Combinar partes de um PNG/cenario`;
- confirmar o combine;
- responder `sim` para converter o PNG final;
- escolher opcoes normais de conversao;
- confirmar a conversao.

Resultado esperado:

- PNG final e gerado.
- Conversao roda usando esse PNG final.
- Arquivos de conversao sao gerados no mesmo padrao atual.
- Comando equivalente de `combine` e comando equivalente de `convert` aparecem.

4. Validar cancelamento da conversao:

Passos:

- repetir o fluxo com resposta `sim`;
- nas opcoes de conversao, chegar ao resumo;
- responder `nao` em `Executar agora?`.

Resultado esperado:

- Combine permanece concluido.
- Conversao nao roda.
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
4. atualizar `docs/backlog.md` para marcar `BL-005` como done se validado
5. parar
