-- ANTARES | Separacao entre aprovacao INTERNA e aceite REAL do cliente.
-- REQUER: snapshot/backup no Neon e validacao dos registros antigos.
-- Nao atualiza registros historicos, nao cria reservas, contratos ou cobrancas.
-- Ordem: executar esta migracao em transacao, verificar funcoes, depois testar o frontend da branch.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.business_proposals
 ADD COLUMN IF NOT EXISTS client_accepted_at timestamptz,
 ADD COLUMN IF NOT EXISTS client_accepted_by text,
 ADD COLUMN IF NOT EXISTS client_acceptance_channel text,
 ADD COLUMN IF NOT EXISTS client_acceptance_evidence text;
DO $check$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.business_proposals'::regclass
    AND conname='business_proposals_acceptance_channel_check'
 ) THEN
  ALTER TABLE public.business_proposals
   ADD CONSTRAINT business_proposals_acceptance_channel_check
   CHECK(client_acceptance_channel IS NULL OR
     client_acceptance_channel IN ('whatsapp','written','verbal'));
 END IF;
END $check$;

-- A aprovacao interna NAO cria status 'accepted': usa approved_at/approved_by
-- ja existentes e mantem status='draft' ate comprovacao manual do cliente.
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
 IF NOT FOUND OR (v_p.status<>'draft' OR v_p.approved_at IS NOT NULL) THEN RAISE EXCEPTION 'Rascunho indisponivel'; END IF;
 IF length(coalesce(p_terms,''))>2000 THEN RAISE EXCEPTION 'Condicoes muito longas';END IF;
 IF p_valid IS NOT NULL AND p_valid<current_date THEN RAISE EXCEPTION 'Validade no passado';END IF;
 IF p_approve AND (v_p.total<=0 OR p_valid IS NULL OR length(trim(coalesce(p_terms,'')))<10)
 THEN RAISE EXCEPTION 'Informe valor, validade e condicoes antes de aprovar'; END IF;
 IF p_approve THEN
  UPDATE public.business_proposals
  SET valid_until=p_valid,payment_terms=p_terms,approved_at=now(),approved_by=p_subject
  WHERE id=p_id AND organization_id=v_org;
 ELSE
  UPDATE public.business_proposals SET valid_until=p_valid,payment_terms=p_terms
  WHERE id=p_id AND organization_id=v_org;
 END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,CASE WHEN p_approve THEN 'proposal_approved_internal' ELSE 'proposal_terms_updated' END,'proposal',p_id);
 RETURN CASE WHEN p_approve THEN 'approved_internal' ELSE 'draft' END;
END $$;

-- Rascunhos com aprovacao interna nao podem mais ter os precos alterados.
CREATE OR REPLACE FUNCTION public.business_update_draft_prices(
 p_subject text,p_id uuid,p_model text,p_attendees integer,
 p_unit numeric,p_fixed numeric,p_discount numeric,p_deposit numeric)
RETURNS TABLE(total numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid;v_old public.business_proposals%ROWTYPE;v_new public.business_proposals%ROWTYPE;
v_total numeric;
BEGIN
 SELECT tm.organization_id INTO STRICT v_org FROM public.team_members tm
 WHERE tm.auth_subject=p_subject AND tm.active=true AND tm.role='owner';
 SELECT * INTO v_old FROM public.business_proposals
 WHERE id=p_id AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposta nao encontrada';END IF;
 IF v_old.status<>'draft' OR v_old.approved_at IS NOT NULL THEN RAISE EXCEPTION 'Somente rascunhos podem ser editados';END IF;
 IF p_model NOT IN ('per_student','fixed','complimentary') OR
    p_attendees IS NULL OR p_attendees<0 OR p_attendees>100000 OR
    p_unit IS NULL OR p_fixed IS NULL OR p_discount IS NULL OR p_deposit IS NULL OR
    p_unit<0 OR p_fixed<0 OR p_discount<0 OR p_deposit<0 OR
    p_unit>10000000 OR p_fixed>10000000 OR p_discount>10000000 OR p_deposit>10000000
 THEN RAISE EXCEPTION 'Valores fora dos limites';END IF;
 v_total:=CASE WHEN p_model='per_student' THEN p_attendees*p_unit
 WHEN p_model='fixed' THEN p_fixed ELSE 0 END;
 IF p_discount>v_total OR p_deposit>(v_total-p_discount)
 THEN RAISE EXCEPTION 'Desconto ou sinal maior que o total';END IF;
 UPDATE public.business_proposals
 SET pricing_model=p_model,expected_attendees=p_attendees,unit_price=p_unit,
 fixed_price=p_fixed,discount=p_discount,deposit=p_deposit
 WHERE id=p_id AND organization_id=v_org RETURNING * INTO v_new;
 IF (v_old.pricing_model,v_old.expected_attendees,v_old.unit_price,v_old.fixed_price,v_old.discount,v_old.deposit)
 IS DISTINCT FROM
 (v_new.pricing_model,v_new.expected_attendees,v_new.unit_price,v_new.fixed_price,v_new.discount,v_new.deposit)
 THEN
 INSERT INTO public.business_proposal_changes(organization_id,proposal_id,actor_subject,before_values,after_values)
 VALUES(v_org,p_id,p_subject,to_jsonb(v_old),to_jsonb(v_new));
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'draft_prices_updated','proposal',p_id);
 END IF;
 RETURN QUERY SELECT v_new.total;
END $$;

-- Registro explicito, pelo owner, da confirmacao RECEBIDA do cliente.
CREATE OR REPLACE FUNCTION public.business_confirm_client_acceptance(
 p_subject text,p_id uuid,p_channel text,p_evidence text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $accept$
DECLARE v_org uuid;v_p public.business_proposals%ROWTYPE;
BEGIN
 SELECT tm.organization_id INTO STRICT v_org
 FROM public.team_members tm
 WHERE tm.auth_subject=p_subject AND tm.active AND tm.role='owner';
 SELECT * INTO v_p FROM public.business_proposals
 WHERE id=p_id AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposta nao encontrada';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.vitrine_leads
   WHERE organization_id=v_org AND converted_proposal_id=p_id)
 THEN RAISE EXCEPTION 'Aceite restrito as solicitacoes da vitrine';END IF;
 IF v_p.approved_at IS NULL
    OR v_p.client_accepted_at IS NOT NULL
    OR v_p.status NOT IN ('draft','accepted')
 THEN RAISE EXCEPTION 'Proposta sem aprovacao interna ou aceite ja registrado';END IF;
 IF v_p.valid_until IS NULL OR v_p.valid_until < current_date OR v_p.total<=0
 THEN RAISE EXCEPTION 'Proposta vencida ou sem valores definidos';END IF;
 IF p_channel NOT IN ('whatsapp','written','verbal')
   OR length(btrim(coalesce(p_evidence,''))) NOT BETWEEN 10 AND 500
 THEN RAISE EXCEPTION 'Informe canal e referencia real do aceite';END IF;
 UPDATE public.business_proposals
 SET status='accepted',client_accepted_at=now(),client_accepted_by=p_subject,
     client_acceptance_channel=p_channel,client_acceptance_evidence=btrim(p_evidence)
 WHERE id=p_id AND organization_id=v_org;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'proposal_client_acceptance_recorded','proposal',p_id);
 RETURN 'accepted';
END $accept$;
REVOKE ALL ON FUNCTION public.business_confirm_client_acceptance(text,uuid,text,text)
 FROM PUBLIC,antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_confirm_client_acceptance(text,uuid,text,text)
 TO antares_team_runtime;

-- Retem seguranca transacional da agenda: para propostas da Vitrine
-- o status accepted, isoladamente, nao autoriza novas reservas.
CREATE OR REPLACE FUNCTION public.antares_book_proposal(
 p_subject text,p_org uuid,p_proposal uuid,p_dome uuid,p_start timestamptz,p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_client uuid;v_legacy uuid;v_equipment uuid;v_presentation uuid;v_title text;v_students integer;v_capacity integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject AND organization_id=p_org AND active AND role='owner')
 THEN RAISE EXCEPTION 'Acesso negado';END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_start<=now() OR p_end<=p_start OR p_end>p_start+interval '24 hours'
 THEN RAISE EXCEPTION 'Periodo invalido';END IF;
 SELECT client_id,title,expected_attendees INTO v_client,v_title,v_students
 FROM public.business_proposals bp
 WHERE bp.organization_id=p_org AND bp.id=p_proposal AND bp.status='accepted'
 AND (bp.client_accepted_at IS NOT NULL OR NOT EXISTS (
   SELECT 1 FROM public.vitrine_leads vl
   WHERE vl.organization_id=bp.organization_id AND vl.converted_proposal_id=bp.id
 ));
 IF v_client IS NULL THEN RAISE EXCEPTION 'Proposta nao aprovada';END IF;
 SELECT operational_client_id INTO v_legacy FROM public.antares_client_links
 WHERE organization_id=p_org AND crm_client_id=v_client;
 IF v_legacy IS NULL THEN RAISE EXCEPTION 'Cliente sem vinculo operacional';END IF;
 SELECT l.equipment_id,d.capacity INTO v_equipment,v_capacity
 FROM public.antares_dome_links l JOIN public.antares_domes d
 ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
 JOIN public.equipment e ON e.id=l.equipment_id AND e.organization_id=l.organization_id
 WHERE l.organization_id=p_org AND l.antares_dome_id=p_dome AND d.active AND e.active AND e.category='dome';
 IF v_equipment IS NULL THEN RAISE EXCEPTION 'Cupula nao vinculada ou inativa';END IF;
 IF v_students IS NOT NULL AND v_students>0 AND v_capacity IS NOT NULL AND v_students>v_capacity
 THEN RAISE EXCEPTION 'Capacidade insuficiente';END IF;
 IF EXISTS(SELECT 1 FROM public.antares_proposal_reservations
 WHERE organization_id=p_org AND proposal_id=p_proposal)
 THEN RAISE EXCEPTION 'Proposta ja possui reserva';END IF;
 INSERT INTO public.presentations(organization_id,client_id,dome_id,dome_category,title,starts_at,ends_at,status,expected_students)
 VALUES(p_org,v_legacy,v_equipment,'dome',v_title,p_start,p_end,'reserved',NULLIF(v_students,0))
 RETURNING id INTO v_presentation;
 INSERT INTO public.antares_proposal_reservations(organization_id,proposal_id,presentation_id)
 VALUES(p_org,p_proposal,v_presentation);
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'proposal_presentation_reserved','presentation',v_presentation);
 RETURN v_presentation;
END $$;

-- A mesma regra aplica-se a contratos deste fluxo.
CREATE OR REPLACE FUNCTION public.antares_register_contract(
 p_subject text,p_org uuid,p_proposal uuid,p_mode text,p_terms text,p_confirm boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.team_members
 WHERE organization_id=p_org AND auth_subject=p_subject AND active AND role='owner')
 THEN RAISE EXCEPTION 'Proprietario nao autorizado';END IF;
 IF p_mode NOT IN ('written','verbal','whatsapp')
 OR length(btrim(coalesce(p_terms,''))) NOT BETWEEN 8 AND 4000
 THEN RAISE EXCEPTION 'Contrato invalido';END IF;
 IF NOT EXISTS (SELECT 1 FROM public.business_proposals
 WHERE organization_id=p_org AND id=p_proposal AND status='accepted'
 AND (client_accepted_at IS NOT NULL OR NOT EXISTS (
   SELECT 1 FROM public.vitrine_leads vl
   WHERE vl.organization_id=p_org AND vl.converted_proposal_id=p_proposal
 )))
 THEN RAISE EXCEPTION 'Proposta nao aprovada';END IF;
 INSERT INTO public.business_contracts(organization_id,proposal_id,confirmation_mode,status,confirmed_at,terms)
 VALUES(p_org,p_proposal,p_mode,CASE WHEN p_confirm THEN 'confirmed' ELSE 'pending' END,
 CASE WHEN p_confirm THEN now() ELSE NULL END,btrim(p_terms))
 RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,CASE WHEN p_confirm THEN 'contract_confirmed' ELSE 'contract_drafted' END,'contract',v_id);
 RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.business_manage_draft(text,uuid,date,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_update_draft_prices(text,uuid,text,integer,numeric,numeric,numeric,numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_register_contract(text,uuid,uuid,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_manage_draft(text,uuid,date,text,boolean) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_update_draft_prices(text,uuid,text,integer,numeric,numeric,numeric,numeric) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_register_contract(text,uuid,uuid,text,text,boolean) TO antares_team_runtime;
COMMIT;
-- Conferencia APENAS LEITURA apos aplicar:
-- SELECT status,approved_at,client_accepted_at,client_acceptance_channel
-- FROM public.business_proposals ORDER BY created_at DESC LIMIT 10;
-- SELECT to_regprocedure('public.business_confirm_client_acceptance(text,uuid,text,text)');
