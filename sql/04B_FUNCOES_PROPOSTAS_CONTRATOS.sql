-- ANTARES BUSINESS V1 — FUNCOES COMERCIAIS RESTRITAS
-- DEPENDE de sql/04_V1_NUCLEO_COMERCIAL.sql
-- Preparado para implantação consolidada futura; não executar isoladamente.
BEGIN;
CREATE OR REPLACE FUNCTION public.business_create_proposal(
 p_subject text,p_client uuid,p_event uuid,p_title text,p_model text,
 p_attendees integer,p_unit numeric,p_fixed numeric,p_discount numeric,
 p_deposit numeric,p_valid date,p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;v_total numeric;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 IF NOT EXISTS (SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=v_org)
 OR (p_event IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.crm_events WHERE id=p_event AND client_id=p_client AND organization_id=v_org))
 THEN RAISE EXCEPTION 'Cliente ou evento invalido'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 180
 OR p_model NOT IN ('per_student','fixed','complimentary')
 OR coalesce(p_attendees,0)<0 OR coalesce(p_unit,0)<0 OR coalesce(p_fixed,0)<0
 OR coalesce(p_discount,0)<0 OR coalesce(p_deposit,0)<0
 OR length(coalesce(p_notes,''))>4000
 THEN RAISE EXCEPTION 'Dados da proposta invalidos'; END IF;
 v_total:=greatest(0,(CASE WHEN p_model='per_student' THEN coalesce(p_attendees,0)*coalesce(p_unit,0)
 WHEN p_model='fixed' THEN coalesce(p_fixed,0) ELSE 0 END)-coalesce(p_discount,0));
 IF coalesce(p_deposit,0)>v_total THEN RAISE EXCEPTION 'Sinal maior que valor da proposta'; END IF;
 INSERT INTO public.business_proposals(
 organization_id,client_id,event_id,title,pricing_model,expected_attendees,
 unit_price,fixed_price,discount,deposit,valid_until,notes)
 VALUES(v_org,p_client,p_event,trim(p_title),p_model,p_attendees,
 coalesce(p_unit,0),coalesce(p_fixed,0),coalesce(p_discount,0),
 coalesce(p_deposit,0),p_valid,p_notes) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'proposal_created','proposal',v_id);
 RETURN v_id;
END $fn$;
CREATE OR REPLACE FUNCTION public.business_create_contract(
 p_subject text,p_proposal uuid,p_mode text,p_terms text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 IF p_mode NOT IN ('written','verbal','whatsapp') OR length(coalesce(p_terms,''))>8000
 OR NOT EXISTS (SELECT 1 FROM public.business_proposals WHERE id=p_proposal AND organization_id=v_org)
 THEN RAISE EXCEPTION 'Proposta ou modalidade invalida'; END IF;
 IF EXISTS (SELECT 1 FROM public.business_contracts WHERE proposal_id=p_proposal AND organization_id=v_org
 AND status NOT IN ('cancelled'))
 THEN RAISE EXCEPTION 'Contrato ativo ja existe para esta proposta'; END IF;
 INSERT INTO public.business_contracts(organization_id,proposal_id,confirmation_mode,terms)
 VALUES(v_org,p_proposal,p_mode,p_terms) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'contract_created','contract',v_id);
 RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.business_create_proposal(text,uuid,uuid,text,text,integer,numeric,numeric,numeric,numeric,date,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_create_contract(text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_create_proposal(text,uuid,uuid,text,text,integer,numeric,numeric,numeric,numeric,date,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_create_contract(text,uuid,text,text) TO antares_team_runtime;
COMMIT;
