# Spec - Default interativo de dedupe horizontal

## Titulo
Mudar default interativo de dedupe de BG para horizontal.

## Tipo
ajuste de CLI

## Contexto
O item `BL-011` registra uma melhoria de usabilidade no fluxo interativo de conversao BG.

Hoje, quando o usuario converte um BG pelo menu interativo e nao informou `--dedupe`, a pergunta `Deduplicação de tiles:` vem com `Simples (idênticos)` como opcao padrao. O uso mais comum no fluxo atual passou a ser `Horizontal (flip X)`, selecionado manualmente.

## Objetivo
No prompt interativo de conversao BG, deixar `Horizontal (flip X)` pre-selecionado por padrao.

## Nao mudar
- Nao mudar o comportamento de comandos diretos com `--dedupe` explicito.
- Nao mudar o fallback interno usado quando nenhuma opcao interativa define dedupe.
- Nao mudar o modo nao interativo.
- Nao mudar a ordem, os nomes ou os valores das opcoes de dedupe.
- Nao mudar dedupe de sprite, que deve continuar `none`.
- Nao mudar a implementacao real de deduplicacao em `src/dedup.js`.
- Nao mudar formatos de saida, nomes de arquivos gerados ou mensagens de erro.
- Nao adicionar dependencia.

## Funcionalidade envolvida
Resolucao das opcoes de conversao no CLI, especificamente o prompt de dedupe para conversao `bg` em modo interativo.

### Entradas
- Opcao `tipo`, informada por flag ou escolhida no prompt.
- Opcao `dedupe`, informada por `--dedupe` ou ausente.
- Estado de interatividade do comando:
  - interativo: `opts.interactive !== false`;
  - nao interativo: `--no-interactive`.

### Saidas
Hoje, quando `tipo === "bg"`, o fluxo e interativo e `opts.dedupe` esta ausente:

- o prompt `Deduplicação de tiles:` aparece;
- a opcao pre-selecionada e `Simples (idênticos)`;
- se o usuario apenas confirma, `finalOpts.dedupe` fica `simple`.

Quando `opts.dedupe` esta definido:

- o prompt de dedupe nao aparece;
- o valor informado e preservado.

Quando `tipo === "sprite"`:

- `finalOpts.dedupe` termina como `none`.

### Saidas desejadas
Quando `tipo === "bg"`, o fluxo e interativo e `opts.dedupe` esta ausente:

- o prompt `Deduplicação de tiles:` continua aparecendo;
- a opcao pre-selecionada passa a ser `Horizontal (flip X)`;
- se o usuario apenas confirma, `finalOpts.dedupe` fica `h`.

Os demais casos devem continuar iguais:

- `--dedupe simple` continua resultando em `simple`;
- `--dedupe h` continua resultando em `h`;
- modo nao interativo sem `--dedupe` continua usando o fallback atual `simple`;
- sprite continua terminando com `dedupe: "none"`.

### Quem chama hoje
- `bin/png2snes.js` chama `resolveConversionOptions(opts)` nos subcomandos diretos `convert` e `sequence`.
- `src/cli/menu.js` chama `resolveConversionOptions({ interactive: true })` nos fluxos interativos de conversao.
- `src/cli/menu.js` tambem monta o comando equivalente incluindo `--dedupe` quando a opcao existe.

### Quem depende hoje
- `src/index.js` recebe `options.dedupe` em `runPng2Snes` e usa `options.dedupe || "simple"` antes de chamar `dedupeTiles`.
- `src/dedup.js` implementa os modos `none`, `simple`, `h`, `v` e `full`.
- Fluxos de `combine -> convert` e `split -> sequence` podem passar pelo mesmo prompt de conversao interativa.

### Efeitos colaterais e mensagens de erro
- Esta mudanca nao deve criar novos arquivos por si so.
- Esta mudanca nao deve alterar erros de validacao.
- A mudanca pode alterar o resultado gerado somente quando o usuario confirmar o prompt interativo de BG sem trocar a opcao pre-selecionada.
- O comando equivalente impresso pelo menu deve refletir o dedupe resolvido, portanto deve passar a mostrar `--dedupe h` nesse caso.

### Impacto
Impacto restrito ao default visual/comportamental do prompt interativo de BG quando `--dedupe` nao foi informado.

Nao ha impacto desejado no core de conversao, nos subcomandos diretos com flags explicitas, no modo nao interativo, nem em sprite.

## Arquivos para ler antes de editar
- `src/cli/conversionOptions.js`
- `src/cli/menu.js`
- `bin/png2snes.js`
- `src/index.js`
- `src/dedup.js`
- `docs/backlog.md`

## Arquivos que devem ser alterados
- `src/cli/conversionOptions.js`

No fechamento validado:

- `docs/backlog.md`

## Estrategia
Fazer a menor mudanca possivel em `src/cli/conversionOptions.js`.

1. No prompt de dedupe para `tipo === "bg"` e modo interativo, trocar somente:

```js
default: "simple"
```

por:

```js
default: "h"
```

2. Manter intacta a lista de choices:

- `none`;
- `simple`;
- `h`;
- `v`;
- `full`.

3. Manter intacto o fallback final:

```js
dedupe: answers.dedupe ?? opts.dedupe ?? "simple"
```

Esse fallback preserva o comportamento atual para casos nao interativos ou sem resposta de prompt.

4. Nao alterar `src/index.js` nem `src/dedup.js`.

## Risco de quebra
baixo

Motivo: a alteracao deve ficar concentrada em uma propriedade `default` do prompt interativo. O risco principal e mudar sem querer o default de comandos nao interativos; a estrategia evita isso mantendo o fallback atual.

## Validacao manual
1. Validar fluxo interativo BG:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `1. Converter PNG para SNES`;
- selecionar um PNG de BG;
- escolher `Background (BG)`;
- chegar na pergunta `Deduplicação de tiles:`;
- apenas confirmar a opcao pre-selecionada.

Resultado esperado:

- a opcao pre-selecionada e `Horizontal (flip X)`;
- o resumo/comando equivalente mostra `--dedupe h`;
- a conversao gera os mesmos tipos de arquivos de antes.

2. Validar flag explicita:

```bash
node bin/konvert2snes.js convert to-convert/temple-bg3-final.png --tipo bg --bpp 2 --tile-size 8x8 --dedupe simple --bg-pal-base 1 --out-dir /tmp/png2snes-dedupe-simple --no-print-vram-layout
```

Resultado esperado:

- o comando nao pergunta dedupe;
- o resumo usa `simple`;
- a conversao respeita `--dedupe simple`.

3. Validar modo nao interativo sem `--dedupe`:

```bash
node bin/konvert2snes.js convert to-convert/temple-bg3-final.png --tipo bg --bpp 2 --tile-size 8x8 --bg-pal-base 1 --out-dir /tmp/png2snes-dedupe-no-interactive --no-interactive --no-print-vram-layout
```

Resultado esperado:

- o comando nao pergunta dedupe;
- o fallback continua `simple`.

4. Validar sprite:

```bash
node bin/konvert2snes.js convert to-convert/algum-sprite.png --tipo sprite --bpp 4 --sprite-sizes 8x8,16x16 --no-interactive
```

Resultado esperado:

- sprite continua usando `dedupe: none`;
- nenhum prompt de dedupe de BG aparece.

## Etapas
1. analise e spec
2. aprovacao da spec
3. mudanca pequena em `src/cli/conversionOptions.js`
4. validacao manual
5. atualizar `docs/backlog.md` para mover `BL-011` para concluido
6. parar
