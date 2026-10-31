# ANTARES 02F — Etapa 03: isolamento por organização

Status: projeto técnico, não executar mudanças no banco ainda.

## Diagnóstico
- A execução da Etapa 02 foi confirmada no Neon em 29/10/2026.
- O papel antares_team_runtime é NOLOGIN e tem apenas SELECT sobre algumas tabelas, sob RLS default-deny.
- A aplicação usa autenticação gerenciada Neon; o banco não pode presumir que um parâmetro de requisição é confiável.

## Decisão arquitetural
Evitar política RLS baseada apenas em organization_id fornecido pelo cliente, em header ou em SET feito sobre conexão reutilizável. Não dar INSERT/UPDATE/DELETE global ao papel de runtime.

Recomendação:
1. Projetar endpoints de domínio que obtenham a identidade exclusivamente da sessão Neon Auth verificada no servidor.
2. Resolver o vínculo autorizado e organization_id dentro do próprio servidor antes de qualquer operação.
3. Usar transações específicas para alterações de equipe, com lock e auditoria consistente.
4. Manter conta de leitura restrita e conta operacional separada sem propriedade das tabelas; nenhuma credencial de manutenção no runtime.
5. Habilitar RLS por tabela com testes de isolamento A/B e negar acesso sem vínculo.
6. Integrar políticas e concessões ao esquema real após identificar owner das tabelas, funções e papéis disponíveis.
7. Não ativar ANTARES_TEAM_WRITES_ENABLED enquanto houver vulnerabilidades críticas da autenticação.

## Próxima entrega executável
Preparar uma migração versionada que estabeleça políticas RLS e grants mínimos para as tabelas da equipe, considerando a estratégia de vínculo autenticado. Confirmar viabilidade do driver Neon HTTP para contexto transacional seguro. Depois testar com tenant fictício B.

## Critérios de aceite
- Conta de serviço não lê, altera nem cria registros de outra organização.
- Convite só é emitido por owner, validado no servidor, com expiração e auditoria.
- Revogação e suspensão respeitam isolamento e preservam o último owner.
- Nenhuma operação financeira/CRM é exposta por conta privilegiada.
- Não há vulnerabilidade crítica de autenticação sem mitigação verificada.
