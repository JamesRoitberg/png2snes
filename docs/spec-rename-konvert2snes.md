# Spec - Renomear projeto para konvert2snes

## Titulo
Renomear identidade principal do CLI para `konvert2snes`.

## Tipo
ajuste de CLI

## Contexto
O projeto ainda usa `png2snes` como nome de pacote, comando, exemplos, prefixos de log e textos de documentacao. Como existe outra ferramenta com esse nome, a identidade publica deve mudar para `konvert2snes`.

A direcao aprovada no planning e renomear a identidade principal, manter `png2snes` como alias legado temporario e revisar a versao para `1.0.0`.

## Objetivo
- Trocar a identidade principal do projeto para `konvert2snes`.
- Definir `version` como `1.0.0`.
- Manter compatibilidade com o comando legado `png2snes` por enquanto.
- Atualizar documentacao principal, exemplos e mensagens do CLI para o novo nome.
- Registrar a remocao futura do alias legado como outra tarefa de backlog.

## Nao mudar
- Nao remover o alias legado `png2snes` nesta etapa.
- Nao alterar comportamento de conversao, sequence, combine, split, priority, color ou analyze-map.
- Nao alterar formatos de saida: `.chr`, `.map`, `.pal`, `.gpl`, `-tileset.png`.
- Nao renomear arquivos gerados pelo pipeline.
- Nao adicionar dependencia.
- Nao misturar esta tarefa com versionamento automatizado por Conventional Commits.
- Nao fazer refactor estrutural fora do rename.

## Funcionalidade envolvida
Identidade publica do CLI e do pacote npm local.

### Entradas
- Chamadas diretas ao CLI:
  - `node bin/png2snes.js`
  - `node bin/konvert2snes.js`, se o novo arquivo de entrada for criado
  - `konvert2snes <subcomando>` via `npm link`
  - `png2snes <subcomando>` como alias legado via `npm link`
- Comandos npm existentes.
- Documentacao principal em portugues e ingles.

### Saidas
Hoje:

- `package.json` exporta o binario `png2snes`.
- `package.json` usa `name: "png2snes"` e `version: "2.0.0"`.
- O help do Commander mostra `png2snes`.
- Exemplos e comandos equivalentes impressos usam `png2snes`.
- Prefixos de log usam `[png2snes]`.
- GPL gerado por `writeGpl` cita `png2snes`.

### Saidas desejadas
Depois da mudanca:

- `package.json` usa `name: "konvert2snes"` e `version: "1.0.0"`.
- `package.json` expoe `konvert2snes` como binario principal.
- `package.json` mantem `png2snes` como alias legado apontando para a mesma entrada.
- O help e exemplos principais usam `konvert2snes`.
- O menu interativo imprime comandos equivalentes com `konvert2snes`.
- Prefixos de log principais usam `[konvert2snes]`.
- README PT/EN apresentam `konvert2snes`.
- README PT/EN documentam `png2snes` apenas em compatibilidade.
- `package-lock.json` acompanha nome, versao e binarios do `package.json`.

### Quem chama hoje
- Usuario via `node bin/png2snes.js`.
- Usuario via comando global `png2snes` apos `npm link`.
- `npm start` chama `node bin/png2snes.js`.
- Fluxos interativos montam comandos equivalentes usando `png2snes`.
- Specs/plannings historicos citam comandos `png2snes`.

### Quem depende hoje
- `bin/png2snes.js` configura o nome do programa no Commander.
- `src/cli/menu.js` imprime exemplos e comandos equivalentes.
- `src/cli/toolRunner.js`, `src/index.js`, `src/sequence.js`, `src/mapDiagnostics.js`, `src/validateTiles.js` e tools imprimem logs com o prefixo atual.
- `src/exporters.js` usa `png2snes` no nome padrao do GPL.
- README PT/EN documentam comandos de uso.

### Efeitos colaterais e mensagens de erro
- Mensagens de erro e warnings vao mudar o prefixo textual de `[png2snes]` para `[konvert2snes]`.
- Arquivos `.gpl` novos podem citar `konvert2snes` em comentarios/metadados.
- Specs/plannings antigos podem continuar citando `png2snes` quando estiverem registrando comportamento historico ou comandos ja documentados naquela etapa.

### Impacto
Impacto concentrado em identidade, documentacao e logs. O risco principal e quebrar uso por `npm link` ou deixar comandos/documentacao incoerentes.

## Arquivos para ler antes de editar
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
- `docs/planning-rename-konvert2snes.md`

## Arquivos que devem ser alterados
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

## Estrategia
1. Atualizar pacote e binarios.
   - Trocar `name` para `konvert2snes`.
   - Trocar `version` para `1.0.0`.
   - Expor `konvert2snes` como binario principal.
   - Manter `png2snes` como alias legado.
   - Decidir no patch se ambos apontam para `bin/png2snes.js` ou se vale criar `bin/konvert2snes.js` como entrada principal minima.

2. Atualizar identidade do CLI.
   - Trocar `.name("png2snes")` para `.name("konvert2snes")`.
   - Atualizar exemplos e comandos equivalentes para `konvert2snes`.
   - Manter o comando antigo funcionando pelo alias npm.

3. Atualizar prefixos textuais.
   - Trocar logs e warnings principais para `[konvert2snes]`.
   - Atualizar comentarios de GPL gerado.

4. Atualizar documentacao principal.
   - README PT/EN devem apresentar `konvert2snes`.
   - Secao de compatibilidade deve citar que `png2snes` continua aceito como alias legado temporario.
   - Docs historicos de planning/spec nao precisam ser reescritos em massa se estiverem preservando contexto antigo.

5. Atualizar backlog.
   - BL-003 deve ir para `done` somente depois de validar.
   - Criar/manter item futuro para remover alias legado `png2snes`.

## Risco de quebra
medio

Toca varios arquivos e a identidade do binario. O comportamento de conversao nao deve mudar, mas `npm link`, help e comandos equivalentes precisam ser validados.

## Validacao manual
1. Conferir package metadata:

```bash
npm pkg get name version bin
```

Resultado esperado:

- `name` retorna `konvert2snes`.
- `version` retorna `1.0.0`.
- `bin` inclui `konvert2snes` e `png2snes`.

2. Conferir help do CLI:

```bash
node bin/png2snes.js --help
```

Resultado esperado:

- Help usa `konvert2snes` como nome principal.
- Subcomandos continuam listados.

3. Conferir exemplos:

```bash
node bin/png2snes.js examples
```

Resultado esperado:

- Exemplos principais usam `konvert2snes`.

4. Conferir alias novo se for criado:

```bash
node bin/konvert2snes.js --help
node bin/konvert2snes.js examples
```

Resultado esperado:

- Ambos funcionam igual ao arquivo legado.

5. Smoke test de fluxo sem entrada real:

```bash
node bin/png2snes.js color ad1808
```

Resultado esperado:

- Conversao de cor continua funcionando.
- Prefixo/log, se houver, usa `konvert2snes`.

6. Conferir README:

```bash
rg -n "png2snes|konvert2snes|2\\.0\\.0|1\\.0\\.0" README.md README.en.md package.json package-lock.json bin src tools
```

Resultado esperado:

- `konvert2snes` e dominante.
- `png2snes` aparece apenas como alias legado, arquivo legado, ou contexto historico aceitavel.
- `2.0.0` nao aparece como versao do pacote.

## Etapas
1. ler arquivos alvo completos
2. aplicar rename pequeno e preservando alias legado
3. validar help, examples, metadata e smoke test simples
4. atualizar BL-003 para done se tudo passar
5. parar e reportar
