-- ANTARES 54F — conciliacao unica do teste Central 360.
-- Requer backup. IDs fixos de homologacao; nao reutilizar para outros clientes.
-- Operacao atomica, falha fechada se algum vinculo ou situacao divergir.
BEGIN;
DO $$
DECLARE
 v_proposal uuid := '3d421459-8d84-4abb-9e04-e39e75b6f477';
 v_event uuid := '9f561239-5ab8-42dc-82dd-870225488d87';
 v_org uuid; v_client uuid; v_existing uuid; v_status text; v_count integer; v_actor text;
BEGIN
 SELECT p.organization_id,p.client_id,p.event_id INTO STRICT v_org,v_client,v_existing
 FROM public.business_proposals p
 JOIN public.crm_clients cl ON cl.id=p.client_id AND cl.organization_id=p.organization_id
 WHERE p.id=v_proposal AND p.title='PROPOSTA 01' AND cl.name='ACADEMY UNIVERSE'
 FOR UPDATE OF p;
 IF v_existing IS NOT NULL AND v_existing<>v_event THEN
  RAISE EXCEPTION 'Proposta vinculada a outro evento. Nenhuma alteracao feita';
 END IF;
 SELECT e.status INTO STRICT v_status FROM public.crm_events e
 WHERE e.id=v_event AND e.organization_id=v_org AND e.client_id=v_client
 AND e.title='TESTE CENTRAL 360' FOR UPDATE;
 IF v_status NOT IN ('lead','quoted','reserved','confirmed') THEN
  RAISE EXCEPTION 'Status de evento nao autorizado: %',v_status;
 END IF;
 SELECT count(*) INTO v_count FROM public.business_contracts c
 WHERE c.organization_id=v_org AND c.proposal_id=v_proposal AND c.status='confirmed';
 IF v_count<>1 THEN
  RAISE EXCEPTION 'Esperado exatamente um contrato confirmado, encontrado %',v_count;
 END IF;
 IF EXISTS(SELECT 1 FROM public.business_proposals p
 WHERE p.organization_id=v_org AND p.event_id=v_event AND p.id<>v_proposal) THEN
  RAISE EXCEPTION 'Evento ja vinculado a outra proposta';
 END IF;
 SELECT t.auth_subject INTO STRICT v_actor FROM public.team_members t
 WHERE t.organization_id=v_org AND t.role='owner' AND t.active=true
 ORDER BY t.id LIMIT 1;
 IF v_existing IS NULL THEN
  UPDATE public.business_proposals SET event_id=v_event WHERE id=v_proposal AND organization_id=v_org;
  INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
  VALUES(v_org,v_actor,'proposal_event_linked_reconciliation','business_proposal',v_proposal);
 END IF;
 IF v_status<>'confirmed' THEN
  UPDATE public.crm_events SET status='confirmed' WHERE id=v_event AND organization_id=v_org;
  INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
  VALUES(v_org,v_actor,'event_confirmed_from_existing_contract','crm_event',v_event);
 END IF;
END $$;
COMMIT;
-- Verificacao somente leitura:
SELECT p.title,p.event_id,e.title AS event_title,e.status AS event_status,c.status AS contract_status
FROM public.business_proposals p
JOIN public.crm_events e ON e.id=p.event_id AND e.organization_id=p.organization_id
JOIN public.business_contracts c ON c.proposal_id=p.id AND c.organization_id=p.organization_id
WHERE p.id='3d421459-8d84-4abb-9e04-e39e75b6f477';
