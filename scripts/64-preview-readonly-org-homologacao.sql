-- ANTARES 64 | Acesso de leitura limitado ao Deploy Preview
-- SOMENTE para a branch Neon homologacao-antares-15a-20261118.
-- Execute depois de criar snapshot e conferir a branch.
-- Não executar em produção. NÃO habilita LOGIN nem cria senhas.
-- Whitelist inicial: 13 tabelas com organization_id e RLS já inventariados.
-- Não concede DML, EXECUTE ou BYPASSRLS. Falha e reverte se houver divergências.
BEGIN;

DO $install$
DECLARE
  v_table text;
  v_role record;
  v_org uuid;
  v_rel record;
  v_policy constant text := 'antares_preview_read_one_org';
  v_tables constant text[] := ARRAY[
    'antares_client_links',
    'antares_dome_links',
    'antares_domes',
    'antares_presentation_event_links',
    'antares_proposal_reservations',
    'antares_reservation_audit',
    'business_proposals',
    'crm_clients',
    'crm_events',
    'equipment',
    'presentations',
    'team_members',
    'vitrine_leads'
  ];
BEGIN
  IF current_user <> 'neondb_owner' OR current_database() <> 'neondb' THEN
    RAISE EXCEPTION 'Conexao inesperada. Verifique banco/role na homologacao.';
  END IF;
  SELECT rolcanlogin, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
    INTO v_role FROM pg_roles WHERE rolname='antares_preview_read';
  IF NOT FOUND OR v_role.rolcanlogin OR v_role.rolsuper
     OR v_role.rolbypassrls OR v_role.rolcreatedb OR v_role.rolcreaterole THEN
    RAISE EXCEPTION 'A role de leitura deve existir sem LOGIN/privilegios.';
  END IF;
  IF (SELECT COUNT(DISTINCT organization_id)
      FROM public.team_members WHERE active) <> 1 THEN
    RAISE EXCEPTION 'Homologacao deve ter apenas uma organizacao com membros ativos.';
  END IF;
  SELECT organization_id INTO v_org
    FROM public.team_members WHERE active LIMIT 1;
  IF EXISTS (
    SELECT 1 FROM pg_auth_members m
    JOIN pg_roles r ON r.oid=m.member
    WHERE r.rolname='antares_preview_read'
  ) THEN RAISE EXCEPTION 'Role de leitura tem memberships inesperadas.'; END IF;

  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT c.oid, c.relrowsecurity, c.relowner,
           EXISTS (
             SELECT 1 FROM pg_attribute a
             WHERE a.attrelid=c.oid AND a.attname='organization_id'
               AND NOT a.attisdropped
           ) AS has_org
      INTO v_rel
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=v_table AND c.relkind IN ('r','p');
    IF NOT FOUND OR NOT v_rel.relrowsecurity OR NOT v_rel.has_org
       OR pg_get_userbyid(v_rel.relowner)<>'neondb_owner' THEN
      RAISE EXCEPTION 'Tabela % sem estrutura/RLS/owner esperado', v_table;
    END IF;

    -- Uma policy permissiva anterior para PUBLIC poderia somar-se à nossa
    -- e expandir a leitura. Não prosseguir em tal situação.
    IF EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname='public' AND p.tablename=v_table
        AND p.cmd IN ('SELECT','ALL')
        AND ('public'=ANY(p.roles) OR 'antares_preview_read'=ANY(p.roles))
    ) THEN
      RAISE EXCEPTION 'Policy existente aplicavel a preview na tabela %', v_table;
    END IF;
  END LOOP;

  -- Apenas após todos os prechecks, conceder privilégios dentro da transação.
  GRANT CONNECT ON DATABASE neondb TO antares_preview_read;
  GRANT USAGE ON SCHEMA public TO antares_preview_read;
  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO antares_preview_read', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO antares_preview_read USING (organization_id = %L::uuid)',
      v_policy, v_table, v_org::text
    );
  END LOOP;
END
$install$;

COMMIT;

-- Pós-instalação: confira apenas metadados, sem consultar dados pessoais.
-- SELECT tablename, policyname, roles, cmd FROM pg_policies
-- WHERE schemaname='public' AND policyname='antares_preview_read_one_org';
--
-- A role continua NOLOGIN. Não configurar DATABASE_URL no Netlify ainda.
-- Outras tabelas utilizadas pelo CRM devem ser incluídas em revisão separada
-- e somente após confirmar que realmente precisam de SELECT.
