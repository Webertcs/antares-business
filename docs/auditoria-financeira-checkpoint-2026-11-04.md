# ANTARES CRM — Marco de auditoria financeira (2026-11-04)

## Situação
Consultas de leitura concluídas no Neon. Nenhuma função financeira foi modificada nesta rodada. **Não habilitar ANTARES_FINANCE_WRITES_ENABLED ainda.** Preservar a interface; prioridade ao funcionamento.

## Verificações aprovadas
- Funções `antares_create_receivable`, `antares_pay_receivable`, `antares_post_ledger_entry`, `antares_reverse_ledger_entry` existem; SECURITY DEFINER, proprietárias `neondb_owner`, EXECUTE para `neondb_owner` e `antares_team_runtime`.
- `antares_team_runtime`: sem INSERT/UPDATE/DELETE efetivos em `ledger_entries`, `antares_receivables`, `antares_receivable_payments` (9/9 false).
- `neondb_owner` pode INSERT em `business_audit`; runtime não.
- `trg_ledger_immutable` chama `antares_guard_ledger`: bloqueia UPDATE/DELETE; verifica referência, tipo inverso e valor igual para estornos.
- Funções validam capability, owner ativo, organização, valores, idempotência; recebimentos verificam saldo; estorno gera entrada inversa.
- `business_audit` tem id UUID default gen_random_uuid(), created_at default now(), organization_id FK, actor_subject, action, entity_type, entity_id.
- Auditorias de outros módulos existem e inserem em `business_audit` dentro da função. Nenhum registro financeiro apareceu no agrupamento consultado.

## Pendente
1. Guardar exportação externa das definições originais das quatro funções (texto capturado na conversa; arquivo local não confirmado).
2. Preparar migração SQL revisada para inserir auditoria nas funções, apenas em operações novas: `finance_entry_created`, `finance_receivable_created`, `finance_receivable_paid`, `finance_entry_reversed`. Pagamento também gera evento de lançamento por chamar `antares_post_ledger_entry`.
3. Aplicar em transação após backup, confirmar permissões e auditar idempotência; considerar concorrência e rollback.
4. Homologar relatórios, estornos entre meses, contas a receber e escrita controlada antes de habilitar feature flag.
5. Investigar se INSERT direto por papéis privilegiados é necessário; trigger de imutabilidade não autoriza INSERT comum.

## Referência
Repositório: Webertcs/antares-business. Branch de trabalho: feature/bloco-02d-seguranca.
Este arquivo é registro de checkpoint, **não** evidência de migração aplicada.
