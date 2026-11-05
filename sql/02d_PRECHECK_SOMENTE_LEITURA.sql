-- ANTARES BUSINESS / 02D — Pré-homologação LEITURA APENAS
-- Cole no SQL Editor do Neon. Nenhuma instrução altera dados.
SELECT current_user AS db_role, session_user AS session_role,
  current_database() AS database_name;
SELECT rolname, rolbypassrls, rolsuper, rolcanlogin
FROM pg_roles WHERE rolname = current_user;
SELECT schemaname, tablename, tableowner, rowsecurity, forcerowsecurity
FROM pg_tables WHERE schemaname='public' AND tablename IN
('organizations','team_members','team_invitations','audit_events');
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_schema='public' AND table_name IN
('organizations','team_members','audit_events','team_invitations')
ORDER BY table_name, ordinal_position;
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('team_members','team_invitations')
ORDER BY tablename,indexname;
SELECT table_name, privilege_type, grantee
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('team_members','team_invitations')
ORDER BY table_name, grantee, privilege_type;
SELECT routine_name, routine_type, security_type
FROM information_schema.routines WHERE routine_schema='public'
AND routine_name IN ('accept_team_invitation','suspend_team_collaborator','revoke_team_invitation');
SELECT count(*) AS active_memberships, count(distinct auth_subject) AS distinct_auth_subjects
FROM public.team_members WHERE active = true AND auth_subject IS NOT NULL;
-- NÃO inclua DATABASE_URL ou dados de clientes na captura dos resultados.
