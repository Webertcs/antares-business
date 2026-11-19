-- ANTARES | Auditoria de metadados do Neon | 19/11/2026
-- SOMENTE LEITURA: não há INSERT, UPDATE, DELETE, DDL ou mudanças de privilégios.
-- Executar na branch/ambiente que se deseja auditar, preferencialmente production
-- usando SQL Editor autorizado. Não publicar a saída se incluir dados sensíveis.
-- A ausência de tabela/função indica pendência; NÃO execute migrações automaticamente.

-- 01. Papéis utilizados pela aplicação: atributos de segurança.
SELECT rolname AS papel, rolcanlogin AS permite_login, rolsuper AS superusuario,
       rolbypassrls AS ignora_rls, rolcreaterole AS cria_papeis
FROM pg_catalog.pg_roles
WHERE rolname IN ('neondb_owner','antares_team_runtime')
ORDER BY rolname;

-- 02. RLS e grants explícitos nos principais objetos; sem ler registros dos clientes.
WITH alvos(nome) AS (VALUES
 ('organizations'),('team_members'),('team_invitations'),('team_security_events'),
 ('vitrine_leads'),('crm_clients'),('crm_contacts'),('crm_events'),
 ('business_proposals'),('business_contracts'),('business_domes'),
 ('antares_domes'),('antares_dome_links'),('antares_client_links'),
 ('antares_proposal_reservations'),('antares_presentation_event_links'),
 ('presentations'),('equipment'),('ledger_entries'),('receivables'),
 ('antares_legal_profiles'),('antares_event_attendance')
)
SELECT a.nome AS tabela,
       (c.oid IS NOT NULL) AS existe,
       c.relrowsecurity AS rls_ativo,
       c.relforcerowsecurity AS forcar_rls_para_dono,
       pg_catalog.pg_get_userbyid(c.relowner) AS proprietario_tabela,
       CASE WHEN c.oid IS NOT NULL AND to_regrole('antares_team_runtime') IS NOT NULL
            THEN has_table_privilege('antares_team_runtime',c.oid,'SELECT') END AS runtime_select,
       CASE WHEN c.oid IS NOT NULL AND to_regrole('antares_team_runtime') IS NOT NULL
            THEN has_table_privilege('antares_team_runtime',c.oid,'INSERT') END AS runtime_insert,
       CASE WHEN c.oid IS NOT NULL AND to_regrole('antares_team_runtime') IS NOT NULL
            THEN has_table_privilege('antares_team_runtime',c.oid,'UPDATE') END AS runtime_update,
       CASE WHEN c.oid IS NOT NULL AND to_regrole('antares_team_runtime') IS NOT NULL
            THEN has_table_privilege('antares_team_runtime',c.oid,'DELETE') END AS runtime_delete
FROM alvos a
LEFT JOIN pg_catalog.pg_class c
  ON c.oid=to_regclass(format('public.%I',a.nome))
ORDER BY a.nome;

-- 03. Políticas RLS declaradas nas tabelas de negócio.
SELECT tablename AS tabela, policyname AS politica, cmd AS operacao,
       roles AS papeis, permissive AS permissiva, qual AS filtro,
       with_check AS verificacao_escrita
FROM pg_catalog.pg_policies
WHERE schemaname='public'
  AND tablename IN (
    'organizations','team_members','team_invitations','vitrine_leads',
    'crm_clients','crm_events','business_proposals','business_contracts',
    'antares_domes','antares_proposal_reservations','presentations',
    'ledger_entries','antares_legal_profiles')
ORDER BY tablename,policyname;

-- 04. Funções de negócio: SECURITY DEFINER, owner, search_path explícito
-- e EXECUTE concedido a PUBLIC ou ao papel operacional.
SELECT p.proname AS funcao,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS assinatura,
       p.prosecdef AS security_definer,
       pg_catalog.pg_get_userbyid(p.proowner) AS proprietario_funcao,
       p.proconfig AS configuracoes,
       EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(
          COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl
        WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
       ) AS execute_publico,
       CASE WHEN to_regrole('antares_team_runtime') IS NOT NULL
            THEN has_function_privilege('antares_team_runtime',p.oid,'EXECUTE') END
            AS execute_runtime
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND (p.proname LIKE 'antares_%'
       OR p.proname LIKE 'business_%'
       OR p.proname LIKE 'vitrine_%'
       OR p.proname LIKE 'issue_team_%'
       OR p.proname LIKE 'accept_team_%'
       OR p.proname LIKE 'revoke_team_%')
ORDER BY p.proname, assinatura;

-- 05. Contagem agregada de vínculos (nenhum nome, email, ID ou auth_subject exibido).
SELECT role AS papel,active AS ativo,count(*)::integer AS quantidade
FROM public.team_members
GROUP BY role,active ORDER BY role,active;

-- 06. Vínculos ativos duplicados por subject, sem revelar os subjects.
SELECT count(*)::integer AS autenticacoes_com_multiplos_vinculos_ativos
FROM (
 SELECT auth_subject
 FROM public.team_members
 WHERE active = true
 GROUP BY auth_subject
 HAVING count(*) > 1
) duplicados;

-- 07. Quantidade de organizações ativas no cadastro, sem identificar clientes.
SELECT count(DISTINCT organization_id)::integer AS organizacoes_com_membros_ativos
FROM public.team_members WHERE active=true;

-- 08. Checagem específica: privilégios excessivos da conta operacional.
-- Esperado: nenhum registro para acesso direto de escrita a tabelas de negócio.
SELECT n.nspname AS esquema,c.relname AS tabela,
       has_table_privilege('antares_team_runtime',c.oid,'INSERT') AS insert_permitido,
       has_table_privilege('antares_team_runtime',c.oid,'UPDATE') AS update_permitido,
       has_table_privilege('antares_team_runtime',c.oid,'DELETE') AS delete_permitido
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND to_regrole('antares_team_runtime') IS NOT NULL
  AND (has_table_privilege('antares_team_runtime',c.oid,'INSERT')
    OR has_table_privilege('antares_team_runtime',c.oid,'UPDATE')
    OR has_table_privilege('antares_team_runtime',c.oid,'DELETE'))
ORDER BY c.relname;
