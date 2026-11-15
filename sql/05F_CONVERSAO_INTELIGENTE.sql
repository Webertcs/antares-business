-- 05F: conversão inteligente da vitrine. Aplicar após 05C, com conversão desativada.
-- Mantém assinatura antiga sem substituí-la, para migração controlada.
BEGIN;
CREATE OR REPLACE FUNCTION public.vitrine_convert_lead_smart(
 p_subject text,p_lead uuid,p_existing_client uuid DEFAULT NULL)
RETURNS TABLE(client_id uuid,proposal_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid; v_lead public.vitrine_leads%ROWTYPE;v_client uuid;v_proposal uuid;v_kind text;v_matches integer;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 SELECT * INTO v_lead FROM public.vitrine_leads
 WHERE id=p_lead AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação inexistente'; END IF;
 IF v_lead.status='converted' THEN
  IF v_lead.converted_client_id IS NULL OR v_lead.converted_proposal_id IS NULL
   THEN RAISE EXCEPTION 'Conversão anterior incompleta'; END IF;
  RETURN QUERY SELECT v_lead.converted_client_id,v_lead.converted_proposal_id; RETURN;
 END IF;
 IF v_lead.status='archived' THEN RAISE EXCEPTION 'Reabra a solicitação'; END IF;
 v_kind:=CASE v_lead.audience WHEN 'Escola' THEN 'school'
 WHEN 'Empresa' THEN 'company' WHEN 'Associação' THEN 'association' ELSE 'private' END;
 IF p_existing_client IS NOT NULL THEN
  SELECT c.id INTO v_client FROM public.crm_clients c
  WHERE c.id=p_existing_client AND c.organization_id=v_org AND c.kind=v_kind;
  IF v_client IS NULL THEN RAISE EXCEPTION 'Cliente inexistente ou tipo divergente'; END IF;
 ELSE
  SELECT count(*) INTO v_matches FROM public.crm_clients c
  WHERE c.organization_id=v_org AND c.kind=v_kind
  AND lower(btrim(c.name))=lower(btrim(v_lead.institution));
  IF v_matches>0 THEN RAISE EXCEPTION 'Cliente com nome idêntico já existe; vincule manualmente'; END IF;
  INSERT INTO public.crm_clients(organization_id,kind,name,phone,city,notes,status)
  VALUES(v_org,v_kind,v_lead.institution,v_lead.phone,v_lead.city,
   'Origem: vitrine Planetário Kids. Responsável: '||v_lead.responsible_name||
   '. Solicitação: '||v_lead.id::text,'prospect') RETURNING id INTO v_client;
 END IF;
 INSERT INTO public.business_proposals(organization_id,client_id,title,
 pricing_model,expected_attendees,unit_price,fixed_price,discount,deposit,notes,status)
 VALUES(v_org,v_client,'Apresentação do planetário - '||left(v_lead.institution,120),
 'per_student',v_lead.attendees,0,0,0,0,
 'RASCUNHO SEM PREÇO DEFINIDO. Origem: solicitação '||v_lead.id::text||
 '. Contato: '||v_lead.responsible_name||
 '. Data desejada: '||coalesce(v_lead.desired_date::text,'a combinar')||
 '. Observações: '||coalesce(v_lead.notes,''),'draft') RETURNING id INTO v_proposal;
 UPDATE public.vitrine_leads SET status='converted',converted_client_id=v_client,
 converted_proposal_id=v_proposal WHERE id=v_lead.id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'vitrine_lead_converted','proposal',v_proposal);
 RETURN QUERY SELECT v_client,v_proposal;
END $$;
REVOKE ALL ON FUNCTION public.vitrine_convert_lead_smart(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vitrine_convert_lead_smart(text,uuid,uuid) TO antares_team_runtime;
COMMIT;
