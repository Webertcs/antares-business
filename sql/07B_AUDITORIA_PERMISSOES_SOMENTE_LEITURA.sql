-- ANTARES 07B | Auditoria SOMENTE LEITURA de escrita financeira
SELECT c.relname,c.relrowsecurity AS rls_ativo,c.relforcerowsecurity AS rls_forcado
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='ledger_entries';
SELECT p.policyname,p.cmd,p.roles,p.qual,p.with_check
FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='ledger_entries';
SELECT grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='ledger_entries' ORDER BY grantee,privilege_type;
SELECT constraint_name,constraint_type FROM information_schema.table_constraints
WHERE table_schema='public' AND table_name='ledger_entries'
ORDER BY constraint_type,constraint_name;
