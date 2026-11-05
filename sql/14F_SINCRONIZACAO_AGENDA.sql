-- ANTARES 14F: sincronizacao controlada dos cadastros para reservas.
-- PRE-REQUISITOS: 14C e 14E instaladas, snapshot confirmado.
-- Nenhuma API e liberada por esta migracao.
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_prepare_proposal_client(
 p_subject text,p_org uuid,p_proposal uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_crm uuid;v_operational uuid;v_name text;v_kind text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE organization_id=p_org AND auth_subject=p_subject AND active AND role='owner')
 THEN RAISE EXCEPTION 'Nao autorizado';END IF;
 SELECT c.id,c.name,c.kind INTO v_crm,v_name,v_kind
 FROM public.business_proposals p JOIN public.crm_clients c
 ON c.id=p.client_id AND c.organization_id=p.organization_id
 WHERE p.id=p_proposal AND p.organization_id=p_org AND p.status='accepted';
 IF v_crm IS NULL THEN RAISE EXCEPTION 'Proposta aceita e cliente nao encontrados';END IF;
 SELECT operational_client_id INTO v_operational FROM public.antares_client_links
 WHERE organization_id=p_org AND crm_client_id=v_crm;
 IF v_operational IS NOT NULL THEN RETURN v_operational;END IF;
 -- Preserva cadastro independente e identificador original, sem atualizar cliente ja existente.
 INSERT INTO public.clients(organization_id,name,kind)
 VALUES(p_org,v_name,v_kind) RETURNING id INTO v_operational;
 INSERT INTO public.antares_client_links(organization_id,crm_client_id,operational_client_id)
 VALUES(p_org,v_crm,v_operational);
 RETURN v_operational;
END $$;
CREATE OR REPLACE FUNCTION public.antares_create_linked_dome(
 p_subject text,p_org uuid,p_name text,p_code text,p_capacity integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_dome uuid;v_equipment uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE organization_id=p_org AND auth_subject=p_subject AND active AND role='owner')
 THEN RAISE EXCEPTION 'Nao autorizado';END IF;
 IF p_capacity IS NULL OR p_capacity NOT BETWEEN 1 AND 500 OR length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 100 OR length(btrim(coalesce(p_code,''))) NOT BETWEEN 1 AND 30
 THEN RAISE EXCEPTION 'Dados invalidos';END IF;
 INSERT INTO public.antares_domes(organization_id,name,code,capacity)
 VALUES(p_org,btrim(p_name),btrim(p_code),p_capacity) RETURNING id INTO v_dome;
 INSERT INTO public.equipment(organization_id,name,category,asset_code,active)
 VALUES(p_org,btrim(p_name),'dome',btrim(p_code),true) RETURNING id INTO v_equipment;
 INSERT INTO public.antares_dome_links(organization_id,antares_dome_id,equipment_id)
 VALUES(p_org,v_dome,v_equipment);
 RETURN v_dome;
END $$;
REVOKE ALL ON FUNCTION public.antares_prepare_proposal_client(text,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_create_linked_dome(text,uuid,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_prepare_proposal_client(text,uuid,uuid) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_create_linked_dome(text,uuid,text,text,integer) TO antares_team_runtime;
COMMIT;
