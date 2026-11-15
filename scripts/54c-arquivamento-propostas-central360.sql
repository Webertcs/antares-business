-- ANTARES 54C — arquivamento reversível de propostas
-- Executar no Neon após confirmar backup, ANTES de atualizar a aplicação.
BEGIN;
ALTER TABLE public.business_proposals
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE OR REPLACE FUNCTION public.antares_archive_client_proposal(
 p_subject text,p_proposal uuid,p_archive boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_id uuid;
BEGIN
 IF p_subject IS NULL OR p_proposal IS NULL OR p_archive IS NULL THEN
   RAISE EXCEPTION 'Parametros invalidos';
 END IF;
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active=true AND role='owner';
 UPDATE public.business_proposals SET archived_at=CASE WHEN p_archive THEN now() ELSE NULL END
 WHERE id=p_proposal AND organization_id=v_org
   AND ((p_archive AND archived_at IS NULL) OR (NOT p_archive AND archived_at IS NOT NULL))
 RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Proposta nao encontrada ou ja atualizada'; END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,CASE WHEN p_archive THEN 'client_proposal_archived' ELSE 'client_proposal_restored' END,'business_proposal',v_id);
 RETURN v_id;
END;$$;
REVOKE ALL ON FUNCTION public.antares_archive_client_proposal(text,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_archive_client_proposal(text,uuid,boolean) TO antares_team_runtime;
COMMIT;