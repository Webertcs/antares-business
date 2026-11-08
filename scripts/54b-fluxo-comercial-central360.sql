-- ANTARES 54B — Fluxo comercial protegido, sem alterar registros existentes.
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_client_proposal_action(
 p_subject text,p_proposal uuid,p_action text,p_mode text DEFAULT NULL,p_terms text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_status text;v_id uuid;v_client uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active=true AND role='owner';
 SELECT status,client_id INTO STRICT v_status,v_client FROM public.business_proposals
 WHERE id=p_proposal AND organization_id=v_org FOR UPDATE;
 IF p_action='sent' THEN
   IF v_status NOT IN ('draft','sent') THEN RAISE EXCEPTION 'Situacao nao permite envio'; END IF;
   UPDATE public.business_proposals SET status='sent' WHERE id=p_proposal;
   v_id:=p_proposal;
 ELSIF p_action IN ('accepted','rejected') THEN
   IF v_status NOT IN ('draft','sent') THEN RAISE EXCEPTION 'Situacao nao permite resposta'; END IF;
   UPDATE public.business_proposals SET status=p_action,
     approved_at=CASE WHEN p_action='accepted' THEN now() ELSE NULL END,
     approved_by=CASE WHEN p_action='accepted' THEN p_subject ELSE NULL END
   WHERE id=p_proposal;
   v_id:=p_proposal;
 ELSIF p_action='contract' THEN
   IF v_status<>'accepted' THEN RAISE EXCEPTION 'Proposta ainda nao aceita'; END IF;
   IF p_mode NOT IN ('written','verbal','whatsapp') OR length(btrim(coalesce(p_terms,''))) NOT BETWEEN 8 AND 8000 THEN
      RAISE EXCEPTION 'Dados de contrato invalidos'; END IF;
   IF EXISTS(SELECT 1 FROM public.business_contracts WHERE proposal_id=p_proposal AND organization_id=v_org) THEN
      RAISE EXCEPTION 'Ja existe contrato para esta proposta'; END IF;
   INSERT INTO public.business_contracts(organization_id,proposal_id,confirmation_mode,status,terms)
   VALUES(v_org,p_proposal,p_mode,'pending',btrim(p_terms)) RETURNING id INTO v_id;
 ELSE RAISE EXCEPTION 'Acao desconhecida';
 END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'client_commercial_'||p_action,
   CASE WHEN p_action='contract' THEN 'business_contract' ELSE 'business_proposal' END,v_id);
 RETURN v_id;
END;$$;
REVOKE ALL ON FUNCTION public.antares_client_proposal_action(text,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_client_proposal_action(text,uuid,text,text,text) TO antares_team_runtime;
COMMIT;
