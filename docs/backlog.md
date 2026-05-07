# Backlog — png2snes

Este arquivo serve para registrar ideias, melhorias e ajustes que ainda nao entraram em implementacao.

Use este backlog quando a ideia ainda precisa ser lembrada, priorizada ou amadurecida.

Nao use este arquivo para:
- detalhar implementacao
- substituir `planning`
- substituir `spec`
- acompanhar trabalho ja em execucao

## Quando mover um item

- Mantenha no backlog quando a ideia ainda estiver vaga ou com prioridade incerta.
- Mova para `planning` quando houver duvida de direcao ou mais de uma solucao possivel.
- Mova para `spec` quando a direcao ja estiver escolhida e a proxima etapa for implementar com seguranca.

## Legenda de status

- `backlog`: item registrado e ainda sem analise detalhada.
- `analisando`: item em discussao para entender prioridade, escopo ou direcao.
- `aguardando`: item parado por depender de timing, contexto ou decisao externa.
- `aprovado`: item aceito para seguir ao proximo passo quando for a hora certa.

## Campos de cada item

- `titulo`: nome curto da ideia
- `problema`: dor atual ou oportunidade
- `prioridade`: baixa, media ou alta
- `status`: backlog, analisando, aguardando ou aprovado
- `proximo passo`: manter no backlog, criar planning, criar spec ou descartar
- `observacoes`: contexto curto, restricoes ou links para arquivos relevantes

## Modelo

```md
## [ID] Titulo da ideia
- problema:
- prioridade:
- status:
- proximo passo:
- observacoes:
```

## Exemplo preenchido

```md
## [BL-001] Exemplo de item
- problema: descrever rapidamente o que hoje incomoda ou o que pode ser melhorado.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: citar restricoes, comandos, arquivos ou contexto util quando necessario.
```

## Itens

Adicione novos itens no topo desta secao.

## [BL-008] Converter BG3/HUD 2bpp com subpaletas de 4 cores
- problema: PNGs BG3/HUD gerados pelo combine 2bpp podem ter 8, 12, 16 ou ate 32 cores em blocos de 4, mas a conversao atual rejeita BG 2bpp com mais de 4 cores totais.
- prioridade: alta
- status: aprovado
- proximo passo: criar spec
- observacoes: planning criado em `docs/planning-bg3-2bpp-conversion.md`; spec criada em `docs/spec-bg3-2bpp-conversion.md`; direcao recomendada e permitir, somente para BG `bpp=2`, subpaletas de 4 cores com `bg-pal-base`, mantendo sprites 2bpp limitados a 4 cores e preservando BG 4bpp atual.

## [BL-007] Perguntar se deve aplicar prioridade apos conversao
- problema: depois de converter um BG para SNES e exibir o resumo/diagnostico de VRAM, o usuario precisa voltar manualmente ao menu para aplicar prioridade de BG, mesmo quando esse e um proximo passo comum do fluxo.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: ideia inicial para, ao final do fluxo de conversao interativo, depois do resumo atual de VRAM, perguntar se o usuario quer rodar a opcao 5 do menu, `Aplicar prioridade de BG`; opcoes simples `sim` ou `nao`; se escolher `sim`, seguir para o fluxo de priority usando o BG recem-convertido como base quando for possivel inferir PNG/MAP/mascara. Avaliar impacto em `src/cli/menu.js`, `src/cli/toolRunner.js` e no retorno de caminhos gerados pela conversao, preservando o comportamento atual quando o usuario escolher `nao`.

## [BL-006] Perguntar se deve converter frames apos split
- problema: depois de splitar um cenario ou sheet em varios frames PNG, o usuario precisa iniciar manualmente a conversao de animacao por sequencia de frames, mesmo quando esse e o proximo passo natural do fluxo.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: ideia inicial para, ao final do fluxo de split interativo, perguntar se o usuario quer usar a opcao 2 do menu, `Converter animacao por sequencia de frames`; opcoes simples `sim` ou `nao`; se escolher `sim`, seguir para o fluxo de sequence usando um dos frames gerados como entrada. Avaliar impacto em `src/cli/menu.js` e `src/cli/toolRunner.js`, preservando o split atual e sem mudar sequence/conversao automaticamente sem confirmacao.

## [BL-005] Perguntar se deve converter PNG final apos combine
- problema: depois de combinar partes em um PNG final, o usuario precisa iniciar manualmente a conversao para SNES em outro passo, mesmo quando o proximo fluxo natural e converter a imagem gerada.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: ideia inicial para, ao final do fluxo de combine interativo, perguntar se o usuario quer converter o PNG combinado para SNES; opcoes simples `sim` ou `nao`; se escolher `sim`, seguir para a opcao 1 do menu/fluxo de conversao usando o PNG final gerado como entrada. Avaliar impacto em `src/cli/menu.js` e `src/cli/toolRunner.js`, preservando o combine atual e sem acoplar convert 2bpp antes da proxima decisao.

## [BL-004] Versionamento por Conventional Commits
- problema: a versao atual do projeto nao segue automaticamente o tipo de mudanca entregue, o que dificulta manter um versionamento previsivel para releases pequenas, medias ou grandes.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: avaliar uso de versionamento semantico guiado por Conventional Commits, por exemplo `fix` para incrementar patch, `feat` para incrementar minor e mudancas grandes ou breaking changes para incrementar major; decidir se isso deve ser automatizado por script/tool ou se deve ficar como fluxo assistido pelo agente.

## [BL-003] Renomear projeto para konvert2snes e revisar versao inicial
- problema: foi encontrada outra ferramenta com o nome `png2snes`, o que pode gerar conflito de identidade, documentacao e uso do comando.
- prioridade: alta
- status: backlog
- proximo passo: criar planning
- observacoes: ideia de trocar referencias de `png2snes` para `konvert2snes` e revisar a versao atual `2.0.0` para `1.0.0` ou algum numero que deixe claro o estado beta; o impacto provavelmente inclui `package.json`, comando binario, docs, mensagens do CLI e referencias textuais no projeto.

## [BL-002] Suporte inicial a interface em ingles
- problema: o CLI hoje funciona em portugues e nao oferece uma opcao de uso em ingles.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: ideia inicial de escolher `pt-br` ou `en` no inicio do fluxo e depois seguir com o menu atual.
