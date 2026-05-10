# Planning - Identidade visual textual dos CLIs

## Titulo
Criar logo/banner textual compartilhado para os CLIs.

## Tipo
melhoria de UX

## Problema percebido
Os CLIs ainda nao tem uma assinatura visual propria no terminal. Hoje eles funcionam, mas a entrada visual e bem utilitaria: menus, exemplos, mensagens com prefixo e help padrao.

A ideia e criar algo com identidade, legivel e legal, parecido com banners/logos textuais vistos em outras ferramentas de linha de comando, mantendo uma assinatura pequena do autor.

Este planning corresponde ao item `BL-017` do backlog.

## Fluxo atual
Neste repositorio:

- `package.json` expoe `konvert2snes` como comando principal e mantem `png2snes` como alias legado.
- `bin/konvert2snes.js` apenas importa `bin/png2snes.js`.
- `bin/png2snes.js` decide entre menu interativo, help, comandos do hub e fluxo legado.
- sem argumentos, o CLI chama `openMainMenu()` e mostra direto o prompt `Selecione uma acao:`.
- `--help`, `help` e subcomandos usam saida do `commander`.
- exemplos e erros usam prefixos como `[konvert2snes]`.
- nao existe hoje um modulo de identidade visual/banner.

Fora deste repositorio, a intencao e usar a mesma familia visual em outras ferramentas, como `GT-1 Tone Maker` e `Kombat Kreator`/`Kombat Creator`.

## Objetivo
Definir uma direcao segura para:

- criar uma identidade visual textual compartilhada para os CLIs;
- manter o nome de cada ferramenta claro e legivel;
- incluir uma assinatura pequena, como `by J.Roitberg` ou `J.Roitberg`;
- decidir onde o banner deve aparecer sem atrapalhar o uso normal;
- permitir replicar o padrao em outros produtos depois;
- evitar dependencia nova se um banner fixo resolver bem.

## Restricoes
- Nao alterar conversao, arquivos gerados, formatos de saida ou comportamento das tools.
- Nao quebrar compatibilidade do alias legado `png2snes`.
- Nao imprimir banner em fluxos que possam ser usados por scripts de forma inesperada, a menos que isso seja aprovado explicitamente.
- Nao adicionar dependencia nova sem necessidade clara.
- Manter leitura boa em terminais comuns, idealmente com largura de 80 colunas.
- Evitar uma arte alta demais que empurre o conteudo util do CLI para longe.
- Confirmar antes da spec a grafia final da assinatura: `J.Roitberg` ou outra.
- Confirmar antes da spec o nome final: `Kombat Kreator` ou `Kombat Creator`.

## Opcoes de solucao

### Opcao A
Criar um banner ASCII compacto e mostrar apenas no menu interativo.

Exemplo de comportamento futuro:

```bash
konvert2snes
```

Mostra o banner, a assinatura e depois o menu.

**Pros**
- Menor risco.
- Da identidade onde o uso e mais humano.
- Nao polui comandos diretos usados por automacao.
- Facil de replicar em outros CLIs.

**Contras**
- O banner nao aparece em `--help` nem em `examples`.
- Usuarios que usam sempre subcomandos diretos quase nao veem a identidade.

**Impacto provavel**
- baixo

### Opcao B
Criar um banner ASCII compacto e mostrar em pontos humanos do CLI: menu interativo, help e exemplos.

Exemplo de comportamento futuro:

```bash
konvert2snes
konvert2snes --help
konvert2snes examples
```

Comandos de conversao direta, como `konvert2snes convert arquivo.png`, continuariam sem banner por padrao.

**Pros**
- Boa presenca visual sem atrapalhar conversoes diretas.
- O help passa a carregar a identidade da ferramenta.
- Continua simples e sem dependencia.
- Cria um padrao facil de levar para `GT-1 Tone Maker` e `Kombat Kreator`.

**Contras**
- Toca mais pontos do CLI do que a Opcao A.
- Precisa cuidar para o help nao ficar grande demais.
- Precisa decidir como o alias legado `png2snes` deve se apresentar.

**Impacto provavel**
- baixo-medio

### Opcao C
Mostrar o banner em toda execucao do CLI, incluindo conversoes diretas.

Exemplo de comportamento futuro:

```bash
konvert2snes convert to-convert/stage-bg1.png
```

Tambem mostraria o banner antes do resumo e da conversao.

**Pros**
- Identidade muito visivel.
- Comportamento consistente em qualquer entrada.

**Contras**
- Pode atrapalhar leitura de logs.
- Pode incomodar em execucoes repetidas.
- Pode quebrar expectativas de scripts que leem stdout.
- Maior risco para pouco ganho pratico.

**Impacto provavel**
- medio

### Opcao D
Usar uma dependencia de banner/figlet para gerar texto automaticamente.

**Pros**
- Facil testar varios estilos.
- Pode gerar nomes diferentes com o mesmo estilo.
- Visual pode ficar mais elaborado.

**Contras**
- Adiciona dependencia para algo essencialmente estetico.
- Pode gerar banners largos demais.
- Estilos automaticos nem sempre ficam bons com nomes longos.
- Aumenta superficie de manutencao sem necessidade clara.

**Impacto provavel**
- medio

## Recomendacao
Seguir a Opcao B.

Ela equilibra identidade e seguranca: o banner aparece nos pontos em que o usuario esta lendo e escolhendo o que fazer, mas nao entra automaticamente em conversoes diretas. Isso preserva o uso tecnico do CLI e ainda da personalidade ao produto.

A abordagem recomendada para uma spec futura:

- criar um modulo pequeno e isolado de identidade visual, por exemplo `src/cli/identity.js`;
- manter banners fixos e revisaveis, sem dependencia nova;
- aceitar o nome da ferramenta como dado para permitir reaproveitamento;
- usar `by J.Roitberg` como assinatura inicial, pendente de confirmacao final da grafia;
- criar primeiro o banner do `Konvert2Snes`;
- documentar o padrao para depois replicar em `GT-1 Tone Maker` e `Kombat Kreator`/`Kombat Creator`;
- tratar `png2snes` como alias legado, mantendo a identidade principal `Konvert2Snes`.

Direcao visual sugerida:

- retro/dev tool, mas sem ficar ilegivel;
- largura ate 80 colunas;
- altura pequena, algo entre 4 e 6 linhas;
- assinatura discreta em linha separada;
- ate 3 cores ANSI simples, com fallback sem cor quando necessario;
- evitar blocos muito densos que fiquem ruins em fontes diferentes.

## Esforco estimado
baixo

A primeira implementacao deve ser pequena se o banner for fixo e a exibicao ficar limitada ao menu, help e examples. O maior cuidado e decidir o texto/estilo antes de codar.

## Arquivos ou areas que provavelmente precisam ser lidos
- `package.json`
- `bin/konvert2snes.js`
- `bin/png2snes.js`
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `README.md`
- `README.en.md`
- `docs/backlog.md`

Em outros produtos, antes de replicar:

- entrada principal do CLI do `GT-1 Tone Maker`;
- entrada principal do CLI do `Kombat Kreator`/`Kombat Creator`;
- docs ou package metadata de cada ferramenta.

## Arquivos ou areas que provavelmente seriam alterados
Primeira spec neste repositorio:

- novo modulo pequeno em `src/cli/identity.js`;
- `src/cli/menu.js`, para mostrar no fluxo interativo;
- `bin/png2snes.js`, se o banner entrar em help ou examples;
- possivelmente `README.md` e `README.en.md`, se for documentar a identidade visual;
- `docs/backlog.md`, no fechamento da tarefa.

Replicacao futura em outros produtos:

- um arquivo equivalente de identidade visual em cada CLI;
- pontos de entrada interativos/help de cada ferramenta;
- backlog/spec propria de cada repositorio, se existir.

## Riscos
- Banner ficar grande ou ilegivel em terminal pequeno.
- Assinatura ficar com grafia errada.
- Padronizar `Kreator`/`Creator` antes de confirmar o nome correto.
- Poluir saida de comandos diretos usados em scripts.
- Duplicar banner em mais de um ponto do fluxo.
- Criar dependencia desnecessaria para uma melhoria visual simples.
- Fazer uma identidade bonita para uma ferramenta, mas dificil de adaptar para nomes maiores.

## Validacao inicial
Antes da spec:

1. aprovar a opcao de exibicao: menu/help/examples, sem conversoes diretas;
2. confirmar assinatura final: `by J.Roitberg`, `J.Roitberg` ou outra grafia;
3. confirmar se o nome deve ser `Kombat Kreator` ou `Kombat Creator`;
4. escolher ou rascunhar 1 a 3 estilos de banner compactos;
5. conferir se o estilo cabe em 80 colunas para os nomes mais longos.

Depois de uma implementacao futura, validar com:

```bash
node bin/konvert2snes.js
node bin/konvert2snes.js --help
node bin/konvert2snes.js examples
node bin/konvert2snes.js convert to-convert/algum-arquivo.png --no-interactive
```

Resultado esperado:

- menu, help e examples exibem a identidade visual aprovada;
- conversao direta nao muda comportamento nem adiciona banner inesperado;
- alias legado continua funcionando;
- mensagens de erro e arquivos gerados continuam iguais;
- o banner fica legivel em terminal comum.

## Proximo passo
Se este planning for aprovado, criar uma spec curta para a Opcao B antes de qualquer implementacao.

## Decisao aprovada
Seguir com a Opcao B.

Decisoes confirmadas para a spec:

- banner ASCII compacto, sem dependencia nova;
- 3 cores ANSI simples: `Konvert` claro, `2` vermelho e `SNES`/assinatura em cinza;
- exibir em menu interativo, help principal e comando `examples`;
- nao exibir em conversoes diretas por padrao;
- assinatura inicial: `by J.Roitberg`;
- nome futuro padronizado como `Kombat Kreator`, com `K`;
- implementar primeiro no `Konvert2Snes` e depois replicar o padrao nos outros produtos em tarefas proprias.
