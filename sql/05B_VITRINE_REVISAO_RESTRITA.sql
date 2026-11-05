-- BLOCO 05B: revisão de solicitações pelo proprietário.
-- Pré-requisito: SQL 05 implantado, backup e auditoria de permissões.
-- NÃO EXECUTAR automaticamente; homologar no Neon.
BEGIN;
CREATE OR REPLACE FUNCTION public.vitrine_review_lead(
  p_subject text,p_id uuid,p_status text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_org uuid; v_id uuid;
BEGIN
  SELECT organization_id INTO STRICT v_org FROM public.team_members
   WHERE auth_subject=p_subject AND active=true AND role='owner';
  IF p_status NOT IN ('pending','reviewing','archived') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;
  UPDATE public.vitrine_leads SET status=p_status
   WHERE id=p_id AND organization_id=v_org AND status<>'converted'
   RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada ou convertida'; END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.vitrine_review_lead(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vitrine_review_lead(text,uuid,text) TO antares_team_runtime;
COMMIT;
-- Conversão em cliente/proposta exige ação confirmada, com vínculo auditável;
-- não converter diretamente nesta função de revisão.
