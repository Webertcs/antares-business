# Bloco 02D — Separação das conexões PostgreSQL

**Alteração efetiva na branch:** todas as operações mutáveis de equipe agora usam `DATABASE_URL_TEAM_RUNTIME` via `getTeamWriteDb()`. A consulta legada do dashboard/equipe permanece em `DATABASE_URL` até que o esquema de permissões seja migrado sem interromper o proprietário.

## Requisitos antes de habilitar
1. Criar papel login **não proprietário**, sem SUPERUSER/BYPASSRLS, senha longa gerenciada no Neon e permissões mínimas.
2. Configurar políticas RLS de `team_members`, `team_invitations`, `team_security_events`, `organizations` e demais tabelas, mantendo o banco inacessível ao tenant errado.
3. Revisar funções existentes: atualmente são `SECURITY INVOKER`; o papel restrito precisará de permissões específicas ou funções seguras projetadas separadamente. **Não conceder acesso amplo às tabelas para “fazer funcionar”.**
4. Testar isolamento com organizações A e B, funções de convite/revogação/suspensão, autenticação e auditoria.
5. Configurar **somente no ambiente seguro**, nunca no GitHub, `DATABASE_URL_TEAM_RUNTIME`, `ANTARES_DB_RUNTIME_ROLE`, `ANTARES_APP_ORIGIN`.
6. Apenas depois dos testes, configurar `ANTARES_TEAM_WRITES_ENABLED=true`.

**Situação atual:** sem a nova conexão, POST retorna 503 e nenhuma função de equipe é executada. Não inserir URL de banco privilegiada como `DATABASE_URL_TEAM_RUNTIME`; o guard rejeita papéis donos e com BYPASSRLS.

**Pendências relevantes:** correção de falhas críticas nas dependências de autenticação, auditoria de convite emitido, políticas por tenant com contexto íntegro e prevenção contra tentativas abusivas.

**Nada neste arquivo deve ser interpretado como autorização para publicar o SaaS com múltiplos planetários.**
