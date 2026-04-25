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

## Itens

Adicione novos itens no topo desta secao.

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

## [BL-001] Exemplo de item
- problema: descrever rapidamente o que hoje incomoda ou o que pode ser melhorado.
- prioridade: media
- status: backlog
- proximo passo: criar planning
- observacoes: citar restricoes, comandos, arquivos ou contexto util quando necessario.
