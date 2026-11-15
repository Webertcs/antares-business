# 02F — Isolamento multempresa: plano de aplicação segura

## Diagnóstico observado no Neon — 29/10/2026
- `organizations`, `team_members`, `audit_events` existem com rowsecurity=true.
- `team_invitations` ainda não existe.
- `SELECT * FROM pg_policies WHERE schemaname='public'` retornou 0 linhas.
- O SQL Editor usa `neondb_owner`, que também é dono das tabelas.

RLS sem políticas nega acesso a um papel comum, mas **não restringe automaticamente o dono** das tabelas. Portanto, apenas ligar RLS não demonstra isolamento. Isso não prova vazamento: as APIs atuais impõem algumas verificações por tenant.

## Contenção aplicada ao código
As rotas POST /api/equipe/convites, /api/equipe/convites/aceitar e /api/equipe/suspender são bloqueadas com 503 por padrão. Só funcionam com `ANTARES_TEAM_WRITES_ENABLED=true`, após homologação. No modo liberado, também exigem origem HTTP idêntica a `ANTARES_APP_ORIGIN` em produção e Content-Type application/json. **Não configurar true agora**.

## Arquitetura alvo — antes de ativar escritas
1. Criar/usar branch de homologação Neon com backup e preservar o projeto de produção.
2. Criar papel de runtime restrito (sem propriedade das tabelas, sem BYPASSRLS e com grants mínimos), e manter credenciais somente no servidor. Credencial de manutenção/migrações não deve ser usada em requisições do aplicativo.
3. Projetar políticas RLS por tabela; vincular tenant a contexto de banco **apenas em transação**, definido a partir do usuário autenticado e validado no backend. É necessário testar que contexto ausente ou adulterado nega tudo. O contexto é confiável somente quando o papel que o define é controlado pelo servidor; não expor SQL genérico ao cliente.
4. Remover uso de conexão de proprietário para as rotas de negócio, proteger funções e revogar EXECUTE público. Não usar SECURITY DEFINER sem auditoria independente.
5. Identificar estrutura real de `audit_events` e registrar atos de equipe na **mesma transação**. Impedir UPDATE/DELETE por papéis de runtime.
6. Criar índices de unicidade para identidades ativas e convites pendentes, revisar concorrência, rate limiting, CSRF e tokens.
7. Aplicar migrações 02D e testar proprietário, colaborador, tenant A/B, convite usado/expirado, suspensão, sessão revogada e funções não executáveis por papel público.
8. Resolver alertas críticos de dependência antes de liberar usuários externos.

## Critério de aceite
- Testes de acesso negado entre dois tenants passam **na API e no SQL com papel runtime**.
- Proprietário mantém login, dashboard e listagem; colaborador recebe apenas papel permitido.
- Registro auditável de todas as mutações.
- Não existem credenciais de banco privilegiadas no frontend nem no repositório.
- Não há vulnerabilidade crítica de produção sem correção/mitigação documentada.

Não executar os SQLs de proposta 02D no Neon principal antes dessas verificações.
