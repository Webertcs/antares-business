-- ANTARES 05H: condicoes comerciais e aprovacao manual, sem envio.
BEGIN;
ALTER TABLE public.business_proposals
 ADD COLUMN IF NOT EXISTS payment_terms text,
 ADD COLUMN IF NOT EXISTS approved_at timestamptz,
 ADD COLUMN IF NOT EXISTS approved_by text;
CREATE OR REPLACE FUNCTION public.business_manage_draft(
 p_subject text,p_id uuid,p_valid date,p_terms text,p_approve boolean)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid;v_p public.business_proposals%ROWTYPE;
BEGIN
 SELECT tm.organization_id INTO STRICT v_org FROM public.team_members tm
 WHERE tm.auth_subject=p_subject AND tm.active=true AND tm.role='owner';
 SELECT * INTO v_p FROM public.business_proposals
 WHERE id=p_id AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND OR v_p.status<>'draft' THEN RAISE EXCEPTION 'Rascunho indisponivel'; END IF;
 IF length(coalesce(p_terms,''))>2000 THEN RAISE EXCEPTION 'Condicoes muito longas';END IF;
 IF p_valid IS NOT NULL AND p_valid<current_date THEN RAISE EXCEPTION 'Validade no passado';END IF;
 IF p_approve AND (v_p.total<=0 OR p_valid IS NULL OR length(trim(coalesce(p_terms,'')))<10)
 THEN RAISE EXCEPTION 'Informe valor, validade e condicoes antes de aprovar'; END IF;
 IF p_approve THEN
  UPDATE public.business_proposals
  SET valid_until=p_valid,payment_terms=p_terms,status='accepted',approved_at=now(),approved_by=p_subject
  WHERE id=p_id AND organization_id=v_org;
 ELSE
  UPDATE public.business_proposals SET valid_until=p_valid,payment_terms=p_terms
  WHERE id=p_id AND organization_id=v_org;
 END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,CASE WHEN p_approve THEN 'proposal_approved_internal' ELSE 'proposal_terms_updated' END,'proposal',p_id);
 RETURN CASE WHEN p_approve THEN 'approved' ELSE 'draft' END;
END $$;
REVOKE ALL ON FUNCTION public.business_manage_draft(text,uuid,date,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_manage_draft(text,uuid,date,text,boolean) TO antares_team_runtime;
COMMIT;
