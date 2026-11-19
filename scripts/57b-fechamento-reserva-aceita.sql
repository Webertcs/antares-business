-- ANTARES 57B | Permitir encerramento de reserva aceita e ja realizada.
-- RASCUNHO PARA HOMOLOGACAO. NAO EXECUTAR SEM SNAPSHOT E COMPARACAO
-- DA FUNCAO ATUAL NO NEON (pg_get_functiondef).
-- Preserva RLS, acesso restrito ao proprietario e auditoria.
BEGIN;

DO $guard$
BEGIN
 IF current_user <> 'neondb_owner' THEN
   RAISE EXCEPTION 'Executar somente como neondb_owner apos revisao';
 END IF;
 IF to_regprocedure('public.antares_close_event(text,uuid,integer)') IS NULL THEN
   RAISE EXCEPTION 'Funcao atual de encerramento ausente';
 END IF;
 -- Evita substituir silenciosamente uma versao do Neon divergente da 53B.
 IF position('v_event.status <> ''confirmed''' in
   pg_get_functiondef(to_regprocedure('public.antares_close_event(text,uuid,integer)'))) = 0 THEN
   RAISE EXCEPTION 'Funcao atual diverge da 53B: realizar conciliacao manual';
 END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.antares_close_event(
 p_subject text, p_event uuid, p_students integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
 v_org uuid;
 v_event public.crm_events%ROWTYPE;
 v_presentation_status text;
 v_presentation_end timestamptz;
 v_proposal_status text;
BEGIN
 IF p_subject IS NULL OR btrim(p_subject)='' OR p_event IS NULL
   OR p_students IS NULL OR p_students NOT BETWEEN 0 AND 100000 THEN
  RAISE EXCEPTION 'Dados de encerramento invalidos';
 END IF;
 SELECT organization_id INTO STRICT v_org
 FROM public.team_members
 WHERE auth_subject=p_subject AND role='owner' AND active=true;
 SELECT * INTO STRICT v_event
 FROM public.crm_events
 WHERE id=p_event AND organization_id=v_org FOR UPDATE;

 IF v_event.status NOT IN ('confirmed','reserved') OR v_event.archived_at IS NOT NULL THEN
  RAISE EXCEPTION 'Situacao do evento impede encerramento';
 END IF;
 IF v_event.event_date IS NULL OR
    v_event.event_date>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
  RAISE EXCEPTION 'Evento sem data valida ou no futuro';
 END IF;

 -- Consulta a reserva efetivamente vinculada; contrato escrito nao e obrigatorio.
 SELECT p.status,p.ends_at,b.status
 INTO v_presentation_status,v_presentation_end,v_proposal_status
 FROM public.antares_presentation_event_links l
 JOIN public.presentations p
   ON p.id=l.presentation_id AND p.organization_id=l.organization_id
 LEFT JOIN public.antares_proposal_reservations r
   ON r.presentation_id=l.presentation_id AND r.organization_id=l.organization_id
 LEFT JOIN public.business_proposals b
   ON b.id=r.proposal_id AND b.organization_id=r.organization_id
 WHERE l.organization_id=v_org AND l.event_id=p_event
 LIMIT 1;

 IF v_event.status='reserved'
   AND (v_presentation_status IS NULL OR v_proposal_status IS DISTINCT FROM 'accepted') THEN
  RAISE EXCEPTION 'Evento reservado sem proposta aceita e reserva vinculada';
 END IF;
 IF v_presentation_status IS NOT NULL THEN
  IF v_presentation_status IN ('cancelled','canceled')
   OR v_presentation_end IS NULL OR v_presentation_end>now() THEN
   RAISE EXCEPTION 'A apresentacao nao terminou ou foi cancelada';
  END IF;
 ELSIF v_event.end_time IS NOT NULL AND
    ((v_event.event_date + v_event.end_time)
     AT TIME ZONE 'America/Sao_Paulo')>now() THEN
  RAISE EXCEPTION 'Aguarde o horario de termino do evento';
 END IF;

 -- Chave primaria (event_id) impede duplicacao, sem sobrescrever contagem.
 INSERT INTO public.antares_event_attendance
   (event_id,organization_id,actual_students,closed_by)
 VALUES (p_event,v_org,p_students,p_subject);
 UPDATE public.crm_events SET status='completed'
 WHERE id=p_event AND organization_id=v_org AND status IN ('confirmed','reserved');
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao atualizado'; END IF;
 INSERT INTO public.business_audit
   (organization_id,actor_subject,action,entity_type,entity_id)
 VALUES (v_org,p_subject,'event_closed','crm_event',p_event);
END $fn$;

REVOKE ALL ON FUNCTION public.antares_close_event(text,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_close_event(text,uuid,integer) TO antares_team_runtime;
COMMENT ON FUNCTION public.antares_close_event(text,uuid,integer)
 IS 'ANTARES_RESERVATION_CLOSE_V2';
COMMIT;

-- HOMOLOGACAO: conferir definicao atual em leitura antes de aplicar:
-- SELECT pg_get_functiondef(to_regprocedure('public.antares_close_event(text,uuid,integer)'));
-- Confirmar status da reserva e termino no Neon, depois testar em dados de homologacao.
