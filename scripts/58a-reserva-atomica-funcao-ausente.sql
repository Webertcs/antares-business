-- ANTARES 58A — restaurar somente a funcao ausente de reserva atomica.
-- Pre-requisito: 15A e 14F instalados e concilidados no Neon.
-- NAO executa reserva, alteracao de agenda, backfill, nem modifica dados.
-- So executar apos conferir em SOMENTE LEITURA as funcoes dependentes.
BEGIN;

DO $preflight$
DECLARE
 v_prepare oid := to_regprocedure('public.antares_prepare_proposal_client(text,uuid,uuid)');
 v_link oid := to_regprocedure('public.antares_book_and_link_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)');
 v_book oid := to_regprocedure('public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)');
BEGIN
 IF current_user <> 'neondb_owner' THEN
  RAISE EXCEPTION 'Execute como neondb_owner. Nenhuma alteracao aplicada.';
 END IF;
 IF to_regprocedure('public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)') IS NOT NULL THEN
  RAISE EXCEPTION 'Funcao ja existe; nao substituir automaticamente.';
 END IF;
 IF v_prepare IS NULL OR v_link IS NULL OR v_book IS NULL THEN
  RAISE EXCEPTION 'Dependencias do 14F/15A ausentes. Nenhuma alteracao aplicada.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_team_runtime'
    AND NOT rolsuper AND NOT rolbypassrls) THEN
  RAISE EXCEPTION 'Runtime de equipe ausente ou com privilegios inesperados.';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_proc p
   WHERE p.oid IN (v_prepare,v_link,v_book)
     AND (NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'neondb_owner')) THEN
  RAISE EXCEPTION 'Dependencia sem SECURITY DEFINER ou proprietario esperado.';
 END IF;
END $preflight$;

CREATE FUNCTION public.antares_book_ready_proposal(
 p_subject text,p_org uuid,p_proposal uuid,p_dome uuid,
 p_start timestamptz,p_end timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $fn$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.team_members m
  WHERE m.organization_id=p_org AND m.auth_subject=p_subject
   AND m.active AND m.role='owner'
 ) THEN
  RAISE EXCEPTION 'Nao autorizado';
 END IF;
 PERFORM public.antares_prepare_proposal_client(p_subject,p_org,p_proposal);
 RETURN public.antares_book_and_link_proposal(
  p_subject,p_org,p_proposal,p_dome,p_start,p_end);
END $fn$;

REVOKE ALL ON FUNCTION
 public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)
 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
 public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)
 TO antares_team_runtime;
COMMENT ON FUNCTION
 public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)
 IS 'ANTARES_READY_BOOK_V1_MINIMAL';
COMMIT;

-- Verificacao SOMENTE LEITURA apos instalar:
-- SELECT obj_description(to_regprocedure(
--   'public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)'
-- )::oid) AS versao;
