-- ANTARES 55C — Copia automatica do checklist padrao para eventos NOVOS.
-- Aplicar no Neon SQL Editor apos backup. Nao altera eventos existentes.
-- O modelo fica em antares_operational_checklist_defaults (55B).
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_seed_event_checklist_from_default()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE v_items jsonb;
BEGIN
  SELECT items INTO v_items
  FROM public.antares_operational_checklist_defaults
  WHERE organization_id=NEW.organization_id;
  IF v_items IS NULL OR jsonb_array_length(v_items)=0 THEN
    RETURN NEW;
  END IF;
  -- Cada evento recebe itens independentes. O modelo nunca e alterado por marcacoes.
  INSERT INTO public.antares_event_checklist
    (organization_id,event_id,label,done)
  SELECT NEW.organization_id,NEW.id,entry.value #>> '{}',false
  FROM jsonb_array_elements(v_items) WITH ORDINALITY AS entry(value,position)
  ORDER BY entry.position;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.antares_seed_event_checklist_from_default() FROM PUBLIC;
DROP TRIGGER IF EXISTS antares_seed_event_checklist_default ON public.crm_events;
CREATE TRIGGER antares_seed_event_checklist_default
AFTER INSERT ON public.crm_events
FOR EACH ROW
EXECUTE FUNCTION public.antares_seed_event_checklist_from_default();
COMMIT;

-- Conferencia opcional, sem modificar dados:
-- SELECT tgname,tgenabled FROM pg_trigger
-- WHERE tgrelid='public.crm_events'::regclass
-- AND tgname='antares_seed_event_checklist_default';
