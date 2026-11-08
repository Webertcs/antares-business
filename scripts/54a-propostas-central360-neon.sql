-- ANTARES 54A — cadastro seguro de propostas pela Central 360.
-- Aplicar manualmente no Neon, apos backup. Nao altera dados existentes.
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_create_client_proposal(
 p_subject text,p_client uuid,p_title text,p_model text,p_attendees integer,
 p_unit numeric,p_fixed numeric,p_discount numeric,p_deposit numeric,
 p_valid_until date,p_notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE v_org uuid;v_id uuid;v_total numeric;
BEGIN
 IF p_subject IS NULL OR btrim(p_subject)='' OR p_client IS NULL
    OR length(btrim(coalesce(p_title,''))) NOT BETWEEN 2 AND 180
    OR p_model NOT IN ('per_student','fixed','complimentary')
    OR p_attendees IS NULL OR p_attendees NOT BETWEEN 0 AND 100000
    OR p_unit IS NULL OR p_fixed IS NULL OR p_discount IS NULL OR p_deposit IS NULL
    OR p_unit<0 OR p_fixed<0 OR p_discount<0 OR p_deposit<0
    OR p_unit>10000000 OR p_fixed>10000000 OR p_discount>10000000 OR p_deposit>10000000
    OR length(coalesce(p_notes,''))>4000 THEN
    RAISE EXCEPTION 'Dados de proposta invalidos';
 END IF;
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active=true AND role='owner';
 PERFORM 1 FROM public.crm_clients WHERE id=p_client AND organization_id=v_org;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cliente nao pertence a organizacao'; END IF;
 v_total:=CASE p_model WHEN 'per_student' THEN p_attendees*p_unit
                     WHEN 'fixed' THEN p_fixed ELSE 0 END - p_discount;
 IF v_total<0 OR p_deposit>v_total THEN
    RAISE EXCEPTION 'Desconto ou sinal excede o total'; END IF;
 INSERT INTO public.business_proposals(
 organization_id,client_id,title,pricing_model,expected_attendees,
 unit_price,fixed_price,discount,deposit,total,status,valid_until,notes)
 VALUES(v_org,p_client,btrim(p_title),p_model,p_attendees,
 p_unit,p_fixed,p_discount,p_deposit,v_total,'draft',p_valid_until,
 nullif(btrim(coalesce(p_notes,'')),''))
 RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'proposal_created','business_proposal',v_id);
 RETURN v_id;
END;$$;
REVOKE ALL ON FUNCTION public.antares_create_client_proposal(text,uuid,text,text,integer,numeric,numeric,numeric,numeric,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_create_client_proposal(text,uuid,text,text,integer,numeric,numeric,numeric,numeric,date,text) TO antares_team_runtime;
COMMIT;
