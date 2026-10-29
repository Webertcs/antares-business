-- ANTARES BUSINESS 02D/02F — CORRECAO SEGURA, ETAPA DE INTEGRIDADE
-- Rodar no Neon SQL Editor como neondb_owner. Transacional/idempotente.
-- NÃO ativa convites; não cria política ampla nem altera usuários.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_team_runtime'
    AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls) THEN
   RAISE EXCEPTION 'Papel de runtime não é seguro: abortando';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.team_members WHERE active AND auth_subject IS NOT NULL
   GROUP BY auth_subject HAVING count(*) > 1
 ) THEN
   RAISE EXCEPTION 'Mais de um vínculo ativo por identidade: abortando';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.team_invitations
   WHERE accepted_at IS NULL AND revoked_at IS NULL
   GROUP BY organization_id,invited_email HAVING count(*)>1
 ) THEN
   RAISE EXCEPTION 'Convites pendentes duplicados: revogue duplicatas primeiro';
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS team_members_unique_active_subject
 ON public.team_members(auth_subject)
 WHERE active AND auth_subject IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_unique_pending_email
 ON public.team_invitations(organization_id,invited_email)
 WHERE accepted_at IS NULL AND revoked_at IS NULL;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_security_events ENABLE ROW LEVEL SECURITY;
-- Remover por garantia privilégios amplos herdados pelo papel interno.
REVOKE ALL ON public.organizations,public.team_members,
 public.team_invitations,public.team_security_events
 FROM antares_team_runtime;
GRANT USAGE ON SCHEMA public TO antares_team_runtime;
-- Só SELECT; sem políticas o runtime continua sem ver linhas.
GRANT SELECT ON public.organizations,public.team_members,
 public.team_invitations TO antares_team_runtime;
COMMIT;
SELECT indexname FROM pg_indexes WHERE schemaname='public'
 AND indexname IN ('team_members_unique_active_subject',
 'team_invitations_unique_pending_email') ORDER BY indexname;
-- Não habilite ANTARES_TEAM_WRITES_ENABLED nem DATABASE_URL_TEAM_RUNTIME.
-- A implantação de policies tenant-scoped precisa de autenticação
-- segura e teste de isolamento A/B; não use USING(true).
