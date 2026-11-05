-- ANTARES BUSINESS — Pré-implantação 02D/02F (SOMENTE LEITURA)
-- Pode executar no Neon SQL Editor. Não modifica nada nem exibe senhas.
WITH t AS (
 SELECT c.relname AS tabela, c.relrowsecurity AS rls,
        pg_get_userbyid(c.relowner) AS proprietario,
        (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid) AS politicas
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public'
   AND c.relname IN ('organizations','team_members','team_invitations','team_security_events','audit_events')
   AND c.relkind IN ('r','p')
),
f AS (
 SELECT p.proname AS funcao, p.prosecdef AS security_definer,
        pg_get_userbyid(p.proowner) AS proprietario
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN
 ('accept_team_invitation','revoke_team_invitation','suspend_team_collaborator')
),
r AS (
 SELECT rolname AS papel, rolcanlogin AS pode_login, rolbypassrls AS ignora_rls,
        rolsuper AS superusuario
 FROM pg_roles WHERE rolname='antares_team_runtime'
),
idx AS (
 SELECT indexname FROM pg_indexes
 WHERE schemaname='public' AND indexname IN
 ('team_members_unique_active_subject','team_invitations_unique_pending_email')
)
SELECT jsonb_pretty(jsonb_build_object(
 'tabelas',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY tabela),'[]'::jsonb) FROM t),
 'funcoes',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY funcao),'[]'::jsonb) FROM f),
 'papel',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM r),
 'indices',(SELECT coalesce(jsonb_agg(indexname),'[]'::jsonb) FROM idx),
 'vinculos_ativos_duplicados',(
   SELECT count(*) FROM (
     SELECT auth_subject FROM public.team_members
     WHERE active AND auth_subject IS NOT NULL GROUP BY auth_subject HAVING count(*)>1
   ) d
 )
)) AS diagnostico_02;
