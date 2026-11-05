-- BLOCO 05C - conversão atômica, sujeita à homologação.
-- Executar SOMENTE depois das migrações 03, 04 e 05 + backup.
BEGIN;
ALTER TABLE public.vitrine_leads ADD COLUMN IF NOT EXISTS converted_client_id uuid;
ALTER TABLE public.vitrine_leads ADD COLUMN IF NOT EXISTS converted_proposal_id uuid;
CREATE OR REPLACE FUNCTION public.vitrine_convert_lead(p_subject text,p_lead uuid)
RETURNS TABLE(client_id uuid, proposal_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid; v_lead public.vitrine_leads%ROWTYPE; v_client uuid; v_proposal uuid; v_kind text;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 SELECT * INTO v_lead FROM public.vitrine_leads
 WHERE id=p_lead AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação inexistente'; END IF;
 IF v_lead.status='converted' THEN
   RETURN QUERY SELECT v_lead.converted_client_id,v_lead.converted_proposal_id; RETURN;
 END IF;
 IF v_lead.status='archived' THEN RAISE EXCEPTION 'Reabra o pedido antes de converter'; END IF;
 v_kind:=CASE v_lead.audience WHEN 'Escola' THEN 'school'
 WHEN 'Empresa' THEN 'company' WHEN 'Associação' THEN 'association'
 ELSE 'private' END;
 INSERT INTO public.crm_clients(organization_id,kind,name,phone,city,notes,status)
 VALUES(v_org,v_kind,v_lead.institution,v_lead.phone,v_lead.city,
 'Origem: vitrine Planetário Kids. Responsável: '||v_lead.responsible_name
 ||'. Solicitação: '||v_lead.id::text,'prospect') RETURNING id INTO v_client;
 INSERT INTO public.business_proposals(organization_id,client_id,title,
 pricing_model,expected_attendees,unit_price,fixed_price,discount,deposit,notes,status)
 VALUES(v_org,v_client,'Apresentação do planetário - '||left(v_lead.institution,120),
 'per_student',v_lead.attendees,0,0,0,0,
 'RASCUNHO SEM PREÇO DEFINIDO. Contato: '||v_lead.responsible_name||
 '. Data desejada: '||coalesce(v_lead.desired_date::text,'a combinar')||
 '. Observações: '||coalesce(v_lead.notes,''),'draft') RETURNING id INTO v_proposal;
 UPDATE public.vitrine_leads SET status='converted',
 converted_client_id=v_client,converted_proposal_id=v_proposal WHERE id=v_lead.id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'vitrine_lead_converted','proposal',v_proposal);
 RETURN QUERY SELECT v_client,v_proposal;
END $$;
REVOKE ALL ON FUNCTION public.vitrine_convert_lead(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vitrine_convert_lead(text,uuid) TO antares_team_runtime;
COMMIT;
-- Não gera contrato, sessão, reserva, pagamento ou valor final.
