# ANTARES CRM — Homologação do núcleo financeiro (2026-11-04)

## Evidências reportadas pelo Neon SQL Editor
- Migração transacional `scripts/sql/2026-11-04-finance-audit.sql` aplicada: BEGIN + 4 CREATE OR REPLACE FUNCTION + COMMIT, execução bem-sucedida.
- Consulta pós-migração confirmou `AUDITORIA INSTALADA` nas quatro funções.
- Teste de token inválido: rejeitado; transação desfeita com ROLLBACK.
- Teste de lançamento de R$ 10: primeiro lançamento criado; repetição reconhecida como idempotente; uma auditoria; ROLLBACK.
- Teste de título R$ 100, pagamento parcial R$ 40, repetição, estorno e repetição do estorno: aviso `TESTE APROVADO: titulo, pagamento parcial, idempotencia, estorno e 4 auditorias corretos`; ROLLBACK.
- Todos os testes acima executados na branch production do Neon; transações de teste foram revertidas.

## Status
Núcleo financeiro e auditoria: **testes SQL aprovados**. Não significa que a integração web, relatórios, conciliação mensal ou controles de origem tenham sido homologados.
`ANTARES_FINANCE_WRITES_ENABLED` deve permanecer desativado até os testes de integração.
Próximo bloco: verificar relatórios, saldos e contas a receber na interface; depois testar API com conta owner em ambiente controlado. Não mexer na lataria.
