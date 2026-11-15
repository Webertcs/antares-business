-- ANTARES 54E — contrato confirmado sincroniza somente evento explicitamente vinculado.
-- Execute no Neon apos backup. Nao altera contratos ou eventos existentes.
-- Propostas sem event_id permanecem sem sincronizacao: nunca inferir pelo cliente.
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_confirm_client_contract(
 p_subject text,p_contract uuid,p_responsible text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_status text;v_id uuid;v_event uuid;v_client uuid;v_event_status text;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active=true AND role='owner';
 IF length(btrim(coalesce(p_responsible,''))) NOT BETWEEN 3 AND 180 THEN
   RAISE EXCEPTION 'Responsavel invalido';
 END IF;
 SELECT c.status,p.event_id,p.client_id INTO STRICT v_status,v_event,v_client
 FROM public.business_contracts c
 JOIN public.business_proposals p ON p.id=c.proposal_id AND p.organization_id=c.organization_id
 WHERE c.id=p_contract AND c.organization_id=v_org FOR UPDATE OF c;
 IF v_status<>'pending' THEN RAISE EXCEPTION 'Contrato nao esta pendente'; END IF;
 -- Trava e valida o evento antes de confirmar contrato, evitando confirmacao parcial.
 IF v_event IS NOT NULL THEN
   SELECT e.status INTO v_event_status FROM public.crm_events e
   WHERE e.id=v_event AND e.organization_id=v_org AND e.client_id=v_client FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Evento vinculado nao pertence a esta instituicao'; END IF;
   IF v_event_status NOT IN ('lead','quoted','reserved','confirmed') THEN
     RAISE EXCEPTION 'Situacao do evento impede confirmacao automatica: %',v_event_status;
   END IF;
 END IF;
 UPDATE public.business_contracts SET status='confirmed',confirmed_at=now(),
 confirmed_by_subject=p_subject,confirmed_by_name=btrim(p_responsible)
 WHERE id=p_contract AND organization_id=v_org RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'client_contract_confirmed','business_contract',v_id);
 IF v_event IS NOT NULL AND v_event_status<>'confirmed' THEN
   UPDATE public.crm_events SET status='confirmed'
   WHERE id=v_event AND organization_id=v_org AND client_id=v_client;
   INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
   VALUES(v_org,p_subject,'event_confirmed_by_contract','crm_event',v_event);
 END IF;
 RETURN v_id;
END;$$;
REVOKE ALL ON FUNCTION public.antares_confirm_client_contract(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_confirm_client_contract(text,uuid,text) TO antares_team_runtime;
COMMIT;
