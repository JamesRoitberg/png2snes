# Spec - Identidade visual textual do CLI

## Titulo
Adicionar banner textual compacto ao `Konvert2Snes`.

## Tipo
melhoria

## Contexto
O item `BL-017` registra a ideia de criar uma identidade visual textual para os CLIs das ferramentas.

O planning em `docs/planning-cli-textual-identity.md` aprovou a Opcao B: mostrar um banner ASCII compacto em pontos humanos do CLI, sem entrar automaticamente nos comandos diretos de conversao.

## Objetivo
Adicionar uma identidade visual textual inicial ao `Konvert2Snes`, com:

- nome da ferramenta em formato de banner legivel;
- 3 cores ANSI simples quando o terminal aceitar cor;
- assinatura discreta `by J.Roitberg`;
- exibicao no menu interativo;
- exibicao no help principal;
- exibicao no comando `examples`;
- nenhuma dependencia nova.

## Nao mudar
- Nao alterar conversao, sequence, combine, split, priority, color ou analyze-map.
- Nao alterar arquivos gerados, nomes de arquivos, diretorios de saida ou formatos.
- Nao alterar defaults de opcoes do CLI.
- Nao alterar mensagens de erro existentes fora do ponto de exibicao do banner.
- Nao remover nem mudar a compatibilidade do alias legado `png2snes`.
- Nao adicionar banner em conversoes diretas por padrao.
- Nao adicionar dependencia de banner/figlet.
- Nao aplicar ainda a mesma mudanca em `GT-1 Tone Maker` ou `Kombat Kreator`; isso deve ser feito depois, em cada produto.
- Nao forcar cor quando stdout nao for TTY ou quando `NO_COLOR` estiver definido.

## Funcionalidade envolvida
Entrada visual do CLI principal.

### Entradas
- Execucao sem argumentos:

```bash
node bin/konvert2snes.js
```

- Help principal:

```bash
node bin/konvert2snes.js --help
node bin/konvert2snes.js help
```

- Exemplos:

```bash
node bin/konvert2snes.js examples
```

- Alias legado, quando chamado pelos mesmos fluxos:

```bash
node bin/png2snes.js
node bin/png2snes.js --help
node bin/png2snes.js examples
```

### Saidas
Hoje:

- o menu interativo abre direto em `Selecione uma acao:`;
- o help principal mostra somente a saida do `commander`;
- `examples` mostra `[konvert2snes] Exemplos:`;
- comandos diretos mostram resumo, preview, erros ou saidas proprias do fluxo.

### Saidas desejadas
Depois da mudanca:

- o menu interativo mostra o banner uma vez antes do prompt;
- o help principal mostra o banner antes da saida do `commander`;
- o comando `examples` mostra o banner antes da lista de exemplos;
- o alias legado `png2snes` usa a identidade principal `Konvert2Snes`;
- comandos diretos de trabalho continuam sem banner automatico.

Banner aprovado para a primeira versao:

```txt
 _  __                          _   ____  ____  _   _ _____ ____
| |/ /___  _ ____   _____ _ __ | |_|___ \/ ___|| \ | | ____/ ___|
| ' // _ \| '_ \ \ / / _ \ '__|| __| __) \___ \|  \| |  _| \___ \
| . \ (_) | | | \ V /  __/ |   | |_ / __/ ___) | |\  | |___ ___) |
|_|\_\___/|_| |_|\_/ \___|_|    \__|_____|____/|_| \_|_____|____/
by J.Roitberg
```

Esquema de cor aprovado:

- `Konvert`: claro, usando branco/branco forte ANSI;
- `2`: vermelho ANSI;
- `SNES`: cinza ANSI;
- `by J.Roitberg`: cinza ANSI.

Quando cor nao estiver habilitada, a saida deve cair para o mesmo banner sem codigos ANSI.

### Quem chama hoje
- `bin/konvert2snes.js` importa `bin/png2snes.js`.
- `bin/png2snes.js` decide entre menu interativo, help, comandos do hub e fluxo legado.
- `src/cli/menu.js` exporta `openMainMenu()`, usado quando nao ha argumentos.
- `bin/png2snes.js` tem `printExamples()` para o comando direto `examples`.
- `src/cli/menu.js` tem outro `printExamples()` para a opcao interativa de exemplos.

### Quem depende hoje
- Usuarios que chamam o CLI principal `konvert2snes`.
- Usuarios/scripts que ainda chamam o alias legado `png2snes`.
- Fluxos interativos que dependem de `src/cli/menu.js`.
- Help principal gerado pelo `commander`.
- Scripts ou usuarios que chamam comandos diretos como `convert`, `sequence`, `combine`, `split`, `priority`, `color` e `analyze-map`.

### Efeitos colaterais e mensagens de erro
- A mudanca adiciona texto em stdout antes do menu, help principal e examples.
- Nao deve adicionar texto antes de conversoes diretas.
- Nao deve alterar stderr nem formato das mensagens de erro.
- Nao deve criar arquivos.
- Nao deve mudar comandos equivalentes impressos pelo menu.

### Impacto
Impacto visual restrito aos fluxos humanos de entrada/leitura.

O principal cuidado e evitar poluir saida de comandos de trabalho, porque esses podem ser usados em scripts ou comparacoes de log.

## Arquivos para ler antes de editar
- `package.json`
- `bin/konvert2snes.js`
- `bin/png2snes.js`
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `docs/planning-cli-textual-identity.md`
- `docs/backlog.md`

## Arquivos que devem ser alterados
- novo arquivo `src/cli/identity.js`
- `bin/png2snes.js`
- `src/cli/menu.js`

No fechamento validado:

- `docs/backlog.md`

## Estrategia
Fazer uma implementacao pequena e isolada.

1. Criar `src/cli/identity.js`.

Responsabilidade do modulo:

- manter o banner textual aprovado;
- manter o esquema de 3 cores aprovado;
- detectar quando deve imprimir sem cor;
- exportar uma funcao pequena para imprimir o banner;
- nao conhecer regras de conversao;
- nao importar dependencias externas.

Forma sugerida:

```js
export const KONVERT2SNES_IDENTITY = `...`;

export function printKonvert2SnesIdentity(stream = process.stdout) {
  stream.write(`${formatKonvert2SnesIdentity(stream)}\n\n`);
}
```

O modulo deve preservar uma versao sem cor e aplicar ANSI somente quando:

- `stream.isTTY` for verdadeiro;
- `process.env.NO_COLOR` nao estiver definido.

Nao adicionar flags novas nesta primeira versao.

2. Integrar no menu interativo.

Em `src/cli/menu.js`, chamar `printKonvert2SnesIdentity()` uma vez no inicio de `openMainMenu()`, antes do loop de prompt.

3. Integrar no help principal.

Em `bin/png2snes.js`, quando `firstArg` for `-h`, `--help` ou `help`, imprimir o banner antes de `createHelpProgram().outputHelp()`.

4. Integrar no comando `examples`.

Em `bin/png2snes.js`, no subcomando `examples`, imprimir o banner antes de `printExamples()`.

5. Preservar comandos diretos.

Nao chamar o banner em:

- `convert`;
- `sequence`;
- `combine`;
- `split`;
- `priority`;
- `color`;
- `analyze-map`;
- fluxo legado com imagem direta;
- `runPng2Snes()`;
- `runSequence()`;
- `src/index.js`;
- `src/cli/toolRunner.js`.

6. Nao mexer ainda nos outros produtos.

Registrar no fechamento que `GT-1 Tone Maker` e `Kombat Kreator` devem receber specs proprias depois, usando este padrao como base.

## Risco de quebra
baixo

Motivo: a mudanca fica em um modulo novo e em pontos de exibicao bem delimitados. O risco principal e imprimir o banner onde nao deve; a validacao deve comparar menu/help/examples contra comandos diretos.

## Validacao manual
1. Validar sintaxe dos arquivos alterados:

```bash
node --check src/cli/identity.js
node --check src/cli/menu.js
node --check bin/png2snes.js
```

Resultado esperado:

- todos passam sem erro de sintaxe.

2. Validar menu interativo:

```bash
node bin/konvert2snes.js
```

Resultado esperado:

- banner aparece uma vez;
- em terminal com cor, `Konvert` aparece claro, `2` vermelho e `SNES`/assinatura em cinza;
- depois aparece `Selecione uma acao:`;
- sair pelo menu continua funcionando.

3. Validar help principal:

```bash
node bin/konvert2snes.js --help
node bin/konvert2snes.js help
```

Resultado esperado:

- banner aparece antes do help;
- em terminal com cor, usa o esquema de 3 cores aprovado;
- help continua listando comandos e opcoes.

4. Validar examples:

```bash
node bin/konvert2snes.js examples
```

Resultado esperado:

- banner aparece antes de `[konvert2snes] Exemplos:`;
- em terminal com cor, usa o esquema de 3 cores aprovado;
- exemplos continuam iguais.

5. Validar alias legado:

```bash
node bin/png2snes.js --help
node bin/png2snes.js examples
```

Resultado esperado:

- alias continua funcionando;
- identidade exibida continua sendo `Konvert2Snes`.

6. Validar fallback sem cor:

```bash
NO_COLOR=1 node bin/konvert2snes.js --help
```

Resultado esperado:

- banner aparece sem codigos ANSI;
- help continua funcionando.

7. Validar que conversao direta nao ganhou banner:

```bash
node bin/konvert2snes.js convert to-convert/temple-bg3-final.png --tipo bg --bpp 2 --tile-size 8x8 --bg-pal-base 1 --out-dir /tmp/png2snes-identity-check --no-interactive --no-print-vram-layout
```

Resultado esperado:

- comando nao imprime o banner;
- resumo/conversao continuam no formato atual;
- arquivos continuam sendo gerados em `/tmp/png2snes-identity-check/converted`.

## Etapas
1. spec
2. aprovacao da spec
3. mudanca pequena em `src/cli/identity.js`, `src/cli/menu.js` e `bin/png2snes.js`
4. validacao manual
5. atualizar `docs/backlog.md` para mover `BL-017` para concluido
6. parar
