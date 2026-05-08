# Planning - Perguntar conversao apos combine no CLI

## Titulo
Perguntar se deve converter o PNG final apos combine.

## Tipo
melhoria de UX

## Problema percebido
Depois de combinar partes em um PNG final pelo menu interativo, o usuario precisa voltar manualmente ao menu e iniciar uma conversao separada. Esse e um atrito pequeno, mas recorrente, porque o proximo passo natural depois de gerar `<stem>-final.png` costuma ser converter esse PNG para assets SNES.

Este planning corresponde ao item `BL-005` do backlog.

## Fluxo atual
No menu interativo:

1. O usuario escolhe `3. Combinar partes de um PNG/cenario`.
2. O CLI pergunta o tipo de combine.
3. O CLI pede o diretorio e um dos arquivos `partN.png`.
4. `inferCombineFromPart` detecta as partes relacionadas e calcula `outPath` como `<stem>-final.png`.
5. O CLI mostra preview e resumo.
6. O usuario confirma a execucao.
7. `runCombineFlow` gera o PNG final.
8. O CLI imprime o comando equivalente de `combine`.
9. `runInteractiveCombine` retorna `true` e `openMainMenu` encerra o menu.

Para converter o PNG final, o usuario precisa rodar outro comando ou abrir o menu de novo.

## Objetivo
Reduzir o atrito do fluxo interativo perguntando, apos um combine concluido, se o usuario quer converter o PNG final gerado para SNES.

O comportamento deve continuar manual e previsivel:

- nao converter automaticamente sem confirmacao;
- nao mudar o subcomando direto `konvert2snes combine`;
- nao alterar como o combine gera o PNG final;
- nao alterar defaults de conversao existentes.

## Restricoes
- Mudanca pequena e testavel.
- Preservar o comportamento atual quando o usuario responder `nao`.
- Nao mexer no core de conversao.
- Nao mexer nos scripts legados de combine.
- Nao criar dependencias novas.
- Nao acoplar combine BG3/HUD 2bpp a uma conversao especial sem o usuario escolher as opcoes de conversao.
- Manter o comando equivalente impresso para o combine atual.
- Se houver comando equivalente da conversao, ele deve seguir o formato ja usado pelo menu.

## Opcoes de solucao

### Opcao A
Apos `runCombineFlow`, perguntar `Converter o PNG final agora?`.

Se o usuario responder `sim`, chamar um pequeno fluxo local que reaproveita `resolveConversionOptions({ interactive: true })`, mostra resumo de conversao, pede confirmacao e chama `runConvertFlow` com `combineInfo.outPath`.

**Pros**
- Resolve a dor diretamente.
- Mantem o usuario no controle das opcoes de conversao.
- Pode ficar concentrado em `src/cli/menu.js`.
- Reaproveita funcoes ja existentes: `resolveConversionOptions`, `runConvertFlow`, `printSummary`, `printEquivalentCommand` e `buildConversionCommand`.
- Nao muda subcomandos diretos nem scripts legados.

**Contras**
- `src/cli/menu.js` ganha um pouco mais de fluxo condicional.
- Precisa decidir a ordem das mensagens: comando equivalente do combine antes ou depois da pergunta.

**Impacto provavel**
- baixo

### Opcao B
Apos `runCombineFlow`, retornar ao menu principal em vez de encerrar, permitindo que o usuario escolha manualmente a opcao `1. Converter PNG para SNES`.

**Pros**
- Menor mudanca tecnica.
- Evita chamar conversao dentro do fluxo de combine.

**Contras**
- Nao passa automaticamente o PNG final gerado para a conversao.
- O usuario ainda precisa navegar, escolher diretorio e selecionar arquivo.
- Resolve pouco da dor registrada na BL-005.

**Impacto provavel**
- baixo

### Opcao C
Adicionar uma nova opcao de menu separada, por exemplo `Combinar e converter partes`.

**Pros**
- Deixa o fluxo explicito no menu.
- Evita mudar a opcao de combine existente.

**Contras**
- Aumenta o menu principal.
- Duplica boa parte da logica de combine.
- Pode confundir o usuario entre combine simples e combine com conversao.
- Mais superficie para manter.

**Impacto provavel**
- medio

### Opcao D
Adicionar flag ao subcomando direto, por exemplo `konvert2snes combine <file> --convert`.

**Pros**
- Bom para automacao futura.
- Permite uso nao interativo.

**Contras**
- BL-005 descreve dor do fluxo interativo, nao de automacao.
- Exige integrar opcoes de conversao no subcomando `combine`.
- Aumenta o risco de quebrar compatibilidade ou tornar o help mais complexo.
- Nao e a menor melhoria para comecar.

**Impacto provavel**
- medio

## Recomendacao
Seguir a Opcao A.

Ela entrega a melhoria de usabilidade com o menor impacto no projeto: o combine continua igual, o subcomando direto continua igual, e a conversao so acontece depois de uma pergunta explicita. Tambem preserva o contrato atual de conversao, porque o usuario ainda passa pelo mesmo prompt de opcoes (`tipo`, `bpp`, tile size, dedupe, subpaleta etc.).

Para reduzir risco, a implementacao deve ficar concentrada em `src/cli/menu.js`, criando no maximo uma funcao auxiliar pequena para converter um PNG ja conhecido pelo fluxo.

## Esforco estimado
baixo

O fluxo atual ja tem quase todas as pecas. A mudanca principal e encadear uma pergunta opcional depois do combine interativo.

## Arquivos ou areas que provavelmente precisam ser lidos
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/cli/conversionOptions.js`
- `src/cli/discovery.js`
- `bin/png2snes.js`
- `README.md`
- `docs/backlog.md`

## Arquivos ou areas que provavelmente seriam alterados
- `src/cli/menu.js`

Possivelmente, apenas se a spec decidir documentar o novo comportamento:

- `README.md`
- `docs/backlog.md`, no fechamento da tarefa

## Riscos
- Converter um arquivo que nao foi gerado se o combine falhar antes de escrever o PNG final.
- Encadear a conversao e esconder o comando equivalente do combine.
- Mudar sem querer o comportamento de retorno do menu.
- Reutilizar opcoes de conversao de um jeito diferente do fluxo `Converter PNG para SNES`.
- Para combine BG3/HUD 2bpp, o usuario ainda precisa escolher opcoes adequadas de conversao; o fluxo nao deve assumir isso automaticamente.

## Validacao inicial
Antes de implementar, a spec deve confirmar:

1. a pergunta aparece somente depois de combine confirmado e concluido;
2. responder `nao` encerra o fluxo como hoje;
3. responder `sim` abre as perguntas normais de conversao para `combineInfo.outPath`;
4. cancelar a confirmacao da conversao nao desfaz o combine;
5. o subcomando direto `konvert2snes combine <file>` continua sem pergunta extra;
6. `konvert2snes examples` e `--help` continuam funcionando.

## Decisao aprovada
Seguir com a Opcao A.

A justificativa aprovada e que esse fluxo apenas automatiza o caminho manual atual: apos combinar, o usuario normalmente voltaria ao menu e escolheria a opcao `1. Converter PNG para SNES`. A melhoria deve fazer esse encadeamento por baixo dos panos, mas mantendo perguntas e confirmacoes da conversao.

## Proximo passo
Se aprovado, criar spec para a Opcao A antes de codar.
