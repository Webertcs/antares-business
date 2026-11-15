# 02D — Portão de implantação após migração no Neon

A migração `sql/02d_IMPLANTACAO_UNICA.sql` foi executada no console em 29/10/2026, conforme confirmação do usuário. As rotas do sistema ainda ficam **bloqueadas**.

## Proteção adicional implementada nesta branch

POST de emitir convite, aceitar convite e suspender membro verifica:
- chave `ANTARES_TEAM_WRITES_ENABLED=true` (por padrão ausente => 503);
- `ANTARES_APP_ORIGIN` configurado e HTTP Origin idêntico;
- tipo JSON;
- `ANTARES_DB_RUNTIME_ROLE` fixado e idêntico ao `current_user` da conexão;
- papel runtime **não superusuário, sem BYPASSRLS e não proprietário** das tabelas team_members, team_invitations, team_security_events;
- RLS habilitado em todas; ao menos uma política cadastrada.

Isso é uma barreira preventiva, **não prova isolamento entre organizações**. Políticas de cada tabela e grants mínimos precisam de testes reais. Nenhuma credencial de produção deve ser colocada no repositório.

## Próxima migração necessária
- Criar papel runtime exclusivo, sem privilégios de dono.
- Configurar políticas RLS com isolamento efetivo, avaliando a arquitetura de contexto de tenant para o driver HTTP Neon.
- Garantir acesso controlado a `organizations` e consulta de memberships.
- Grants mínimos para as funções; funções SECURITY INVOKER precisam direitos apropriados em tabelas.
- Rate limiting, proteção contra pedidos simultâneos e uma tabela de convites pendentes com revogação.
- Auditar também emissão e revogação de convites (atualmente a tabela de auditoria especializada registra aceite e suspensão).
- Avaliar impacto das 10 vulnerabilidades do grafo de autenticação.

## Não fazer agora
Não configurar flags true, não trocar DATABASE_URL e não misturar dados de outros planetários enquanto os testes de autorização não estiverem concluídos.

## Verificação de compilação
`git pull origin feature/bloco-02d-seguranca`
`npm.cmd run build`
