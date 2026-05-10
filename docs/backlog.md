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
- `done`: item concluido, validado e separado dos itens em aberto.

## Campos de cada item

- `titulo`: nome curto da ideia
- `problema`: dor atual ou oportunidade
- `prioridade`: baixa, media ou alta
- `status`: backlog, analisando, aguardando, aprovado ou done
- `proximo passo`: manter no backlog, criar planning, criar spec, implementar, descartar ou concluido
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

## Itens em aberto

Adicione novos itens no topo desta secao.

## [BL-016] Avaliar suporte a BG Mode 7
- problema: o CLI expõe `--modo 7`, mas ainda nao esta claro o que o `konvert2snes` precisa para gerar assets corretos para BG Mode 7 do SNES.
- prioridade: baixa
- status: backlog
- proximo passo: criar planning
- observacoes: tarefa futura para estudar regras reais de BG Mode 7 antes de implementar. Investigar formatos esperados de CHR/tile data, map/tilemap, paleta, tamanho e organizacao da arte, limites de cores/indices, como a arte deve ser preparada, e quais diferencas existem em relacao aos fluxos atuais de BG 2bpp/4bpp/8bpp. Nao assumir que o pipeline atual de `.chr`, `.map` e `.pal` serve para Mode 7 sem validacao.

## [BL-015] Padding configuravel no fim da CGRAM para BG Mode 3 8bpp
- problema: depois que o BG Mode 3 8bpp estiver validado, pode ser util reservar cores no fim da CGRAM com padding preto para permitir que o jogo carregue outras cores dinamicas depois, como personagens selecionados ou textos.
- prioridade: media
- status: aguardando
- proximo passo: manter no backlog ate concluir BL-014; depois criar planning
- observacoes: depende de BL-014 validar que `.chr`, `.pal` e `.map` 8bpp estao corretos para BG Mode 3. Ideia inicial: somente para BG Mode 3 8bpp, se a imagem indexada usar menos de 256 cores, oferecer uma opcao configuravel para preencher as cores restantes sempre no fim da CGRAM. Exemplo: imagem com 128 cores deixa 128 entradas finais preenchidas com preto, equivalendo a 8 subpaletas finais de 16 cores. O numero de subpaletas/cores reservadas deve ser configuravel, mas sempre aplicado no fim da CGRAM. Caso a imagem use 256 cores, nao ha espaco para padding e o asset deve ser gerado sem essa opcao.

## [BL-014] Validar BG Mode 3 8bpp
- problema: ainda nao foi confirmado de verdade se a conversao de BG 8bpp para uso em Mode 3 do SNES gera `.chr`, `.pal` e `.map` corretos.
- prioridade: media
- status: backlog
- proximo passo: criar planning de validacao
- observacoes: contexto observado: o CLI aceita `--modo 1|3|7` e `--bpp 8`; `src/map.js` comenta que em 8bpp os bits 10..12 de paleta do tilemap ficam zerados; `src/palette.js` evita filtrar cores em 8bpp para preservar indices absolutos. Falta validar com um BG Mode 3 real, conferindo tamanho/formatos dos assets, resultado em ROM/emulador, paleta de ate 256 cores e compatibilidade com o pipeline atual antes de criar qualquer nova opcao dependente disso.

## [BL-013] Integrar konvert2snes com Kombat Core/Kreator
- problema: assets finais gerados em `converted/` e valores de layout de VRAM BG1/BG2 ainda precisam ser copiados manualmente para o cenario/config alvo no Kombat Core/Kreator, o que pode gerar erro humano quando o pipeline estiver mais maduro.
- prioridade: media
- status: analisando
- proximo passo: aprovar direcao do planning
- observacoes: planning criado em `docs/planning-kombat-core-kreator-integration.md`. Ideia inicial: dividir em duas tarefas/specs futuras, uma para levar valores de VRAM ao config do cenario e outra para copiar assets finais. Na copia de assets, copiar somente `.chr`, `.pal` e um `.map`; se existir `-pri.map`, usar ele no lugar do `.map` normal. Preferir manifesto/export ou dry-run antes de qualquer escrita direta em projeto externo.

## [BL-012] Distribuicao por ZIP para usuarios sem Node
- problema: quando a ferramenta estiver pronta ou muito proxima disso, usuarios leigos de Node podem ter dificuldade para instalar dependencias e rodar comandos no terminal.
- prioridade: baixa
- status: backlog
- proximo passo: criar planning
- observacoes: avaliar uma forma de distribuir um ZIP no Git/GitHub para Windows e Linux que permita abrir a ferramenta com duplo clique, sem exigir que o usuario instale Node ou rode comandos manualmente. No planning, comparar alternativas como executavel empacotado, scripts/atalhos por plataforma, artefatos de release em vez de binarios versionados no repo, e comportamento esperado ao abrir por duplo clique sem fechar a janela imediatamente.

## [BL-009] Remover alias legado png2snes
- problema: apos o rename para `konvert2snes`, o alias legado `png2snes` deve continuar temporariamente por compatibilidade, mas a meta futura e remover codigo, referencias e comandos antigos para evitar duplicidade permanente.
- prioridade: baixa
- status: backlog
- proximo passo: criar planning
- observacoes: BL-003 concluida; aguardar periodo de transicao antes de avaliar remocao do alias no `package.json`, limpeza da entrada legada em `bin/`, docs de compatibilidade e ajustes de mensagens/comandos que ainda mencionem `png2snes`.

## [BL-004] Versionamento por Conventional Commits
- problema: a versao atual do projeto nao segue automaticamente o tipo de mudanca entregue, o que dificulta manter um versionamento previsivel para releases pequenas, medias ou grandes.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: avaliar uso de versionamento semantico guiado por Conventional Commits, por exemplo `fix` para incrementar patch, `feat` para incrementar minor e mudancas grandes ou breaking changes para incrementar major; decidir se isso deve ser automatizado por script/tool ou se deve ficar como fluxo assistido pelo agente.

## [BL-002] Suporte inicial a interface em ingles
- problema: o CLI hoje funciona em portugues e nao oferece uma opcao de uso em ingles.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: ideia inicial de escolher `pt-br` ou `en` no inicio do fluxo e depois seguir com o menu atual.

## Itens concluidos

Mova para esta secao tarefas finalizadas, mantendo as tarefas em aberto separadas do que ja foi entregue.

## [BL-017] Identidade visual textual para os CLIs
- problema: os CLIs ainda nao tinham uma assinatura visual propria no terminal, como um logo/banner textual legivel que ajudasse a dar identidade para as ferramentas.
- prioridade: baixa
- status: done
- proximo passo: concluido
- observacoes: planning criado em `docs/planning-cli-textual-identity.md`; spec criada em `docs/spec-cli-textual-identity.md`; implementado banner ASCII compacto em `src/cli/identity.js`, exibido no menu interativo, help principal e comando `examples`. Usa 3 cores ANSI simples quando permitido (`Konvert` claro, `2` vermelho e `SNES`/assinatura em cinza), respeita `NO_COLOR`/stdout nao TTY e nao aparece em conversoes diretas. Validado com `node --check`, help, examples, alias legado, menu interativo com e sem `NO_COLOR`, e smoke test de conversao direta com PNG indexado temporario em `/tmp`.

## [BL-011] Mudar default interativo de dedupe para horizontal
- problema: no fluxo interativo de conversao BG, a pergunta "Deduplicação de tiles" vinha com `Simples (idênticos)` como opcao padrao, mas o uso mais comum agora e escolher manualmente `Horizontal (flip X)`.
- prioridade: media
- status: done
- proximo passo: concluido
- observacoes: spec criada em `docs/spec-cli-dedupe-horizontal-default.md`; implementado em `src/cli/conversionOptions.js` trocando somente o default interativo do prompt de BG para `h`. Validado que o prompt resolve `dedupe=h`, `--dedupe simple` explicito continua `simple`, modo `--no-interactive` sem `--dedupe` continua no fallback `simple`, sprite continua `dedupe=none`, `node --check src/cli/conversionOptions.js` passa e o fluxo real foi validado pelo usuario.

## [BL-005] Perguntar se deve converter PNG final apos combine
- problema: depois de combinar partes em um PNG final, o usuario precisava iniciar manualmente a conversao para SNES em outro passo, mesmo quando o proximo fluxo natural era converter a imagem gerada.
- prioridade: media
- status: done
- proximo passo: concluido
- observacoes: planning criado em `docs/planning-cli-combine-convert-followup.md`; spec criada em `docs/spec-cli-combine-convert-followup.md`; menu interativo agora pergunta apos o combine se deve converter o PNG final usando opcoes `Sim`/`Não`, sem campo de texto livre. Validado que `Não` encerra sem converter, `Sim` abre o fluxo normal de conversao e cancelar a confirmacao da conversao preserva o combine concluido; subcomando direto `combine` continua sem pergunta extra.

## [BL-006] Perguntar se deve converter frames apos split
- problema: depois de splitar um cenario ou sheet em varios frames PNG, o usuario precisava iniciar manualmente a conversao de animacao por sequencia de frames, mesmo quando esse era o proximo passo natural do fluxo.
- prioridade: media
- status: done
- proximo passo: concluido
- observacoes: planning criado em `docs/planning-cli-split-sequence-followup.md`; spec criada em `docs/spec-cli-split-sequence-followup.md`; menu interativo agora pergunta apos o split se deve converter a sequencia usando opcoes `Sim`/`Não`, sem campo de texto livre. Se `Sim`, usa o primeiro frame gerado (`<nome>-01.png`) como entrada do fluxo normal de sequence. Validado que `Não` encerra sem converter, `Sim` abre preview/resumo de sequence e cancelar a confirmacao da sequence preserva o split concluido; subcomando direto `split` continua sem pergunta extra.

## [BL-007] Perguntar se deve aplicar prioridade apos conversao
- problema: depois de converter um BG para SNES e exibir o resumo/diagnostico de VRAM, o usuario precisava voltar manualmente ao menu para aplicar prioridade de BG, mesmo quando esse era um proximo passo comum do fluxo.
- prioridade: media
- status: done
- proximo passo: concluido
- observacoes: planning criado em `docs/planning-cli-convert-priority-followup.md`; spec criada em `docs/spec-cli-convert-priority-followup.md`; menu interativo agora pergunta apos conversao BG se deve aplicar prioridade usando opcoes `Sim`/`Não`, sem campo de texto livre. Se `Sim`, usa o PNG de entrada como base, o MAP gerado em `converted/<stem>.map`, procura mascara ao lado do PNG e em `converted/`, e pede a mascara manualmente se necessario. Validado que `Não` encerra sem prioridade, `Sim` gera `converted/<stem>-pri.map` com mascara inferida, mascara manual com cancelamento preserva a conversao, sprite nao pergunta prioridade e subcomando direto `convert` continua sem pergunta extra.

## [BL-003] Renomear projeto para konvert2snes e revisar versao inicial
- problema: foi encontrada outra ferramenta com o nome `png2snes`, o que podia gerar conflito de identidade, documentacao e uso do comando.
- prioridade: alta
- status: done
- proximo passo: concluido
- observacoes: identidade principal renomeada para `konvert2snes`, versao revisada para `1.0.0`, binario principal criado, alias legado `png2snes` mantido temporariamente e docs/logs principais atualizados. Validado com metadata npm, help, examples e smoke test de `color`.

## [BL-010] Corrigir BG3 2bpp usando subpaleta errada
- problema: ao converter o BG3 do temple para SNES em `2 bpp`, o indice/subpaleta escolhido no CLI nao estava sendo respeitado no resultado da ROM; caso observado: usuario escolheu usar o indice/base `1` da paleta, mas o resultado aparente no SNES estava usando `2`, quebrando as cores.
- prioridade: alta
- status: done
- proximo passo: concluido
- observacoes: investigado que o MAP/asset gerado pelo `png2snes` estava coerente com o contrato atual: `--bg-pal-base 1` desloca os grupos do PNG para subpaletas `1..4` em BG3 2bpp. A correcao validada na ROM foi usar a mesma abordagem de BG1/BG2, mas com tamanho de subpaleta 2bpp: carregar a paleta BG3 em `STAGE_BG3_CGADD = (1 * 4)`, sem padding de cores e sem reconverter os assets. Validado pelo usuario na ROM.

## [BL-008] Converter BG3/HUD 2bpp com subpaletas de 4 cores
- problema: PNGs BG3/HUD gerados pelo combine 2bpp podiam ter 8, 12, 16 ou ate 32 cores em blocos de 4, mas a conversao rejeitava BG 2bpp com mais de 4 cores totais.
- prioridade: alta
- status: done
- proximo passo: concluido
- observacoes: planning criado em `docs/planning-bg3-2bpp-conversion.md`; spec criada em `docs/spec-bg3-2bpp-conversion.md`; verificado no codigo que BG `bpp=2` agora usa `bg-pal-base`, aceita multiplas subpaletas de 4 cores, preserva sprite 2bpp limitado a 4 cores, valida range de subpaleta e gera preview 2bpp. Smoke test validado com `node bin/png2snes.js convert to-convert/temple-bg3-final.png --tipo bg --bpp 2 --tile-size 8x8 --dedupe h --bg-pal-base 1 --out-dir /tmp/png2snes-bl008-check --no-print-vram-layout --debug-map`, gerando `.chr`, `.map`, `.pal`, `.gpl` e `-tileset.png`. Bug especifico de subpaleta observada no temple segue separado na BL-010.
