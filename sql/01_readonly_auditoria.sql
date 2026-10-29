-- CONSULTAS DE LEITURA — NÃO ALTERAM O BANCO
SELECT id, name FROM public.organizations ORDER BY name;
SELECT organization_id, role, active, count(*) AS total
FROM public.team_members GROUP BY 1,2,3 ORDER BY 1,2,3;
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename IN ('organizations','team_members','clients','contracts','quotes','ledger_entries');
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;
