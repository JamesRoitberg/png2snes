# Planning - Perguntar aplicacao de prioridade apos conversao no CLI

## Titulo
Perguntar se deve aplicar prioridade de BG apos conversao.

## Tipo
melhoria de UX

## Problema percebido
Depois de converter um BG para SNES pelo menu interativo, o usuario precisa voltar manualmente ao menu e iniciar `Aplicar prioridade de BG`, mesmo quando esse e um proximo passo comum do fluxo.

Este planning corresponde ao item `BL-007` do backlog.

## Fluxo atual
No menu interativo de conversao:

1. O usuario escolhe `1. Converter PNG para SNES`.
2. O CLI pede um PNG.
3. `resolveConversionOptions({ interactive: true })` pergunta tipo, bpp e opcoes relacionadas.
4. O CLI mostra resumo.
5. O usuario confirma a execucao.
6. `runConvertFlow` chama `runPng2Snes`.
7. Para BG, `runPng2Snes` grava os assets em `<baseOutDir>/converted/<stem>.*`.
   - `baseOutDir` e `options.outDir`, se informado.
   - Caso contrario, e o diretorio do PNG de entrada.
8. O CLI imprime o comando equivalente de `convert`.
9. `runInteractiveConvert` retorna `true` e o menu encerra.

No fluxo atual de prioridade:

1. O usuario escolhe `5. Aplicar prioridade de BG`.
2. O CLI pede um PNG base.
3. `inferPriorityFromPng` tenta inferir:
   - `.map` no mesmo diretorio do PNG base;
   - mascara como `<stem>-priority.png` ou `<stem>-prio.png`;
   - saida como `<stem>-pri.map`.
4. Se nao encontrar mascara ou map, o CLI pede manualmente.
5. O usuario confirma e `runPriorityFlow` chama `tools/bgPriority.js`.

## Objetivo
Reduzir o atrito do fluxo interativo perguntando, apos uma conversao BG concluida, se o usuario quer aplicar prioridade de BG.

O comportamento deve continuar manual e previsivel:

- nao aplicar prioridade automaticamente sem confirmacao;
- nao perguntar apos conversao de sprite;
- nao mudar o subcomando direto `konvert2snes convert`;
- nao alterar como a conversao gera arquivos;
- nao alterar como `tools/bgPriority.js` aplica o bit de prioridade;
- nao alterar defaults de conversao existentes.

## Restricoes
- Mudanca pequena e testavel.
- Preservar o comportamento atual quando o usuario responder `Não`.
- Usar opcoes `Sim`/`Não` no prompt, sem input de texto livre.
- Nao mexer no core de conversao se os caminhos puderem ser inferidos no menu.
- Nao mexer em `tools/bgPriority.js`.
- Nao criar dependencias novas.
- Manter o comando equivalente da conversao atual.
- Se houver comando equivalente de prioridade, ele deve seguir o formato ja usado pelo menu.
- Nao tentar aplicar prioridade se a conversao foi cancelada ou falhou.

## Pontos tecnicos importantes
- A conversao BG gera `.map` em `<baseOutDir>/converted/<stem>.map`.
- O PNG base para prioridade deve representar as dimensoes do BG. Normalmente pode ser o PNG de entrada da conversao.
- A mascara pode estar ao lado do PNG de entrada (`<stem>-priority.png` ou `<stem>-prio.png`) ou, dependendo do workflow do usuario, em `converted/`.
- O fluxo atual `inferPriorityFromPng` infere `.map` no mesmo diretorio do PNG base. Para o follow-up apos conversao, isso nao basta quando o PNG base fica fora de `converted/`.

## Opcoes de solucao

### Opcao A
Apos `runConvertFlow`, se `options.tipo === "bg"`, perguntar `Aplicar prioridade de BG agora?`.

Se o usuario responder `Sim`, chamar um helper de prioridade que recebe:

- PNG base: o PNG recem-convertido (`inputPath`);
- MAP: caminho inferido pelo contrato atual da conversao (`<baseOutDir>/converted/<stem>.map`);
- saida: `<baseOutDir>/converted/<stem>-pri.map`;
- mascara: tentar inferir primeiro perto do PNG base e depois em `converted/`; se nao encontrar, pedir manualmente.

**Pros**
- Resolve a dor diretamente.
- Mantem o usuario no controle com `Sim`/`Não` e confirmacao final.
- Pode ficar concentrado em `src/cli/menu.js`.
- Nao muda subcomandos diretos nem scripts legados.
- Nao exige mudar `runPng2Snes` para retornar caminhos.
- Funciona tambem quando a conversao foi chamada por um follow-up como `combine -> convert`, porque esse fluxo reaproveita a conversao interativa.

**Contras**
- O menu passa a conhecer o contrato de saida da conversao (`converted/<stem>.map`).
- Precisa de cuidado para inferir mascara em mais de um diretorio sem inventar regras escondidas demais.

**Impacto provavel**
- baixo-medio

### Opcao B
Apos `runConvertFlow`, se `options.tipo === "bg"`, perguntar `Aplicar prioridade de BG agora?`, mas usar o fluxo atual de prioridade sem overrides.

Ou seja: pedir ao usuario para selecionar o PNG base pelo menu de prioridade normal.

**Pros**
- Reaproveita bastante o fluxo atual.
- Menor necessidade de inferir caminhos novos.

**Contras**
- O usuario ainda precisa navegar e escolher arquivo.
- Nao aproveita o PNG recem-convertido como contexto.
- Resolve pouco da dor registrada na BL-007.

**Impacto provavel**
- baixo

### Opcao C
Alterar `runPng2Snes` ou `runConvertFlow` para retornar caminhos gerados estruturados, e usar esse retorno para o follow-up de prioridade.

**Pros**
- Caminhos de saida ficam menos duplicados no menu.
- Pode ser util para futuras integracoes.

**Contras**
- Toca o core de conversao.
- Pode afetar chamadas compartilhadas como sequence.
- Aumenta o escopo para uma melhoria de UX pequena.

**Impacto provavel**
- medio

### Opcao D
Adicionar uma nova opcao de menu separada, por exemplo `Converter BG e aplicar prioridade`.

**Pros**
- Deixa o fluxo explicito no menu.
- Evita mudar a opcao de conversao existente.

**Contras**
- Aumenta o menu principal.
- Duplica boa parte da logica de conversao e prioridade.
- Mais superficie para manter.
- Menos coerente com os follow-ups ja implementados.

**Impacto provavel**
- medio

## Recomendacao
Seguir a Opcao A.

Ela mantem o mesmo desenho das melhorias anteriores (`combine -> convert` e `split -> sequence`): uma acao concluida oferece o proximo passo comum por `Sim`/`Não`, mas reaproveitando o fluxo normal e com confirmacao antes de executar.

Para reduzir risco, a implementacao futura deve ficar concentrada em `src/cli/menu.js`:

- criar um helper pequeno para aplicar prioridade com PNG/MAP conhecidos;
- criar uma funcao local para inferir o caminho do `.map` gerado pela conversao;
- manter prompts manuais somente quando a mascara nao puder ser inferida.

## Esforco estimado
medio-baixo

E parecido com as duas melhorias anteriores, mas tem mais uma decisao de caminho: o `.map` gerado fica em `converted/`, enquanto o PNG base e a mascara podem estar fora dele.

## Arquivos ou areas que provavelmente precisam ser lidos
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/cli/conversionOptions.js`
- `src/cli/discovery.js`
- `src/index.js`
- `tools/bgPriority.js`
- `bin/png2snes.js`
- `README.md`
- `docs/backlog.md`

## Arquivos ou areas que provavelmente seriam alterados
- `src/cli/menu.js`

Possivelmente, apenas se a spec decidir documentar o novo comportamento:

- `README.md`
- `docs/backlog.md`, no fechamento da tarefa

## Riscos
- Inferir o `.map` errado se o contrato de saida de conversao mudar.
- Perguntar prioridade apos conversao de sprite por engano.
- Tentar aplicar prioridade sem mascara disponivel.
- Mascara estar em diretorio diferente do esperado.
- Reutilizar o fluxo de prioridade de um jeito diferente do fluxo `Aplicar prioridade de BG`.
- Se a conversao for chamada por `combine -> convert`, o follow-up pode criar uma cadeia `combine -> convert -> priority`; isso parece desejavel, mas deve ficar explicito na spec.

## Validacao inicial
Antes de implementar, a spec deve confirmar:

1. a pergunta aparece somente depois de conversao BG confirmada e concluida;
2. a pergunta usa opcoes `Sim` e `Não`, sem texto livre;
3. conversao de sprite nao pergunta prioridade;
4. responder `Não` encerra o fluxo como hoje;
5. responder `Sim` usa o PNG recem-convertido como PNG base e o `.map` gerado em `converted/`;
6. se a mascara nao for encontrada, o CLI pede o caminho manualmente;
7. cancelar a confirmacao de prioridade nao desfaz a conversao;
8. o subcomando direto `konvert2snes convert <input>` continua sem pergunta extra;
9. `konvert2snes examples` e `--help` continuam funcionando.

## Decisao aprovada
Seguir com a Opcao A.

A direcao aprovada e encadear `convert -> priority` no mesmo estilo das melhorias anteriores, com escolha explicita `Sim`/`Não`. O PNG base para a prioridade deve ser o PNG de entrada da conversao, enquanto o `.map` deve ser o asset gerado em `converted/<stem>.map`.

## Proximo passo
Se aprovado, criar spec para a Opcao A antes de codar.
