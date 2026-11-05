-- ANTARES BUSINESS — 02F / ETAPA 2: permissoes minimas (sem acesso a dados).
-- Depende de 02f_01_ROLE_BASE_SEM_LOGIN.sql executado anteriormente.
-- Segura para execucao no SQL Editor: nao altera contas ou dados existentes.
-- Nao habilita APIs nem torna o papel capaz de login.
BEGIN;

DO $check$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_roles
   WHERE rolname = 'antares_team_runtime'
     AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
 ) THEN
   RAISE EXCEPTION 'Papel restrito ausente ou com privilegios indevidos';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='team_members' AND c.relrowsecurity
 ) THEN
   RAISE EXCEPTION 'RLS nao habilitado em team_members';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='team_invitations' AND c.relrowsecurity
 ) THEN
   RAISE EXCEPTION 'RLS nao habilitado em team_invitations';
 END IF;
END $check$;

GRANT USAGE ON SCHEMA public TO antares_team_runtime;

-- O papel recebe permissao sintatica de SELECT para as tabelas necessarias
-- mas a ausência de politicas RLS continua NEGANDO todas as linhas.
-- Não conceder UPDATE, INSERT, DELETE, TRUNCATE ou BYPASSRLS.
GRANT SELECT ON public.organizations, public.team_members,
  public.team_invitations TO antares_team_runtime;

-- Defesa contra mudanças acidentais nos registros de auditoria.
REVOKE ALL ON public.team_security_events FROM antares_team_runtime;
REVOKE ALL ON public.audit_events FROM antares_team_runtime;

COMMIT;

-- Exibe apenas a estrutura das permissoes; nao consulta dados empresariais.
SELECT rolname, rolcanlogin, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname='antares_team_runtime';
SELECT tablename,policyname,cmd,roles
FROM pg_policies WHERE schemaname='public' AND tablename IN
('organizations','team_members','team_invitations')
ORDER BY tablename,policyname;

-- IMPORTANTE: Não criar LOGIN, não trocar DATABASE_URL, não ativar
-- ANTARES_TEAM_WRITES_ENABLED. Não há isolamento multitenant homologado.
