-- ANTARES 15A | Reserva, evento operacional e desfechos reais.
-- NAO EXECUTAR SEM SNAPSHOT e diagnostico do esquema real no Neon.
-- Requer 14C/14E/14F e as estruturas crm_events, presentations, business_proposals.
-- Somente instala estrutura e funcoes. NAO executa cancelamento/backfill por conta propria.
BEGIN;

DO $guard$
BEGIN
 IF to_regclass('public.antares_proposal_reservations') IS NULL OR
    to_regclass('public.presentations') IS NULL OR
    to_regclass('public.crm_events') IS NULL OR
    to_regclass('public.business_proposals') IS NULL OR
    to_regclass('public.antares_dome_links') IS NULL OR
    to_regclass('public.business_audit') IS NULL
 THEN RAISE EXCEPTION 'Pre-requisitos do ANTARES 15A nao instalados'; END IF;
END $guard$;

-- Ponte 1:1 (a mesma reserva NAO pode gerar dois eventos).
CREATE TABLE IF NOT EXISTS public.antares_presentation_event_links (
 organization_id uuid NOT NULL,
 presentation_id uuid NOT NULL,
 event_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id,presentation_id),
 UNIQUE (organization_id,event_id),
 FOREIGN KEY (presentation_id,organization_id) REFERENCES public.presentations(id,organization_id),
 FOREIGN KEY (event_id,organization_id) REFERENCES public.crm_events(id,organization_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS antares_presentation_event_one_per_presentation_15a
 ON public.antares_presentation_event_links(organization_id,presentation_id);
CREATE UNIQUE INDEX IF NOT EXISTS antares_presentation_event_one_per_event_15a
 ON public.antares_presentation_event_links(organization_id,event_id);
ALTER TABLE public.antares_presentation_event_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_presentation_event_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_presentation_event_links FROM PUBLIC,antares_team_runtime;

-- Diario imutavel de desfechos; nunca altera lancamentos de pagamento.
CREATE TABLE IF NOT EXISTS public.antares_reservation_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 presentation_id uuid NOT NULL,
 actor_subject text NOT NULL,
 action text NOT NULL CHECK(action IN ('cancelled','rescheduled')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),
 old_start timestamptz NOT NULL,
 old_end timestamptz NOT NULL,
 new_start timestamptz,
 new_end timestamptz,
 old_dome_id uuid,
 new_dome_id uuid,
 changed_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (presentation_id,organization_id) REFERENCES public.presentations(id,organization_id)
);
CREATE INDEX IF NOT EXISTS antares_reservation_changes_history_15a
 ON public.antares_reservation_changes(organization_id,presentation_id,changed_at DESC);
ALTER TABLE public.antares_reservation_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_reservation_changes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_reservation_changes FROM PUBLIC,antares_team_runtime;

-- Vincula uma apresentacao ja reservada ao evento CRM, reaproveitando
-- business_proposals.event_id quando for valido. NUNCA usa busca aproximada por nome.
CREATE OR REPLACE FUNCTION public.antares_link_reservation_event(
 p_subject text,p_org uuid,p_presentation uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE
 v_proposal uuid;v_client uuid;v_old_event uuid;v_event uuid;
 v_title text;v_expected integer;v_model text;v_unit numeric;v_fixed numeric;
 v_start timestamptz;v_end timestamptz;v_status text;v_dome uuid;
BEGIN
 IF (SELECT count(*) FROM public.team_members WHERE auth_subject=p_subject
      AND active AND role IN ('owner','collaborator'))<>1
    OR NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject
      AND organization_id=p_org AND active AND role='owner')
 THEN RAISE EXCEPTION 'Proprietario nao autorizado';END IF;

 SELECT b.id,b.client_id,b.event_id,b.title,b.expected_attendees,b.pricing_model,b.unit_price,b.fixed_price,
        p.starts_at,p.ends_at,p.status,dl.antares_dome_id
 INTO v_proposal,v_client,v_old_event,v_title,v_expected,v_model,v_unit,v_fixed,
      v_start,v_end,v_status,v_dome
 FROM public.antares_proposal_reservations r
 JOIN public.business_proposals b ON b.id=r.proposal_id AND b.organization_id=r.organization_id
 JOIN public.presentations p ON p.id=r.presentation_id AND p.organization_id=r.organization_id
 LEFT JOIN public.antares_dome_links dl ON dl.organization_id=p.organization_id AND dl.equipment_id=p.dome_id
 WHERE r.organization_id=p_org AND r.presentation_id=p_presentation AND b.status='accepted'
 FOR UPDATE OF r,b,p;

 IF v_proposal IS NULL THEN RAISE EXCEPTION 'Reserva ou proposta nao encontrada';END IF;
 IF v_status IN ('cancelled','canceled','completed') THEN
  RAISE EXCEPTION 'Reserva encerrada nao pode gerar novo evento';END IF;

 SELECT event_id INTO v_event FROM public.antares_presentation_event_links
 WHERE organization_id=p_org AND presentation_id=p_presentation;
 IF v_event IS NOT NULL THEN RETURN v_event;END IF;
 IF v_dome IS NULL THEN RAISE EXCEPTION 'Reserva sem cupula valida';END IF;

 IF v_old_event IS NOT NULL THEN
  SELECT e.id INTO v_event FROM public.crm_events e
  WHERE e.id=v_old_event AND e.organization_id=p_org AND e.client_id=v_client
    AND e.status NOT IN ('completed','cancelled','canceled')
    AND NOT EXISTS(SELECT 1 FROM public.antares_presentation_event_links l
       WHERE l.organization_id=p_org AND l.event_id=e.id AND l.presentation_id<>p_presentation)
  FOR UPDATE;
  IF v_event IS NULL THEN RAISE EXCEPTION 'Evento da proposta nao pode ser reutilizado';END IF;
 ELSE
  INSERT INTO public.crm_events
   (organization_id,client_id,title,event_kind,event_date,expected_attendees,
    pricing_model,price_per_person,fixed_amount,status)
  VALUES(p_org,v_client,v_title,'presentation',
   (v_start AT TIME ZONE 'America/Sao_Paulo')::date,v_expected,
   v_model,v_unit,v_fixed,'confirmed')
  RETURNING id INTO v_event;
 END IF;

 UPDATE public.crm_events SET
   status='confirmed',
   event_date=(v_start AT TIME ZONE 'America/Sao_Paulo')::date,
   start_time=(v_start AT TIME ZONE 'America/Sao_Paulo')::time,
   end_time=(v_end AT TIME ZONE 'America/Sao_Paulo')::time,
   dome_id=v_dome
 WHERE id=v_event AND organization_id=p_org;
 INSERT INTO public.antares_presentation_event_links(organization_id,presentation_id,event_id)
 VALUES(p_org,p_presentation,v_event);
 UPDATE public.business_proposals SET event_id=v_event
 WHERE id=v_proposal AND organization_id=p_org AND event_id IS NULL;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'reservation_operational_event_linked','presentation',p_presentation);
 RETURN v_event;
END $fn$;

-- Nova reserva: opera as duas etapas na MESMA transacao PostgreSQL.
-- Uma falha no vinculo desfaz a criacao da reserva.
CREATE OR REPLACE FUNCTION public.antares_book_and_link_proposal(
 p_subject text,p_org uuid,p_proposal uuid,p_dome uuid,p_start timestamptz,p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE v_id uuid;
BEGIN
 v_id:=public.antares_book_proposal(p_subject,p_org,p_proposal,p_dome,p_start,p_end);
 PERFORM public.antares_link_reservation_event(p_subject,p_org,v_id);
 RETURN v_id;
END $fn$;

-- Cancelar nao depende da data do evento; reagendar exige nova data futura.
-- Acoes preservam proposta, historico e todos os pagamentos; nao executam reembolso.
CREATE OR REPLACE FUNCTION public.antares_manage_proposal_reservation(
 p_subject text,p_org uuid,p_presentation uuid,p_action text,
 p_dome uuid,p_start timestamptz,p_end timestamptz,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE
 v_status text;v_event uuid;v_event_status text;v_old_start timestamptz;
 v_old_end timestamptz;v_old_equipment uuid;v_old_dome uuid;
 v_new_equipment uuid;v_capacity integer;v_expected integer;
BEGIN
 IF (SELECT count(*) FROM public.team_members WHERE auth_subject=p_subject
      AND active AND role IN ('owner','collaborator'))<>1
    OR NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject
      AND organization_id=p_org AND active AND role='owner')
 THEN RAISE EXCEPTION 'Proprietario nao autorizado';END IF;
 IF p_action NOT IN ('cancel','edit') OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500
 THEN RAISE EXCEPTION 'Acao ou motivo invalido';END IF;

 SELECT p.status,p.starts_at,p.ends_at,p.dome_id,b.expected_attendees
 INTO v_status,v_old_start,v_old_end,v_old_equipment,v_expected
 FROM public.antares_proposal_reservations r
 JOIN public.presentations p ON p.id=r.presentation_id AND p.organization_id=r.organization_id
 JOIN public.business_proposals b ON b.id=r.proposal_id AND b.organization_id=r.organization_id
 WHERE r.organization_id=p_org AND r.presentation_id=p_presentation
 FOR UPDATE OF r,p,b;
 IF v_status IS NULL THEN RAISE EXCEPTION 'Reserva nao encontrada';END IF;
 IF v_status IN ('cancelled','canceled','completed') THEN
  RAISE EXCEPTION 'Reserva ja encerrada';END IF;
 SELECT l.antares_dome_id INTO v_old_dome FROM public.antares_dome_links l
 WHERE l.organization_id=p_org AND l.equipment_id=v_old_equipment;
 SELECT event_id INTO v_event FROM public.antares_presentation_event_links
 WHERE organization_id=p_org AND presentation_id=p_presentation;
 IF v_event IS NOT NULL THEN
  SELECT status INTO v_event_status FROM public.crm_events
  WHERE organization_id=p_org AND id=v_event FOR UPDATE;
  IF v_event_status IS NULL OR v_event_status IN ('completed','cancelled','canceled')
  THEN RAISE EXCEPTION 'Evento ja encerrado ou inconsistente';END IF;
 END IF;

 IF p_action='cancel' THEN
  UPDATE public.presentations SET status='cancelled'
    WHERE id=p_presentation AND organization_id=p_org;
  IF v_event IS NOT NULL THEN
   UPDATE public.crm_events SET status='cancelled',archived_at=now()
    WHERE id=v_event AND organization_id=p_org;
  END IF;
  INSERT INTO public.antares_reservation_changes
   (organization_id,presentation_id,actor_subject,action,reason,
    old_start,old_end,old_dome_id)
  VALUES(p_org,p_presentation,p_subject,'cancelled',btrim(p_reason),
   v_old_start,v_old_end,v_old_dome);
  INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
  VALUES(p_org,p_subject,'proposal_presentation_cancelled','presentation',p_presentation);
  RETURN p_presentation;
 END IF;

 IF p_start IS NULL OR p_end IS NULL OR p_start<=now() OR
    p_end<=p_start OR p_end>p_start+interval '24 hours' THEN
  RAISE EXCEPTION 'Nova data invalida';END IF;
 SELECT l.equipment_id,d.capacity INTO v_new_equipment,v_capacity
 FROM public.antares_dome_links l JOIN public.antares_domes d
   ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
 JOIN public.equipment e ON e.id=l.equipment_id AND e.organization_id=l.organization_id
 WHERE l.organization_id=p_org AND l.antares_dome_id=p_dome
   AND d.active AND e.active AND e.category='dome';
 IF v_new_equipment IS NULL THEN RAISE EXCEPTION 'Cupula indisponivel';END IF;
 IF v_expected>0 AND v_capacity IS NOT NULL AND v_expected>v_capacity
 THEN RAISE EXCEPTION 'Capacidade insuficiente';END IF;
 -- Serializa concorrentes na mesma cupula. Exclusion constraint 08 e a protecao final.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||v_new_equipment::text,0));
 IF EXISTS(SELECT 1 FROM public.presentations p
   WHERE p.organization_id=p_org AND p.dome_id=v_new_equipment AND p.id<>p_presentation
   AND p.status NOT IN ('cancelled','canceled','completed')
   AND p.starts_at<p_end AND p.ends_at>p_start)
 THEN RAISE EXCEPTION 'Horario indisponivel';END IF;

 UPDATE public.presentations SET dome_id=v_new_equipment,starts_at=p_start,ends_at=p_end
 WHERE id=p_presentation AND organization_id=p_org;
 IF v_event IS NOT NULL THEN
  UPDATE public.crm_events SET
   event_date=(p_start AT TIME ZONE 'America/Sao_Paulo')::date,
   start_time=(p_start AT TIME ZONE 'America/Sao_Paulo')::time,
   end_time=(p_end AT TIME ZONE 'America/Sao_Paulo')::time,
   dome_id=p_dome
  WHERE id=v_event AND organization_id=p_org;
 END IF;
 INSERT INTO public.antares_reservation_changes
  (organization_id,presentation_id,actor_subject,action,reason,
   old_start,old_end,new_start,new_end,old_dome_id,new_dome_id)
 VALUES(p_org,p_presentation,p_subject,'rescheduled',btrim(p_reason),
  v_old_start,v_old_end,p_start,p_end,v_old_dome,p_dome);
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'proposal_presentation_rescheduled','presentation',p_presentation);
 RETURN p_presentation;
END $fn$;

REVOKE ALL ON FUNCTION public.antares_link_reservation_event(text,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_book_and_link_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_manage_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_link_reservation_event(text,uuid,uuid) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_book_and_link_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_manage_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz,text) TO antares_team_runtime;
COMMIT;

-- POS-IMPLANTACAO: consultar estrutura e permissao antes de liberar na interface.
-- Nao executar backfill automatico. Cada reserva antiga devera ser vinculada explicitamente.
