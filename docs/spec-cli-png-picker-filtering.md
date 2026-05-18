# Spec - Filtrar PNGs auxiliares nos seletores do CLI

## Titulo
Listas de PNG mais limpas por fluxo.

## Tipo
ajuste de CLI

## Contexto
O menu interativo lista todos os `.png` encontrados no diretorio escolhido. Em pastas de trabalho como `to-convert` e `to-convert/converted`, isso mistura entradas reais com mascaras de prioridade, previews de tileset e outros PNGs auxiliares.

O planning `docs/planning-cli-png-picker-filtering.md` aprovou a Opcao A: aplicar filtros pequenos por fluxo usando o `includePngFile` ja existente no seletor.

## Objetivo
Reduzir ruido nas listas de arquivos do menu interativo, mostrando por padrao somente PNGs que fazem sentido como entrada de cada fluxo.

## Nao mudar
- Nao mudar subcomandos diretos.
- Nao mudar a inferencia real de `combine`, `sequence`, `split` ou `priority`.
- Nao mudar nomes, formatos ou locais de saida.
- Nao esconder `*-final.png` de `convert` ou `priority`.
- Nao remover a opcao `Outro diretorio...`.
- Nao remover o filtro por prefixo.
- Nao adicionar dependencia.
- Nao criar pergunta extra para "mostrar todos" nesta etapa.

## Funcionalidade envolvida
Selecao de PNGs no menu interativo.

### Entradas
- Diretorio sugerido do fluxo.
- Diretorio manual escolhido por `Outro diretorio...`.
- Arquivos `.png` encontrados no diretorio.
- Filtro opcional por prefixo digitado pelo usuario.

### Saidas
Hoje:

- o seletor lista todos os arquivos `.png` do diretorio;
- cada fluxo valida e infere contexto depois que o usuario escolhe um PNG.

### Saidas desejadas
Depois da mudanca:

- `convert` lista PNGs comuns e `*-final.png`, mas esconde auxiliares obvios:
  - `*-prio.png`;
  - `*-priority.png`;
  - `*-pri.png`;
  - `*-tileset.png`.
- `split` usa o mesmo filtro de auxiliares obvios.
- `priority` continua escondendo auxiliares obvios, como ja implementado.
- `combine` lista somente PNGs com padrao de parte:
  - `*-partN.png`;
  - `*_partN.png`;
  - `*partN.png`.
- `sequence` lista somente PNGs que terminam em numero:
  - `*-01.png`;
  - `*_01.png`;
  - `frame1.png`.

### Quem chama hoje
- `openMainMenu` chama:
  - `runInteractiveConvert`;
  - `runInteractiveSequence`;
  - `runInteractiveCombine`;
  - `runInteractiveSplit`;
  - `runInteractivePriority`.
- Esses fluxos chamam `selectPngFileFromDirectory`.

### Quem depende hoje
- Menu interativo aberto sem argumentos.
- Fluxos encadeados que chamam funcoes com input conhecido, como `combine -> convert` e `split -> sequence`, nao dependem da lista inicial quando ja tem caminho gerado.
- Subcomandos diretos nao usam `selectPngFileFromDirectory`.

### Efeitos colaterais e mensagens de erro
- Se todos os PNGs forem filtrados, o diretorio sugerido pode aparecer como `sem PNGs`.
- Em `Outro diretorio...`, se todos os PNGs forem filtrados, o erro continua informando que nenhum `.png` foi encontrado no diretorio.
- Essa mensagem pode ser levemente imprecisa quando existem PNGs, mas nenhum passa no filtro; nao ajustar texto nesta etapa para manter a mudanca pequena.

### Impacto
Impacto restrito ao menu interativo. A execucao das tools e os subcomandos diretos continuam iguais.

## Arquivos para ler antes de editar
- `src/cli/menu.js`
- `src/cli/discovery.js`
- `docs/planning-cli-png-picker-filtering.md`
- `docs/spec-cli-deferred-priority-flow.md`

## Arquivos que devem ser alterados
- `src/cli/menu.js`

Somente se for decidido documentar no fechamento:

- `README.md`
- `docs/backlog.md`

## Estrategia
Fazer uma mudanca pequena em `src/cli/menu.js`.

1. Renomear ou generalizar o filtro de prioridade existente para um filtro de auxiliares obvios.
   - O filtro deve esconder stems terminados em `-prio`, `_prio`, `-priority`, `_priority`, `-pri`, `_pri`, `-tileset` ou `_tileset`.
   - Nao deve esconder `*-final.png`.

2. Criar helper local para identificar partes de combine.
   - Regex equivalente a `part` seguido de numero no fim do stem.

3. Criar helper local para identificar frames de sequence.
   - Regex equivalente a numero no fim do stem.

4. Aplicar `includePngFile` nas chamadas:
   - `runInteractiveConvert`: filtro de auxiliares obvios;
   - `runInteractiveSequence`: filtro de frames numerados;
   - `runInteractiveCombine`: filtro de partes;
   - `runInteractiveSplit`: filtro de auxiliares obvios;
   - `runInteractivePriority`: filtro de auxiliares obvios.

5. Nao alterar os fluxos com input conhecido:
   - `runInteractiveConvertKnownInput`;
   - `runInteractiveSequenceKnownFrame`;
   - `runInteractivePriorityKnownContext`.

## Risco de quebra
baixo-medio

Motivo: a mudanca afeta apenas a lista do menu, mas pode esconder pelo menu interativo arquivos com nomes fora do padrao esperado. Os subcomandos diretos continuam disponiveis para casos fora do padrao.

## Validacao manual
1. Validar sintaxe:

```bash
node --check src/cli/menu.js
```

Resultado esperado:

- sem erro de sintaxe.

2. Validar `convert`:

```bash
node bin/konvert2snes.js
```

Passos:

- escolher `1. Converter PNG para SNES`;
- selecionar `to-convert`;
- usar filtro `bridge-bg2-final`.

Resultado esperado:

- `bridge-bg2-final.png` aparece;
- mascaras `*-prio.png` e previews `*-tileset.png` nao aparecem na lista inicial.

3. Validar `combine`:

- escolher `3. Combinar partes de um PNG/cenario`;
- selecionar `to-convert`;
- usar filtro de um stem com partes.

Resultado esperado:

- arquivos `*-partN.png` aparecem;
- `*-final.png` e mascaras nao aparecem.

4. Validar `sequence`:

- escolher `2. Converter animacao por sequencia de frames`;
- selecionar `to-convert`;
- usar filtro de um frame numerado existente.

Resultado esperado:

- frames numerados aparecem;
- sheets, mascaras e finais sem numero no fim nao aparecem.

5. Validar `split`:

- escolher `4. Splitar PNG em varios frames`;
- selecionar `to-convert`;

Resultado esperado:

- PNGs comuns aparecem;
- auxiliares obvios nao aparecem.

6. Validar `priority`:

- escolher `5. Aplicar prioridade de BG`;
- selecionar `to-convert`;
- escolher um `*-final.png` valido.

Resultado esperado:

- comportamento da prioridade adiada continua funcionando.

7. Validar comandos basicos:

```bash
node bin/konvert2snes.js examples
node bin/konvert2snes.js --help
```

Resultado esperado:

- comandos continuam funcionando.

## Etapas
1. criar esta spec
2. fazer mudanca pequena em `src/cli/menu.js`
3. validar sintaxe e fluxos principais
4. parar
