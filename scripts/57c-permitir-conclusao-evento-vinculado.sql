-- ANTARES 57C — permitir conclusao auditada de eventos vinculados.
-- Correcao cirurgica da protecao de reservas: NAO desativa o trigger.
-- O encerramento continua exclusivo de public.antares_close_event:
-- essa funcao registra a presenca ANTES de mudar o status para completed.
-- Esta migracao apenas permite essa transicao especifica, desde que comprovada
-- por contagem ja inserida na mesma transacao.
-- Revisar e executar como neondb_owner na branch correta do Neon.
BEGIN;

DO $preflight$
DECLARE
  v_definition text;
BEGIN
  IF current_user <> 'neondb_owner' THEN
    RAISE EXCEPTION 'Necessario neondb_owner; nada alterado';
  END IF;
  IF to_regclass('public.antares_event_attendance') IS NULL
     OR to_regclass('public.antares_presentation_event_links') IS NULL THEN
    RAISE EXCEPTION 'Estrutura de encerramento/vinculo ausente; nada alterado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid='public.crm_events'::regclass
      AND t.tgname='antares_guard_linked_event_changes'
      AND NOT t.tgisinternal AND t.tgenabled<>'D'
      AND t.tgfoid=to_regprocedure('public.antares_guard_linked_event_changes()')
  ) THEN
    RAISE EXCEPTION 'Trigger de protecao esperado nao encontrado/ativo; nada alterado';
  END IF;

  SELECT pg_get_functiondef(p.oid)
    INTO v_definition
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.antares_guard_linked_event_changes()')
    AND p.prosecdef
    AND pg_get_userbyid(p.proowner)='neondb_owner';

  IF v_definition IS NULL
     OR position('Evento vinculado: altere a reserva para sincronizar' IN v_definition)=0
     OR position('NEW.status IS DISTINCT FROM v_reserva.status' IN v_definition)=0 THEN
    RAISE EXCEPTION 'Definicao do trigger diverge da versao revisada; nada alterado';
  END IF;

  IF coalesce(obj_description(
        to_regprocedure('public.antares_close_event(text,uuid,integer)')::oid
      ),'') <> 'ANTARES_RESERVATION_CLOSE_V2' THEN
    RAISE EXCEPTION 'Funcao de encerramento V2 nao instalada; nada alterado';
  END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.antares_guard_linked_event_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_reserva record;
  v_dome uuid;
BEGIN
  -- Nao alterar regras para edicoes que nao mexem em status/cupula/data/horario.
  IF NOT (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.dome_id IS DISTINCT FROM OLD.dome_id
    OR NEW.event_date IS DISTINCT FROM OLD.event_date
    OR NEW.start_time IS DISTINCT FROM OLD.start_time
    OR NEW.end_time IS DISTINCT FROM OLD.end_time
  ) THEN
    RETURN NEW;
  END IF;

  SELECT p.status,p.dome_id,p.starts_at,p.ends_at
    INTO v_reserva
  FROM public.antares_presentation_event_links l
  JOIN public.presentations p
    ON p.id=l.presentation_id
   AND p.organization_id=l.organization_id
  WHERE l.organization_id=OLD.organization_id
    AND l.event_id=OLD.id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT dl.antares_dome_id INTO v_dome
  FROM public.antares_dome_links dl
  WHERE dl.organization_id=OLD.organization_id
    AND dl.equipment_id=v_reserva.dome_id;

  -- Excecao unica: conclusao real e auditada, depois do horario final,
  -- sem mudar nenhum campo da reserva. A contagem protegida ja precisa
  -- existir (foi gravada na mesma transacao por antares_close_event).
  IF OLD.status IN ('reserved','confirmed')
     AND NEW.status='completed'
     AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
     AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id
     AND NEW.dome_id IS NOT DISTINCT FROM OLD.dome_id
     AND NEW.event_date IS NOT DISTINCT FROM OLD.event_date
     AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
     AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
     AND v_reserva.status NOT IN ('cancelled','canceled')
     AND v_reserva.ends_at IS NOT NULL
     AND v_reserva.ends_at <= now()
     AND EXISTS (
       SELECT 1
       FROM public.antares_event_attendance a
       JOIN public.team_members m
         ON m.organization_id=a.organization_id
        AND m.auth_subject=a.closed_by
        AND m.role='owner'
        AND m.active=true
       WHERE a.event_id=OLD.id
         AND a.organization_id=OLD.organization_id
     )
  THEN
    RETURN NEW;
  END IF;

  -- Mantem a regra anterior para cancelamento, reagendamento e demais edicoes.
  IF NEW.status IS DISTINCT FROM v_reserva.status
     OR NEW.dome_id IS DISTINCT FROM v_dome
     OR NEW.event_date IS DISTINCT FROM
        (v_reserva.starts_at AT TIME ZONE 'America/Sao_Paulo')::date
     OR NEW.start_time IS DISTINCT FROM
        (v_reserva.starts_at AT TIME ZONE 'America/Sao_Paulo')::time
     OR NEW.end_time IS DISTINCT FROM
        (v_reserva.ends_at AT TIME ZONE 'America/Sao_Paulo')::time
  THEN
    RAISE EXCEPTION 'Evento vinculado: altere a reserva para sincronizar';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.antares_guard_linked_event_changes()
IS 'ANTARES_LINKED_EVENT_GUARD_V2_COMPLETION';
COMMIT;

-- Pos-execucao, SOMENTE LEITURA:
-- SELECT obj_description(to_regprocedure(
--  'public.antares_guard_linked_event_changes()')::oid) AS versao_gatilho;
-- Resultado esperado: ANTARES_LINKED_EVENT_GUARD_V2_COMPLETION
