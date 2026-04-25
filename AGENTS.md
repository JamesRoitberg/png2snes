# AGENTS.md — png2snes

## Objetivo do projeto
O `png2snes` é um CLI para converter PNGs indexados em assets prontos para SNES e também centralizar tools auxiliares do pipeline.

O projeto já funciona bem. A prioridade é preservar o que está estável e implementar melhorias ou correções com o menor risco possível.

---

## Regra principal
Faça mudanças pequenas, incrementais e testáveis.

Nunca faça refactors grandes por iniciativa própria.  
Nunca “aproveite” uma task para reorganizar partes não relacionadas.  
Nunca altere comportamento existente sem antes confirmar no código onde esse comportamento começa e onde ele termina.

---

## Modo de trabalho obrigatório

### 1. Entender antes de editar
Antes de alterar qualquer arquivo:

- leia o arquivo alvo inteiro
- identifique imports, exports, funções chamadas e funções que ele expõe
- descubra quem chama essa lógica
- descubra quais arquivos dependem dela
- descubra efeitos colaterais, formatos de entrada, formatos de saída e mensagens de erro
- só então proponha a mudança

Não assuma comportamento.  
Não conclua “provavelmente é assim”.  
Vá verificar no código.

### 2. Mapear impacto antes da mudança
Para qualquer mudança, primeiro escreva um mapa curto de impacto:

- arquivo principal a alterar
- arquivos dependentes lidos para entendimento
- comportamento atual
- comportamento desejado
- entradas da funcionalidade
- saídas da funcionalidade
- o que essa mudança pode afetar
- risco de quebra
- como validar

Isso vale para qualquer funcionalidade, antiga ou nova.

Antes de mexer em uma funcionalidade, entenda claramente:

- onde ela começa
- quais dados recebe
- o que processa
- o que devolve
- quais arquivos ou fluxos dependem dela
- quais comportamentos podem ser alterados indiretamente

### 3. Mudar o mínimo possível
Prefira:

- alterar 1 arquivo
- no máximo poucos arquivos
- manter nomes, fluxos e interfaces existentes
- preservar compatibilidade

Não espalhe a solução em vários arquivos se ela puder ficar concentrada no ponto certo.

### 4. Fazer em etapas
Sempre que possível, trabalhe assim:

- etapa 1: análise e impacto
- etapa 2: pequena mudança
- etapa 3: validação
- etapa 4: só depois considerar próxima etapa

Não faça múltiplas mudanças grandes de uma vez.

### 5. Sempre permitir teste
Toda mudança deve deixar um caminho claro de validação manual.

Sempre descreva:

- qual comando rodar
- qual arquivo usar como exemplo
- o que deve acontecer
- o que não deve mudar

---

## Fluxo de planejamento antes da implementação

Neste projeto, diferencie sempre quatro fases:

1. backlog
2. planejamento
3. especificação
4. implementação

Não pule direto para código quando ainda houver dúvida sobre o melhor caminho.

### Quando usar backlog
Use `docs/backlog.md` quando a task ainda for uma ideia futura, algo sem prioridade imediata ou uma melhoria que ainda não está pronta para entrar em planning.

Exemplos:
- ideia boa para o futuro, mas ainda não é a hora
- melhoria percebida durante outra task
- possível ajuste sem direção clara ainda
- tema que depende de decisão posterior de prioridade

Ao usar backlog:

- não implemente ainda
- não transforme em código no mesmo passo
- registre problema, prioridade, status e próximo passo
- mova para planning quando for hora de discutir direção
- mova para spec quando a direção já estiver escolhida e o item estiver pronto para implementação segura

### Quando usar planning
Use `docs/planning-template.md` quando a task começar como ideia, dúvida de direção ou melhoria com mais de uma solução possível.

Exemplos:
- melhorar UX
- escolher entre abordagens diferentes
- decidir onde a funcionalidade deve ficar
- avaliar esforço, risco e impacto
- decidir se vale criar tool separada ou integrar em fluxo existente

Ao usar planning:

- não implemente ainda
- compare opções
- recomende o caminho mais simples e seguro
- mostre a análise ao usuário
- aguarde aprovação antes de seguir

### Quando usar spec
Use `docs/spec-template.md` quando a direção já estiver escolhida e a próxima pergunta for como implementar com segurança.

Exemplos:
- corrigir um bug já bem definido
- implementar a opção aprovada no planning
- adicionar uma nova tool já decidida
- ajustar uma funcionalidade existente com objetivo claro

Ao usar spec:

- defina problema, objetivo, entradas, saídas, impacto, arquivos a ler, arquivos a alterar, risco e validação
- mostre a spec ao usuário
- aguarde aprovação antes de codar

### Ordem correta do fluxo
Siga esta ordem sempre que fizer sentido:

- ideia futura ou sem prioridade -> backlog
- backlog ou dúvida de direção -> planning
- solução escolhida -> spec
- implementação aprovada -> código
- validação -> parar

### Regra de aprovação
A menos que o usuário peça explicitamente para seguir direto:

- registre no backlog quando a ideia ainda for futura ou não estiver madura
- mostre o planning antes de propor implementação quando ainda houver dúvida de direção
- mostre a spec antes de editar quando a solução já estiver definida
- só depois implemente

### Exceção para mudanças triviais
Se a task for realmente pequena, localizada e de risco muito baixo, não é obrigatório usar planning nem spec completa.

Mesmo assim, antes de editar, informe:

- objetivo
- arquivos lidos
- arquivo(s) a alterar
- risco
- como validar

### Regra de transição entre planning e spec
Se um planning for aprovado, transforme a opção escolhida em spec antes de começar o código.

Não pule de planning aprovado direto para implementação.

---

## Diretriz de arquitetura para novas funcionalidades

Sempre que possível, implemente novas funcionalidades como unidades separadas.

Prefira este caminho:

- criar uma tool, módulo ou arquivo separado para a nova funcionalidade
- manter a lógica da funcionalidade isolada
- fazer o CLI apenas chamar ou integrar essa nova parte
- evitar misturar lógica nova dentro de fluxos antigos sem necessidade

Objetivo:

- mexer o mínimo possível no que já funciona
- reduzir risco de regressão
- facilitar leitura, manutenção e testes
- permitir evolução por partes

Se a nova funcionalidade puder existir separada sem piorar a arquitetura, siga esse caminho.

Só integre diretamente dentro de código antigo quando houver motivo claro e concreto para isso.

---

## Restrições importantes

### Não quebrar compatibilidade
Este projeto possui CLI principal e também mantém compatibilidade com fluxos/comandos antigos.

Ao mudar qualquer parte do hub, das opções ou da execução, preserve o comportamento já existente, a menos que a task peça explicitamente para mudar isso.

### Não adicionar complexidade sem necessidade
Evite:

- novas dependências
- abstrações extras
- camadas novas
- refactors estruturais
- “frameworkizar” o projeto
- IA dentro do runtime do CLI

Só adicione algo novo se houver ganho real, imediato e claro para manutenção ou segurança da mudança.

### Não inventar comportamento
Não crie novas regras implícitas.  
Não mude defaults sem necessidade.  
Não altere formatos de saída, nomes de arquivos ou convenções do fluxo sem verificar onde isso impacta.

### Não corrigir além do escopo
Ao encontrar outros problemas fora da task:

- registre brevemente
- não corrija no mesmo patch, a menos que seja indispensável para a mudança atual

---

## Como pensar por área

### `bin/`
Entrada principal do CLI.  
Mudanças aqui afetam comandos, parsing, fluxo do hub e compatibilidade legada.  
Qualquer alteração exige leitura cuidadosa dos fluxos conectados.

### `src/`
Core da conversão e da orquestração.  
Mudanças aqui podem afetar comportamento real de conversão, sequence, discovery e opções.  
Antes de editar, leia chamadas e dependências relacionadas.

### `src/cli/`
Camada sensível porque conecta entrada do usuário, inferência, resumo, preview e execução.  
Mudanças aqui devem preservar previsibilidade do CLI.

### `tools/`
Tools auxiliares legadas.  
Antes de mexer, confirme se também são chamadas pelo hub principal ou por scripts/documentação.

### `scripts/`
Scripts auxiliares simples.  
Evite duplicar lógica aqui que já exista no core.

---

## Regras para qualquer funcionalidade

Sempre trate qualquer funcionalidade como um fluxo com entradas, processamento, saídas e impacto.

Antes de alterar uma funcionalidade existente, descubra:

- onde ela é chamada
- quem depende dela
- quais opções, flags, argumentos ou arquivos entram nela
- quais resultados, arquivos, mensagens ou efeitos ela produz
- o que pode quebrar se esse comportamento mudar

Antes de criar uma funcionalidade nova, defina com clareza:

- qual problema ela resolve
- qual será sua entrada
- qual será sua saída
- onde ela deve ficar
- como o CLI vai chamá-la
- como validar que ela não afetou funcionalidades existentes

Não altere uma funcionalidade sem primeiro entender seu contrato real no código.

---

## Formato esperado de resposta do agente ao trabalhar neste repo

Antes de editar, responda de forma curta com:

1. objetivo da mudança
2. arquivos lidos para entendimento
3. entradas e saídas da funcionalidade envolvida
4. arquivo(s) que realmente precisam ser alterados
5. risco de quebra
6. como validar

Depois disso, faça a menor mudança possível.

Ao terminar, responda com:

1. o que mudou
2. quais arquivos foram alterados
3. o que foi deliberadamente mantido sem mudança
4. como testar
5. riscos restantes

---

## Estilo de mudança
Prefira patches pequenos e fáceis de revisar.

Prefira preservar:

- nomes
- interfaces
- organização atual
- fluxo mental do projeto

Evite mudanças “bonitas” que aumentem risco.  
Neste projeto, clareza e segurança valem mais do que refactor ambicioso.

---

## Quando parar e pedir nova etapa
Pare após concluir uma etapa pequena e testável quando:

- a mudança começar a exigir vários arquivos
- o impacto ficar incerto
- aparecer risco de quebrar compatibilidade
- a task começar a virar refactor
- faltar evidência de como o comportamento atual funciona

Nesses casos, entregue primeiro a análise e proponha a próxima etapa em vez de continuar expandindo o escopo.

---

## Resumo operacional
Neste repositório:

- primeiro entender
- depois registrar no backlog quando for ideia futura
- depois mapear impacto
- depois decidir o caminho
- depois especificar
- depois mudar pouco
- depois validar
- depois parar

Sempre que possível:

- funcionalidade nova em unidade separada
- integração mínima no CLI
- preservação máxima do que já funciona

A regra é conservar o que já funciona e evoluir com calma.

## Regras para commit 

- Não executar Git que escreve sem pedido explícito
- Pode usar `git add` e `git commit` quando o usuário pedir explicitamente
- Commits devem seguir Conventional Commits
- Não rodar `git pull`, `git reset`, `git restore`, `git rebase`, `git merge` ou equivalentes sem pedido explícito
- Não rodar `git push`, deixa esse comando com o usuário
- Pode preparar código para commit, limpar comentários provisórios e remover restos claramente ligados à tarefa atual quando isso for seguro
