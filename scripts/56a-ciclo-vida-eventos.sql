-- ANTARES 56A: cancelamento e arquivamento reversivel de eventos
-- Executar somente apos backup e revisao da estrutura no Neon.
BEGIN;
ALTER TABLE public.crm_events ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.crm_events ADD COLUMN IF NOT EXISTS cancellation_reason text;
CREATE OR REPLACE FUNCTION public.antares_manage_event_lifecycle(
 p_subject text,p_event_id uuid,p_action text,p_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid; v_event public.crm_events%ROWTYPE; v_reason text;
BEGIN
 SELECT organization_id INTO v_org FROM public.team_members
 WHERE auth_subject=p_subject AND role='owner' AND active=true LIMIT 1;
 IF v_org IS NULL THEN RAISE EXCEPTION 'Proprietario nao autorizado'; END IF;
 SELECT * INTO v_event FROM public.crm_events
 WHERE id=p_event_id AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao encontrado'; END IF;
 v_reason=btrim(coalesce(p_reason,''));
 IF p_action='cancel' THEN
  IF length(v_reason)<5 OR length(v_reason)>1000 THEN RAISE EXCEPTION 'Informe o motivo (5 a 1000 caracteres)'; END IF;
  IF v_event.archived_at IS NOT NULL OR v_event.status IN ('completed','cancelled','canceled') THEN
   RAISE EXCEPTION 'Evento encerrado, cancelado ou arquivado'; END IF;
  UPDATE public.crm_events SET status='cancelled',cancellation_reason=v_reason WHERE id=p_event_id AND organization_id=v_org;
 ELSIF p_action='archive' THEN
  IF v_event.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Evento ja arquivado'; END IF;
  IF v_event.status IN ('completed','confirmed','reserved') THEN RAISE EXCEPTION 'Evento operacional nao pode ser arquivado'; END IF;
  IF EXISTS(SELECT 1 FROM public.business_proposals WHERE event_id=p_event_id AND organization_id=v_org) THEN
   RAISE EXCEPTION 'Evento possui proposta vinculada'; END IF;
  UPDATE public.crm_events SET archived_at=now() WHERE id=p_event_id AND organization_id=v_org;
 ELSIF p_action='restore' THEN
  IF v_event.archived_at IS NULL THEN RAISE EXCEPTION 'Evento nao esta arquivado'; END IF;
  UPDATE public.crm_events SET archived_at=NULL WHERE id=p_event_id AND organization_id=v_org;
 ELSE RAISE EXCEPTION 'Acao invalida'; END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'event_'||p_action,'crm_event',p_event_id);
END;$$;
REVOKE ALL ON FUNCTION public.antares_manage_event_lifecycle(text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_manage_event_lifecycle(text,uuid,text,text) TO antares_team_runtime;
COMMIT;
