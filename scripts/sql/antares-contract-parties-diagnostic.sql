-- ANTARES CRM — Diagnóstico somente leitura (Etapa 3)
-- Execute no Neon SQL Editor e envie os resultados.
-- Não altera dados, tabelas ou permissões.
SELECT column_name,data_type,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='antares_contract_drafts'
ORDER BY ordinal_position;

SELECT p.oid::regprocedure::text AS signature,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='antares_save_contract_draft';

SELECT grantee,privilege_type
FROM information_schema.role_routine_grants
WHERE specific_schema='public' AND routine_name='antares_save_contract_draft'
ORDER BY grantee,privilege_type;
