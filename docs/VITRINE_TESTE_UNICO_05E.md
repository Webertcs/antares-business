# ANTARES — Implantação e teste único do Bloco 05E

## Preparação (sem compartilhar credenciais)
1. No Neon, branch production, abra Roles. Crie o LOGIN **antares_public_inbox_login** com senha exclusiva forte, sem privilégios administrativos. Não use `neondb_owner` nem `antares_team_runtime`.
2. No SQL Editor Neon, execute `sql/05E_LOGIN_VITRINE.sql`. A operação concede apenas herança do papel restrito existente. Se o papel não existir ou for privilegiado, a operação falhará.
3. Confirme que a conta não participa de outros papéis com direitos sobre tabelas. Execute auditoria na conexão dessa conta, não somente como administrador:

```sql
SELECT current_user,
 has_table_privilege(current_user,'public.vitrine_leads','SELECT') AS pode_ler,
 has_table_privilege(current_user,'public.vitrine_leads','INSERT') AS pode_inserir,
 has_table_privilege(current_user,'public.vitrine_leads','UPDATE') AS pode_alterar,
 has_table_privilege(current_user,'public.vitrine_leads','DELETE') AS pode_excluir,
 has_function_privilege(current_user,'public.vitrine_receive_lead(uuid,text,text,text,text,text,integer,date,text,text)','EXECUTE') AS pode_receber,
 has_function_privilege(current_user,'public.vitrine_convert_lead(text,uuid)','EXECUTE') AS pode_converter;
```
Esperado: quatro `false`, recebimento `true`, conversão `false`. Verifique que `PUBLIC` não tem execução das funções privilegiadas.

## Configurar `.env.local` só no computador
- `DATABASE_URL_PUBLIC_INBOX`: use a URL real do novo login restrito (SSL habilitado), nunca a URL do proprietário.
- `ANTARES_PUBLIC_ORGANIZATION_ID`: UUID da organização alvo, encontrado na consulta à tabela organizations do diagnóstico 05D.
- `ANTARES_LEAD_HASH_SECRET`: gere um segredo forte aleatório e mantenha privado.
- `ANTARES_APP_ORIGIN=http://localhost:3000`.
- Deixe `ANTARES_VITRINE_CONVERSION_ENABLED=false` até homologação dos status.
- Só depois das verificações acima defina `ANTARES_PUBLIC_LEADS_ENABLED=true` para o teste controlado e reinicie o Next.js.

## Teste em sequência
1. Envie uma solicitação de teste na Vitrine (não use contatos reais de alunos).
2. Confirme que aparece uma única entrada `pending` na caixa `/vitrine/inbox`.
3. Clique Em análise, atualize e confirme persistência; depois Reabrir.
4. Garanta que usuário sem privilégio owner receba 403 e não veja a caixa.
5. Quando as permissões da função de conversão estiverem validadas, habilite `ANTARES_VITRINE_CONVERSION_ENABLED=true`, reinicie e converta com confirmação.
6. Verifique cliente + proposta `draft` com preço zerado, sem contrato, sessão ou financeiro. Atualize a caixa: status `converted`. Confira auditoria.
7. Desative novamente `ANTARES_PUBLIC_LEADS_ENABLED=false` após a homologação, até liberação operacional.

**Não ativar** se o login possuir SELECT/INSERT/UPDATE/DELETE direto. Não tornar o nome/UUID da organização pública. Certificar-se de que a função SECURITY DEFINER não aceita organização diferente da configurada antes de qualquer uso multiempresa. O bloqueio por IP é mitigação parcial e não substitui proteção antiabuso na borda.
