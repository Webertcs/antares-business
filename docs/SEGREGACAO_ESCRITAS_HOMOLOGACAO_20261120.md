# ANTARES — segregação de duas escritas legadas (rascunho, 20/11/2026)

**Estado: PR técnico em homologação. NÃO executar migração ou ativar gravações em produção.**

## O que mudou
- `PATCH /api/agenda`: não usa mais `getDb()` para alterar `crm_events`. A operação passa por `antares_update_unlinked_event_schedule` usando `DATABASE_URL_TEAM_RUNTIME`.
- `POST /api/clientes/contratos/dados-juridicos`: não usa mais `getDb()` para fazer UPSERT. Passa por `antares_save_legal_profile` com a mesma conexão restrita.
- As consultas `GET` **permanecem na conexão geral**. Este PR NÃO resolve a migração de `DATABASE_URL` para uma role de leitura limitada.
- Novas gravações ficam **bloqueadas por padrão**. A flag já existente `ANTARES_AGENDA_WRITES_ENABLED` protege a Agenda; `ANTARES_LEGAL_PROFILE_WRITES_ENABLED` é nova, e deve ficar ausente ou `false` até homologação.
- O código verifica `current_user=antares_team_runtime`, ausência de `BYPASSRLS`, ausência de DML direto e função `SECURITY DEFINER` pertencente a `neondb_owner`, com `EXECUTE` não concedido a `PUBLIC`.

## Script proposto, não executado
`scripts/63-segregacao-escritas-homologacao.sql` cria apenas funções e grants controlados, sem gravar eventos/clientes. Requer revisão humana do esquema real (tipos de horário e índices parciais de perfis jurídicos) e snapshot antes de executar **apenas** na branch Neon `homologacao-antares-15a-20261118`.

## Ordem de homologação (sem atalhos)
1. Confirmar banco e autenticação exclusivamente da branch Neon de homologação, nunca a produção.
2. Revisar SQL 63 e schema instalado; executar somente com snapshot aprovado. O código novo só deve ser usado depois de instalar as funções.
3. Com as flags `false`, verificar que POST/PATCH são rejeitados sem modificar dados.
4. Testar a role `antares_team_runtime` com permissões exclusivamente EXECUTE, sem DML direto.
5. Ativar flags **somente no Deploy Preview** após isolar também `DATABASE_URL`. Testar owner, collaborator, conta anônima, ID de outra organização, evento vinculado, cúpula inativa e dados jurídicos.
6. Executar `node --test tests/segregacao-escritas.test.mjs`, `node --test tests/entrega-visual.test.mjs`, `npm run build` e auditoria de dependências.
7. Não liberar merge/deploy definitivo enquanto PR #2, PR #4, conexão geral de leitura e alertas de dependências não estiverem resolvidos.

## Critérios de bloqueio
- Nunca copiar `DATABASE_URL` da produção para Deploy Previews.
- Nunca usar `neondb_owner` como `DATABASE_URL_TEAM_RUNTIME`.
- Nunca ativar flags na Production antes da homologação.
- Se houver divergência no schema real, o SQL deve ser revisado antes da execução. Não adaptar ou desabilitar RLS às cegas.
- O código autentica o subject no servidor; as funções verificam vínculo owner com a organização. Esta defesa segue o modelo atual do ANTARES, mas **não substitui** testes de autorização fim a fim nem proteção de credencial do runtime.

**Este documento não declara o CRM pronto para entrega.**
