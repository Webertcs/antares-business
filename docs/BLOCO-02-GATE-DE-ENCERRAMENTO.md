# Bloco 02 — Gate de encerramento (não homologado)

## Entregas já comprovadas
- Dashboard/login e consulta de equipe funcionaram com proprietário real.
- Build local Next.js/TypeScript passou.
- Migração 02D instalada no Neon, conforme histórico da execução no SQL Editor.
- Papel `antares_team_runtime` sem login criado e grants de leitura mínimos sob RLS sem políticas (default deny).
- As rotas POST continuam desabilitadas por padrão.

## Falhas bloqueantes (nenhuma pode ser ignorada)
1. `antares_team_runtime` é NOLOGIN: **não pode ser usado em DATABASE_URL_TEAM_RUNTIME**. Falta criar uma identidade de login separada, com credencial fora do GitHub.
2. RLS ainda não tem políticas tenant-scoped; SELECT restrito no papel não basta para a API funcionar.
3. As funções atuais são SECURITY INVOKER; não têm grants de execução e DML suficientes para o novo papel. Não conceder DML global apenas para remover 503.
4. `requireMember` usa conexão legada DATABASE_URL possivelmente proprietária. Futuras APIs de negócios não podem reutilizar esse padrão sem proteção explícita.
5. O guard de segurança verifica apenas presença de política, não demonstra isolamento real; testes A/B precisam ser feitos.
6. A conta Neon Auth beta ainda apresenta 10 alertas de npm audit (6 low / 3 high / 1 critical no resultado informado). CI bloqueará PR enquanto os altos/críticos persistirem.
7. Ainda falta cadastro autônomo de novos proprietários, convite aceito com email verificado, revogação completa e testes reais de suspensão.
8. Não há teste automatizado das transições de equipe nem prova de auditoria completa (inclui emissão/revogação).

## Sequência de fechamento sem microblocos
1. Definir arquitetura de sessão -> autorização tenant -> execução SQL com role restrito e RLS correto.
2. Fornecer migração única versionada que cria login runtime, grants e políticas sem senha registrada no código, com rollback.
3. Atualizar APIs e UI para esse esquema (convidar, aceitar, revogar, suspender) e registrar cada mutação em transação.
4. Resolver vulnerabilidades de produção e validar fluxo Neon Auth.
5. Uma única rodada de testes E2E owner / colaborador / duas organizações / login / convite expirado / suspensão.
6. Merge depois de todos os checks verdes.

## Política de entrega
Não marcar "Bloco 02 concluído" por número de builds. Não executar scripts antigos em duplicidade. Não habilitar `ANTARES_TEAM_WRITES_ENABLED` até critérios acima.
