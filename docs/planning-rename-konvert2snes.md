# Planning - Renomear projeto para konvert2snes

## Titulo
Renomear identidade do CLI para `konvert2snes` e revisar versao inicial.

## Tipo
melhoria tecnica

## Problema percebido
Foi encontrada outra ferramenta com o nome `png2snes`. Manter o mesmo nome pode gerar conflito de identidade, documentacao, instalacao global e uso do comando.

A versao atual tambem esta em `2.0.0`, mas o projeto ainda esta consolidando a nova identidade. Isso pode passar uma mensagem mais madura/estavel do que o desejado para uma primeira versao publica com o novo nome.

## Fluxo atual
Hoje o projeto usa `png2snes` como identidade principal:

- `package.json` tem `name: "png2snes"`.
- `package.json` tem `version: "2.0.0"`.
- O binario global exposto e `png2snes`.
- A entrada local documentada e `node bin/png2snes.js`.
- README PT/EN, exemplos, mensagens do CLI, prefixos de log e GPL gerado usam `png2snes`.
- Tools auxiliares ainda usam scripts npm proprios e tambem citam `png2snes` em alguns textos.

## Objetivo
Definir uma estrategia segura para:

- trocar a identidade principal para `konvert2snes`;
- revisar a versao inicial para o novo nome;
- preservar compatibilidade quando fizer sentido;
- evitar refactor amplo no runtime do CLI;
- manter documentacao e comandos coerentes.

## Restricoes
- Nao quebrar fluxos antigos sem decisao explicita.
- Nao renomear arquivos de entrada/saida gerados pelo pipeline.
- Nao alterar comportamento de conversao, sequence, combine, split, priority, color ou analyze-map.
- Nao adicionar dependencia nova.
- Nao fazer reorganizacao estrutural do projeto nesta etapa.
- Se houver alias legado, documentar claramente que `png2snes` continua aceito por compatibilidade.

## Opcoes de solucao

### Opcao A
Renomear tudo de uma vez e remover o comando antigo.

Mudancas principais:

- `package.json`: `name` para `konvert2snes`.
- `package.json`: `bin` apenas com `konvert2snes`.
- Renomear `bin/png2snes.js` para algo como `bin/konvert2snes.js`.
- Trocar exemplos, docs e prefixos para `konvert2snes`.
- Ajustar `package-lock.json`.
- Revisar versao para `1.0.0` ou prerelease.

**Pros**
- Identidade nova fica limpa.
- Evita manter dois nomes no CLI.
- Reduz ambiguidade para usuarios novos.

**Contras**
- Quebra qualquer uso local/global que chama `png2snes`.
- Obriga atualizar scripts, docs e habitos de uma vez.
- Maior risco por mexer em binario, docs e comandos simultaneamente.

**Impacto provavel**
- alto

### Opcao B
Renomear a identidade principal para `konvert2snes`, mas manter `png2snes` como alias legado por compatibilidade.

Mudancas principais:

- `package.json`: `name` para `konvert2snes`.
- `package.json`: `version` para uma versao inicial escolhida.
- `package.json`: `bin` com `konvert2snes` e `png2snes` apontando para a mesma entrada.
- Manter `bin/png2snes.js` por enquanto, ou criar um wrapper `bin/konvert2snes.js` minimo que chama a mesma entrada.
- Trocar docs e exemplos principais para `konvert2snes`.
- Manter uma secao de compatibilidade citando `png2snes`.
- Trocar prefixos de log principais para `[konvert2snes]`, deixando referencias historicas apenas em docs/specs antigas quando fizer sentido.

**Pros**
- Resolve a identidade publica sem quebrar comandos antigos imediatamente.
- Mantem compatibilidade com usuarios e scripts existentes.
- Permite uma mudanca incremental e testavel.
- Evita renomear arquivos internos se isso nao trouxer ganho imediato.

**Contras**
- O nome antigo continua existindo como alias.
- Exige cuidado para docs nao ficarem confusas.
- Pode precisar de uma decisao futura para remover ou manter o alias legado.

**Impacto provavel**
- medio

### Opcao C
Fazer apenas rename de documentacao e manter package/bin como `png2snes` por enquanto.

Mudancas principais:

- README e textos falam em `konvert2snes`.
- `package.json`, `package-lock.json`, binario e prefixos continuam `png2snes`.

**Pros**
- Menor risco tecnico imediato.
- Facil de revisar.

**Contras**
- Nao resolve conflito real de instalacao/comando.
- Deixa package, binario e docs divergentes.
- Tende a gerar confusao para uso global via `npm link`.

**Impacto provavel**
- baixo, mas insuficiente

### Opcao D
Adiar o rename e primeiro definir uma politica de versionamento/release.

Mudancas principais:

- Nao alterar nome ainda.
- Criar planning/spec separado para versionamento por Conventional Commits.
- Voltar ao rename depois.

**Pros**
- Evita decidir versao no escuro.
- Pode alinhar com BL-004.

**Contras**
- Mantem o conflito de identidade.
- Bloqueia a decisao mais urgente.
- Pode misturar duas pautas diferentes.

**Impacto provavel**
- baixo agora, medio depois

## Recomendacao
Seguir a Opcao B.

Ela e a melhor combinacao entre identidade nova e compatibilidade. O projeto passa a se apresentar como `konvert2snes`, mas o comando `png2snes` pode continuar funcionando como alias legado enquanto os fluxos antigos e docs de transicao ainda existem.

Para versao, recomendar `1.0.0` para marcar a primeira versao com a nova identidade sem precisar de sufixo beta.

O alias legado `png2snes` deve ficar apenas como compatibilidade temporaria. A remocao futura do alias e de referencias legadas deve ser tratada em outra tarefa do backlog, sem bloquear outras prioridades depois deste rename.

## Esforco estimado
medio

A mudanca e simples conceitualmente, mas toca muitos textos e pontos de entrada. Deve ser feita em uma spec curta e validada por comandos de smoke test.

## Arquivos ou areas que provavelmente precisam ser lidos
- `package.json`
- `package-lock.json`
- `bin/png2snes.js`
- `src/index.js`
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/sequence.js`
- `src/exporters.js`
- `src/mapDiagnostics.js`
- `src/validateTiles.js`
- `tools/vramLayoutHelper.js`
- `tools/README.md`
- `README.md`
- `README.en.md`
- `docs/backlog.md`
- specs/plannings existentes que citam `png2snes`

## Arquivos ou areas que provavelmente seriam alterados
- `package.json`
- `package-lock.json`
- `bin/png2snes.js`
- possivelmente `bin/konvert2snes.js`
- `README.md`
- `README.en.md`
- `src/index.js`
- `src/cli/menu.js`
- `src/cli/toolRunner.js`
- `src/sequence.js`
- `src/exporters.js`
- `src/mapDiagnostics.js`
- `src/validateTiles.js`
- `tools/vramLayoutHelper.js`
- `tools/README.md`
- `docs/backlog.md`

Possivelmente manter docs historicos de planning/spec com `png2snes` quando estiverem descrevendo comportamento antigo ou mensagens antigas.

## Riscos
- Quebrar `npm link` ou o comando global esperado.
- Deixar docs e binario divergentes.
- Remover sem querer compatibilidade de `png2snes`.
- Trocar mensagens em specs antigas e perder contexto historico.
- Alterar comportamento runtime ao tentar renomear alem do necessario.
- Escolher uma versao que nao represente bem o estado do projeto.

## Validacao inicial
Antes da implementacao, confirmar a decisao sobre:

1. comando principal: `konvert2snes`;
2. alias legado: manter `png2snes`;
3. versao inicial: `1.0.0`;
4. nome do arquivo de entrada em `bin/`: manter `bin/png2snes.js` com alias ou criar `bin/konvert2snes.js`.

Depois da implementacao, validar com:

```bash
node bin/png2snes.js examples
node bin/png2snes.js --help
npm pkg get name version bin
```

Se for criado `bin/konvert2snes.js`, validar tambem:

```bash
node bin/konvert2snes.js examples
node bin/konvert2snes.js --help
```

Resultado esperado:

- docs principais usam `konvert2snes`;
- comando principal aparece como `konvert2snes`;
- alias `png2snes` continua documentado em compatibilidade, se aprovado;
- versao bate com a decisao aprovada;
- nenhuma conversao ou tool auxiliar muda de comportamento.

## Decisao aprovada
Seguir com a Opcao B, usando versao `1.0.0`.

Manter `png2snes` como alias legado nesta etapa, mas registrar uma tarefa futura para remover esse legado quando houver prioridade.

## Proximo passo
Criar spec para a Opcao B antes de codar.
