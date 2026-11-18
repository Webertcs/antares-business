# ANTARES BUSINESS — Mapa validado do Neon (18/11/2026)

> Inventário **parcial, focado no fluxo Contato → Proposta → Reserva → Encerramento**,
> documentado a partir de consultas SQL realizadas no Neon *production* e do código SQL do repositório.
> Não confundir com exportação integral do banco. Não contém credenciais nem dados pessoais.

## Ambiente e recuperação
- Projeto Neon: `antares-business`; banco: `neondb`; principal: `production`.
- Branch de recuperação criada em 18/11/2026: `homologacao-antares-15a-20261118` (parent `production`). A branch isola os dados no instante da criação; não equivale a backup incremental.
- Estado confirmado em 18/11: 8 reservas em `antares_proposal_reservations`, 2 sem ligação em `antares_presentation_event_links`.
- Importante: dados posteriores à criação da branch de recuperação podem não estar disponíveis numa restauração.

## Estruturas relevantes (confirmadas)
- `business_proposals`: propostas comerciais, incluem `event_id`, `client_id`, `title`, `expected_attendees`, `pricing_model`, `unit_price`, `fixed_price`, `status`.
- `antares_proposal_reservations`: ligação proposta → apresentação com `organization_id`, `proposal_id`, `presentation_id`.
- `presentations`: apresentação operacional, `starts_at`, `ends_at`, `dome_id`, `status`; possui múltiplas restrições de não sobreposição por cúpula. **Não removê-las.**
- `antares_presentation_event_links`: ligação apresentação → `crm_events`; PK `(organization_id,presentation_id)` e UNIQUE `(organization_id,event_id)`, com FKs compostas. Já existe em produção.
- `crm_events`: `id` UUID gerado; obrigatórios sem default: `organization_id`, `client_id`, `title`; obrigatórios com default: `event_kind='presentation'`, `pricing_model='per_student'`, `status='lead'`; `created_at` default `now()`. Também contém `event_date`, `start_time`, `end_time`, `dome_id`, `expected_attendees`, `price_per_person`, `fixed_amount`, `archived_at`, `cancellation_reason`.
- `crm_events.status` permite `lead`, `quoted`, `reserved`, `confirmed`, `completed`, `cancelled`.
- `presentations.status` permite `reserved`, `confirmed`, `completed`, `cancelled`.
- `antares_domes`: `id`, `organization_id`, `name`, `code`, `capacity`, `notes`, `active`, `created_at`, `updated_at`, `retired_at`.
- `antares_dome_links`: `organization_id`, `antares_dome_id`, `equipment_id`.
- `equipment`: `id`, `organization_id`, `name`, `category`, `asset_code`, `active`, `notes`, `created_at`.
- `team_members`: `id`, `organization_id`, `auth_subject`, `full_name`, `email`, `role`, `active`, `created_at`.
- `business_audit`: obrigatórios `organization_id`, `actor_subject`, `action`, `entity_type`, `entity_id`; UUID e timestamp automáticos.
- `antares_reservation_changes` **não existia** no levantamento pré-15A; 15A pretende criá-la para registrar cancelamentos e reagendamentos.

## Segurança validada
- `antares_book_proposal` e `antares_close_event` pertencem a `neondb_owner` e usam `SECURITY DEFINER`.
- Role `antares_team_runtime`: `rolcanlogin=true`, `rolsuper=false`, `rolbypassrls=false`.
- Integrações novas 15A devem ter funções `SECURITY DEFINER` com dono `neondb_owner`, `PUBLIC EXECUTE` revogado e concessão de EXECUTE apenas ao runtime. As tabelas internas não devem ficar acessíveis diretamente ao runtime.

## Fluxo e cuidados
- A Central de Atendimento mantém **7 ações visíveis**: Ficha, WhatsApp, PDF, Contrato, Ver reserva, Financeiro e Conclusão.
- Cancelamento de reserva: motivo e confirmação; arquivamento da operação; preservação do financeiro; sem reembolso automático.
- Reagendamento: validar cúpula ativa, capacidade, disponibilidade, novo período futuro, histórico auditável.
- Conclusão: somente após fim da apresentação, registrar alunos reais; não confundir cancelamento com apresentação concluída.
- Duas reservas sem vínculo operacional não devem ser modificadas por SQL automático de backfill. O vínculo deve ser criado por fluxo autorizado.

## Arquivos técnicos
- `sql/15A_RESERVA_EVENTO_CANCELAMENTO_REAGENDAMENTO.sql`: migração principal.
- `sql/15A_TESTE_ROLLBACK_PRODUCAO.sql`: simulação transacional, com ROLLBACK.
- `sql/15A_DIAGNOSTICO_SOMENTE_LEITURA.sql`: diagnóstico original.

## Pendente
- Rodar simulação 15A no Neon e conferir resultado do ROLLBACK e contagens.
- Implantar 15A na produção **apenas se simulação e revisão final forem aprovadas**.
- Testes funcionais de reserva, vínculo, cancelamento, reagendamento, conclusão e auditoria.
- Cadastro do proprietário por e-mail; ainda não recebido nesta conversa.
