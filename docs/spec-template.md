# Spec Template — png2snes

## Título
Nome curto da mudança.

## Tipo
Escolha um:
- bugfix
- melhoria
- nova tool
- ajuste de CLI
- refactor pequeno

## Contexto
Explique em poucas linhas o problema ou necessidade.

## Objetivo
Descreva claramente o que esta mudança deve resolver.

## Não mudar
Liste o que deve continuar igual.

Exemplos:
- compatibilidade com comandos antigos
- formato de saída existente
- comportamento de tools não relacionadas
- nomes de arquivos gerados
- defaults já usados pelo projeto

## Funcionalidade envolvida
Descreva a funcionalidade afetada.

### Entradas
Quais argumentos, arquivos, opções ou dados entram.

### Saídas
Quais arquivos, mensagens, retornos ou efeitos ela produz hoje.

### Saídas desejadas
Quais arquivos, mensagens, retornos ou efeitos ela deve produzir após a mudança.

### Impacto
O que essa mudança pode afetar indiretamente.

## Arquivos para ler antes de editar
Liste os arquivos que precisam ser lidos para entendimento.

## Arquivos que devem ser alterados
Liste somente os arquivos realmente necessários para a mudança.

## Estratégia
Descreva a menor abordagem possível.

Preferência:
- criar funcionalidade nova em unidade separada quando fizer sentido
- integrar no CLI com o mínimo de mudanças
- evitar refactor fora do escopo
- preservar nomes, interfaces e fluxo atual

## Risco de quebra
Escolha um:
- baixo
- médio
- alto

Explique brevemente o motivo.

## Validação manual
Liste como testar.

Modelo:
1. comando a rodar
2. arquivo de entrada para teste
3. resultado esperado
4. o que deve continuar funcionando igual

## Etapas
1. análise
2. mudança pequena
3. validação
4. parar