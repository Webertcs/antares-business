-- Executar no Neon SQL Editor após backup. Atribuição de cúpula à Central do Evento.
CREATE OR REPLACE FUNCTION public.antares_assign_event_dome(p_subject text,p_event uuid,p_dome uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;
BEGIN
 SELECT organization_id INTO v_org FROM public.team_members
 WHERE auth_subject=p_subject AND role='owner' AND active=true LIMIT 1;
 IF v_org IS NULL THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.crm_events WHERE id=p_event AND organization_id=v_org)
 THEN RAISE EXCEPTION 'Evento não encontrado'; END IF;
 IF p_dome IS NOT NULL AND NOT EXISTS
 (SELECT 1 FROM public.antares_domes WHERE id=p_dome AND organization_id=v_org AND active=true)
 THEN RAISE EXCEPTION 'Cúpula indisponível'; END IF;
 UPDATE public.crm_events SET dome_id=p_dome WHERE id=p_event AND organization_id=v_org;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'event_dome_assigned','crm_event',p_event);
END;$$;
REVOKE ALL ON FUNCTION public.antares_assign_event_dome(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_assign_event_dome(text,uuid,uuid) TO antares_team_runtime;
