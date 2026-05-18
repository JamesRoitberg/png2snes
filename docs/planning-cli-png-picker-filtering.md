# Planning - Filtrar PNGs auxiliares nos seletores do CLI

## Titulo
Listas de PNG mais limpas no menu interativo.

## Tipo
melhoria de UX

## Problema percebido
Os fluxos interativos que pedem PNG listam tudo que existe no diretorio escolhido. Em pastas de trabalho como `to-convert` e `to-convert/converted`, isso mistura entradas reais com arquivos auxiliares:

- mascaras de prioridade (`*-prio.png`, `*-priority.png`);
- previews de tileset (`*-tileset.png`);
- outros PNGs derivados.

Isso deixa a lista maior, aumenta a chance de escolher o arquivo errado e piora a sensacao de uso do hub.

## Fluxo atual
`selectPngFileFromDirectory` lista todos os arquivos `.png` do diretorio, ordena por nome e aplica apenas um filtro opcional por prefixo digitado pelo usuario.

Depois da melhoria de prioridade adiada, o seletor ganhou suporte a `includePngFile`, mas hoje esse filtro e usado somente no fluxo `5. Aplicar prioridade de BG`.

## Objetivo
Aplicar filtros pequenos por fluxo para mostrar somente PNGs que fazem sentido como entrada daquele processo.

O objetivo nao e apagar arquivos nem impedir uso manual fora do menu. E apenas limpar as escolhas do hub interativo.

## Restrições
- Nao esconder `*-final.png` de forma global, porque ele e entrada valida para `convert` e `priority`.
- Nao mudar subcomandos diretos.
- Nao mudar inferencia de `combine`, `sequence`, `split` ou `priority`.
- Nao criar dependencia nova.
- Nao fazer refactor grande do menu.
- Preservar `Outro diretorio...`.
- Preservar o filtro por prefixo.
- Se um fluxo precisar de uma regra especifica, preferir filtro local do fluxo em vez de regra global invisivel.

## Opcoes de solucao

### Opcao A
Criar filtros locais por fluxo, usando o `includePngFile` que ja existe no seletor.

Regras provaveis:

- `convert`: esconder `*-prio.png`, `*-priority.png`, `*-tileset.png`; manter `*-final.png`.
- `split`: esconder `*-prio.png`, `*-priority.png`, `*-tileset.png`; manter outros PNGs.
- `priority`: manter filtro ja criado para esconder auxiliares.
- `combine`: listar somente arquivos com padrao `*-partN.png`.
- `sequence`: listar somente arquivos que terminam em numero, como `*-01.png`, `*_01.png` ou `foo1.png`.

**Pros**
- Mudanca pequena e concentrada em `src/cli/menu.js`.
- Cada fluxo mostra so o que faz sentido.
- Evita esconder `*-final.png` indevidamente.
- Reaproveita a extensao ja criada no seletor.

**Contras**
- Alguns arquivos validos com nomes fora do padrao podem deixar de aparecer pelo menu.
- O usuario ainda pode usar subcomandos diretos para casos fora do padrao.

**Impacto provavel**
- baixo-medio

### Opcao B
Criar um filtro global para todos os seletores que esconda apenas auxiliares obvios.

Exemplos:

- `*-prio.png`
- `*-priority.png`
- `*-tileset.png`

**Pros**
- Mais simples.
- Menor chance de esconder entradas validas por fluxo.

**Contras**
- Nao melhora tanto `combine`, porque partes e outros PNGs continuam juntos.
- Nao melhora tanto `sequence`, porque sheets e PNGs finais continuam juntos.
- Menos alinhado com o uso real de cada item do menu.

**Impacto provavel**
- baixo

### Opcao C
Adicionar uma pergunta no seletor para alternar entre "lista limpa" e "mostrar todos".

**Pros**
- Ajuda casos fora do padrao sem sair do menu.
- Reduz risco de esconder algo necessario.

**Contras**
- Adiciona mais uma pergunta em todo fluxo.
- Piora a fluidez que a melhoria tenta resolver.
- Aumenta complexidade do menu.

**Impacto provavel**
- medio

## Recomendacao
Seguir a Opcao A.

Ela aproveita a pequena extensao ja existente no seletor e deixa cada fluxo mais intencional:

- `combine` mostra partes;
- `sequence` mostra frames;
- `convert` e `split` escondem artefatos auxiliares;
- `priority` continua com a lista limpa ja implementada.

Essa abordagem preserva `*-final.png`, que e essencial para o pipeline atual.

## Esforco estimado
baixo

A mudanca deve ficar concentrada em poucos helpers pequenos e chamadas existentes de `selectPngFileFromDirectory`.

## Arquivos ou areas que provavelmente precisam ser lidos
- `src/cli/menu.js`
- `src/cli/discovery.js`
- `docs/spec-cli-deferred-priority-flow.md`
- `README.md`

## Arquivos ou areas que provavelmente seriam alterados
- `src/cli/menu.js`

Somente se for decidido documentar a melhoria:

- `README.md`
- `docs/backlog.md`

## Riscos
- Esconder um PNG que o usuario queria usar pelo menu interativo.
- `sequence` deixar de listar um frame com nome valido mas fora do padrao numerado.
- `combine` deixar de listar um arquivo de parte com nome fora de `partN`.
- Mensagem "Nenhum arquivo .png encontrado" ficar menos clara quando existem PNGs, mas todos foram filtrados.

## Validacao inicial
Antes de implementar, a spec deve confirmar:

1. `convert` continua mostrando `*-final.png`;
2. `convert` nao mostra `*-prio.png`, `*-priority.png` nem `*-tileset.png`;
3. `combine` mostra `*-partN.png`;
4. `sequence` mostra frames numerados;
5. `split` nao mostra auxiliares obvios;
6. `priority` continua funcionando como validado na melhoria anterior;
7. subcomandos diretos continuam sem mudanca.

## Proximo passo
Se aprovado, criar spec curta para a Opcao A antes de codar.
