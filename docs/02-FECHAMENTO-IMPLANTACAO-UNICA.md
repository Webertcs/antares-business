# ANTARES BUSINESS — Bloco 02: implantação única controlada
Data: 29/10/2026. Alvo: branch feature/bloco-02d-seguranca, banco Neon neondb.

## Estado atual
- Login proprietário e leitura da equipe comprovados visualmente.
- Migrações 02D + integridade e papel NOLOGIN executados no Neon.
- APIs de convidar, aceitar, revogar e suspender publicadas.
- Rotas de escrita INTENCIONALMENTE BLOQUEADAS até homologação.
- Ainda não passou E2E de segurança nem foi resolvido npm audit de dependências de produção.

## Migração SQL única
1. Backup do banco. Execute `sql/02_FINAL_FUNCOES_RESTRITAS.sql` como neondb_owner.
2. Deve retornar quatro funções com prosecdef=true e owner=neondb_owner.
3. Não execute os scripts 02D anteriores de novo.
4. Antes de permitir que o app conecte, é preciso prover senha privada de LOGIN para antares_team_runtime.
   Não commitar senha em repositório, não compartilhar print da senha, não enviar em chat.
   Com senha forte escolhida pelo administrador, execute no Neon SQL Editor apenas:
   `ALTER ROLE antares_team_runtime LOGIN PASSWORD 'SENHA_GERADA_AQUI';`
   Esse comando só deve ser executado após o administrador substituir o placeholder; a consulta poderá ficar no histórico do editor, então use credencial descartável/rotacionável conforme política de segurança.
   Alternativamente configure a credencial por processo de secrets do serviço.
5. Monte a connection string do mesmo host/banco com usuário antares_team_runtime; guarde somente em `.env.local` como `DATABASE_URL_TEAM_RUNTIME`.
   Evite usar `neondb_owner` ou papel administrativo.
6. `ANTARES_DB_RUNTIME_ROLE=antares_team_runtime`
   `ANTARES_APP_ORIGIN=http://localhost:3000`
   Mantenha `ANTARES_TEAM_WRITES_ENABLED=false` até os testes.
7. Com a role de login, valide de forma independente:
   - `SELECT current_user` retorna antares_team_runtime.
   - `SELECT * FROM public.team_members` retorna permission denied.
   - `SELECT * FROM public.team_invitations` retorna permission denied.
   - funções possuem EXECUTE somente para role de aplicação.
   - tente como outra organização ler/alterar convite de A: deve ser negado (teste de isolamento A/B).
   Execute tais testes em conexão separada, nunca com neondb_owner.
8. Só após confirmação de correções de dependências críticas e testes automatizados, mude a flag de escrita para true em ambiente de homologação e teste emissão/aceite/revogação/suspensão.

## Modelo de confiança e limites
- Funções SECURITY DEFINER são deliberadamente executadas com o owner da função. A role de aplicativo só recebe EXECUTE das quatro rotinas, sem DML direto.
- O parâmetro subject é fornecido pela API após autenticação da sessão Neon Auth verificada, nunca pelo navegador.
- **A role de conexão não faz verificação criptográfica da sessão dentro do banco.** Se DATABASE_URL_TEAM_RUNTIME vazar, um invasor poderia fornecer subject arbitrário às funções. A URL é segredo de alto impacto: somente backend, rotação, monitoramento e controles adicionais são necessários antes de produção comercial.
- Ainda não foi completado onboarding automático de novos proprietários.
- A aplicação continua usando DATABASE_URL administrativo em consultas existentes. Esse padrão precisa ser substituído antes da homologação global do SaaS multitenant.
- Esta implantação **não representa proteção RLS tenant-scoped para todos os módulos do CRM**. Não prometa isso ao cliente.

## Critério de encerramento: obrigatório
Build e lint, teste de role, teste multiempresa A/B, signup+email verificado, emitir/aceitar/revogar/suspender, bloqueio de token expirado, auditoria persistente, dependências sem alertas críticos não mitigados. Somente depois marcar BLOCO 02 homologado e mesclar com main.
