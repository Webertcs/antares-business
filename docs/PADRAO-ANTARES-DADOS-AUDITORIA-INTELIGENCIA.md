# Padrão ANTARES — decisões orientadas por dados

**Aprovado em 29/10/2026.** Aplicável à concepção de todos os projetos futuros; adaptar a profundidade à complexidade e à natureza de cada produto.

## Princípios não negociáveis
1. **Auditabilidade:** mudanças relevantes deixam rastros verificáveis: tenant, ator, ação, alvo, data UTC, identificador de correlação e antes/depois apenas quando seguro. Não registrar senhas, tokens, conteúdo sensível ou dados pessoais desnecessários. Auditoria imutável para usuários comuns.
2. **Fonte da verdade:** registros operacionais consistentes, com identificadores, estados e regras de transição. Evitar KPI calculado a partir de cards de demonstração ou registros duplicados.
3. **Isolamento de dados:** todas as leituras e gravações autorizadas por organização no backend; testes de acesso cruzado; RLS e papéis de banco revisados.
4. **Indicadores explicáveis:** documentar definição, fórmula, fonte, unidade, janela, atualização, filtros e limitações; distinguir receita contratada, faturada, recebida e lucro; custos diretos vs fixos; não misturar competência com caixa.
5. **Qualidade dos dados:** validação no ingresso, campos obrigatórios, checagem de duplicidade, rastreamento de ausência e estornos; sem excluir histórico financeiro para "corrigir" resultado.
6. **IA responsável:** recomendações só com dados suficientes, fonte e justificativa; expressar incerteza, nunca inventar causalidade ou lucro líquido, revisão humana para decisões importantes; não automatizar cobranças/cortes.
7. **Privacidade/LGPD:** finalidade, minimização, retenção, controles de acesso, consentimento/base legal quando aplicável; exports com autorização e log.
8. **Entrega por blocos:** migração versionada, API testável, interface, testes por perfil/tenant, documentação, rollback e homologação antes do merge.

## ANTARES INTELLIGENCE — Bloco 07
Entrada de navegação: **Relatórios & Inteligência** (visível ao proprietário; colaboradores apenas se autorizados numa futura matriz granular).

### 07A — Relatórios determinísticos
- Financeiro: receita prevista / realizada / recebida; despesas previstas / pagas; margem por apresentação, escola e categoria; inadimplência e tendência.
- Comercial: propostas enviadas, conversões, tempo até fechamento, receita por origem, recompra, escolas inativas.
- Operação: ocupação da agenda, taxa de utilização das cúpulas, cancelamentos, quilômetros/custos de deslocamento quando disponíveis.
- Comparativos e filtros: período, cliente, tipo de evento, equipamento e equipe; CSV/PDF com autoria e filtros.
- Alertas de qualidade: valores sem categoria, apresentações sem fechamento, registros atrasados e dados insuficientes.

### 07B — Insights explicáveis
- Regras determinísticas e comparações: "custos de deslocamento aumentaram X% vs período anterior" com fórmula, períodos e n.
- Recomendação sempre com dados-base, hipótese, impacto estimado (quando justificável), limitação e ação sugerida.
- IA generativa pode redigir explicações, **não** calcular indicadores financeiros por conta própria.

### 10 — IA avançada (futura)
- Previsão de demanda e sazonalidade após histórico suficiente; validação temporal, métricas de erro e monitoramento de drift.
- Nunca publicar previsão sem qualidade e intervalo de confiança adequados.

## Preparação desde os Blocos 02D–06
- 02D–02F: autenticação, autorização, organização, auditoria e segurança verificadas.
- 03: CRM captura origem, status, datas e histórico de contato.
- 04: propostas e contratos com versões e estados; valores separados (proposto, negociado, fechado).
- 05: operação com reservas, apresentações realizadas/canceladas e recursos alocados.
- 06: lançamentos financeiros imutáveis/estornáveis e classificação; separar regime de caixa e competência.
- **Proibição:** nenhum painel de relatório apresentar números de demonstração como reais.

## Dicionário inicial de métricas (evolutivo)
| KPI | Fórmula | Base | Atenção |
|---|---|---|---|
| Receita recebida | soma de entradas liquidadas menos estornos | financeiro | diferenciar competência |
| Despesa paga | soma de saídas liquidadas menos estornos | financeiro | separar investimentos |
| Saldo de caixa operacional | recebimentos - pagamentos operacionais | financeiro | não equivale a lucro |
| Margem de contribuição | (receita atribuída - custos variáveis atribuídos) / receita atribuída | contratos + operações + financeiro | não é lucro líquido |
| Conversão comercial | propostas fechadas / propostas elegíveis no período | propostas | definir coorte e cancelamentos |
| Utilização da cúpula | horas efetivamente utilizadas / horas disponíveis declaradas | equipamento + agenda | depende de disponibilidade cadastrada |

## Critérios de aceite para Bloco 07
- Indicadores reconciliam com lançamentos e contratos em cenários de teste.
- Filtros não misturam organizações; exportações obedecem papéis.
- Dados ausentes causam aviso claro, não números inferidos.
- Auditoria registra geração e exportação quando pertinente, sem despejar PII em logs.
- Desempenho e acessibilidade adequados em celular e desktop.

## Especificação aprovada — tela Relatórios (29/10/2026)

### Filtros globais
- Período: este mês, últimos três meses, ano atual, datas personalizadas.
- Comparação: período imediatamente anterior, mesmo período do ano anterior.
- Região/cidade, tipo de cliente (escola pública, particular, empresa e outros), escola, cúpula e tipo de evento.
- Os filtros devem ser aplicados também às exportações, respeitando fuso da organização e isolamento por tenant.

### Indicadores de topo
Receita no período (com seletor de base: contratada, faturada, recebida), apresentações **realizadas**, ticket médio (definir denominador), conversão de propostas e **margem de contribuição** com custos classificados. Não denominar margem de contribuição de lucro líquido.

### Relatórios
1. Receita & vendas: série temporal, receita por escola, ranking de clientes e segmento.
2. Agenda & ocupação: disponibilidade registrada, utilização, dias mais cheios e ociosidade.
3. Performance por escola: ranking, recorrência, comparação por período e margem por atendimento.
4. Funil de vendas: etapas, quantidades, conversão e tempo médio com critérios de coorte.
5. Financeiro detalhado: entradas/saídas, categorias, estornos, margem, contas pendentes e conciliação.
6. Contratos: fechados, em negociação, pendentes, cancelados e valores por estado.
7. Equipe/deslocamento: opcional conforme dados; custo de viagens por evento, por km e região quando documentado.
8. Qualidade dos dados: métricas incompletas, custos não atribuídos, duplicidades e alertas de confiabilidade.

### Interação e exports
- Gráficos selecionáveis, filtros compartilhados com tabelas detalhadas, navegação até registros de origem.
- PDF de apresentação com logo do planetário e data/filtros/fonte, gerado no servidor.
- Excel (.xlsx) com abas, dados tabulares, fórmulas auditáveis e metadados dos filtros.
- Histórico de exportações por usuário/organização quando pertinente, com retenção conforme LGPD.

### Diferenciais para planetário móvel
- Rentabilidade por apresentação/rota/cúpula, distinguindo receita e custos diretos.
- Sazonalidade escolar, campanhas e oportunidades por cidade.
- Explicações/alertas com indicadores verificáveis; IA não preenche lacunas nem inventa causalidade.

### Ordem de implementação
- Blocos 02D–06: captura padronizada, isolamento de organizações, auditoria e qualidade de dados.
- **07A:** filtros, KPIs e relatórios determinísticos conectados aos dados reais.
- **07B:** comparação, exportação PDF/Excel e insights baseados em regras transparentes.
- **10:** IA avançada e previsões após histórico suficiente e validação.
