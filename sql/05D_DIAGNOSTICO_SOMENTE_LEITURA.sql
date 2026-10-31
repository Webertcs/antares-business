-- ANTARES | BLOCO 05D - diagnóstico apenas leitura (Neon SQL Editor)
-- Não exibe credenciais, telefones nem dados pessoais.
SELECT current_database() AS banco, current_user AS usuario_sql;
SELECT id::text AS organization_id FROM public.organizations ORDER BY id LIMIT 10;
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls FROM pg_roles
 WHERE rolname IN ('antares_public_inbox','antares_public_inbox_login','antares_team_runtime');
SELECT c.relname AS tabela,c.relrowsecurity AS rls,
 has_table_privilege('antares_public_inbox',c.oid,'SELECT') AS publica_select,
 has_table_privilege('antares_public_inbox',c.oid,'INSERT') AS publica_insert,
 has_table_privilege('antares_public_inbox',c.oid,'UPDATE') AS publica_update,
 has_table_privilege('antares_public_inbox',c.oid,'DELETE') AS publica_delete
 FROM pg_class c WHERE c.oid='public.vitrine_leads'::regclass;
SELECT p.proname AS funcao,p.prosecdef AS security_definer,
 pg_get_userbyid(p.proowner) AS proprietario,
 has_function_privilege('antares_public_inbox',p.oid,'EXECUTE') AS execute_public_role
 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
 AND p.proname IN ('vitrine_receive_lead','vitrine_review_lead','vitrine_convert_lead')
 ORDER BY p.proname;
SELECT count(*) AS leads_total FROM public.vitrine_leads;
