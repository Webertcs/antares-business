# ANTARES — Homologação ponta a ponta da vitrine (Bloco 05D)

A integração de código está preparada, mas publicação e conexão pública **não estão aprovadas** até os testes abaixo. Não coloque senhas em prints, GitHub ou chat.

## 1. Neon: SQL somente leitura

Execute `sql/05D_DIAGNOSTICO_SOMENTE_LEITURA.sql` no SQL Editor, branch production. Confira organização única esperada e a ausência de permissões SELECT/INSERT/UPDATE/DELETE para `antares_public_inbox`. A função `vitrine_receive_lead` deve ter EXECUTE apenas por papel autorizado. Verifique explicitamente `PUBLIC` e demais papéis, incluindo a credencial de runtime.

## 2. Credencial de recebimento

O SQL 05 cria um papel `antares_public_inbox NOLOGIN`, **não** uma conta conectável. Um administrador deve provisionar um papel LOGIN exclusivo com senha forte, sem SUPERUSER, BYPASSRLS ou acesso direto a tabelas, e conceder a ele apenas a herança/EXECUTE da função. Guarde sua URL somente em `DATABASE_URL_PUBLIC_INBOX` no ambiente local/implantação. **Não reutilizar `DATABASE_URL` nem `DATABASE_URL_TEAM_RUNTIME`.**

Antes de habilitar, teste conectado especificamente com a nova credencial:
`SELECT current_user, current_role, has_table_privilege(current_user,'public.vitrine_leads','SELECT') AS can_read, has_table_privilege(current_user,'public.vitrine_leads','INSERT') AS can_insert, has_function_privilege(current_user,'public.vitrine_receive_lead(uuid,text,text,text,text,text,integer,date,text,text)','EXECUTE') AS can_receive;`
Esperado: `can_read=false`, `can_insert=false`, `can_receive=true`.

## 3. Variáveis do servidor

`ANTARES_PUBLIC_ORGANIZATION_ID`: UUID da organização real verificada no Neon.
`ANTARES_APP_ORIGIN`: origem exata, por exemplo `http://localhost:3000`.
`ANTARES_LEAD_HASH_SECRET`: segredo aleatório de pelo menos 32 caracteres (não compartilhar).
`DATABASE_URL_PUBLIC_INBOX`: conexão do login exclusivo acima.
`ANTARES_PUBLIC_LEADS_ENABLED`: manter `false` até confirmar todas as permissões.
`ANTARES_VITRINE_CONVERSION_ENABLED`: manter `false` até homologar revisão e conversão.

## 4. Teste completo

Depois do check de segurança e habilitação deliberada do recebimento:
1. Acessar `/vitrine` e enviar uma solicitação **fictícia**, com contato de teste controlado.
2. Confirmar mensagem de registro e localizar **um** pedido em `/vitrine/inbox`, sem criar cliente automaticamente.
3. Alterar status para Em análise, conferir após recarregar.
4. Verificar que colaborador sem papel de proprietário não vê ou modifica a caixa.
5. Após habilitar conversão separadamente, converter o pedido com confirmação. Deve criar cliente e proposta em rascunho **sem valor comercial aprovado**, contrato, lançamento financeiro ou reserva.
6. Repetir a conversão do mesmo pedido: não deve duplicar cliente/proposta. Verificar linha de auditoria.
7. Desabilitar novamente o recebimento público após teste se ainda não houver aprovação operacional.

## Pontos de bloqueio

- O código SQL 05 atribui `EXECUTE` ao papel público de recebimento. A função recebe organização como argumento: **não conceder essa credencial a terceiros** nem utilizar multiempresa antes de limitar a organização no próprio banco, além de checagem de origem e rate limit.
- O acesso ao banco e as flags do ambiente não foram auditados remotamente. Não interpretar build bem-sucedido ou tabela criada como segurança homologada.
- Nenhum teste HTTP ou SQL real é executado por este documento.
