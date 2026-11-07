-- ANTARES 53B — Encerramento de eventos e presenca real.
-- EXECUTAR SOMENTE APOS BACKUP E REVISAO. NAO EXECUTADO AUTOMATICAMENTE.
-- Rodar com o proprietario do schema (neondb_owner).
BEGIN;

CREATE TABLE IF NOT EXISTS public.antares_event_attendance (
  event_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  actual_students integer NOT NULL CHECK (actual_students BETWEEN 0 AND 100000),
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by text NOT NULL,
  CONSTRAINT antares_attendance_event_org_fk FOREIGN KEY (event_id, organization_id)
    REFERENCES public.crm_events(id, organization_id),
  CONSTRAINT antares_attendance_org_fk FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
);

ALTER TABLE public.antares_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_event_attendance FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_event_attendance FROM PUBLIC;
REVOKE ALL ON public.antares_event_attendance FROM antares_team_runtime;

CREATE OR REPLACE FUNCTION public.antares_close_event(p_subject text, p_event uuid, p_students integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_org uuid;
  v_event public.crm_events%ROWTYPE;
BEGIN
  IF p_subject IS NULL OR btrim(p_subject) = '' OR p_event IS NULL
     OR p_students IS NULL OR p_students NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'Dados de encerramento invalidos';
  END IF;

  SELECT organization_id INTO STRICT v_org
  FROM public.team_members
  WHERE auth_subject=p_subject AND role='owner' AND active=true;

  SELECT * INTO STRICT v_event FROM public.crm_events
  WHERE id=p_event AND organization_id=v_org FOR UPDATE;

  IF v_event.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Somente eventos confirmados e ainda nao encerrados podem ser finalizados';
  END IF;
  IF v_event.event_date IS NULL OR v_event.event_date > (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'Nao e possivel encerrar evento sem data ou no futuro';
  END IF;

  -- PK(event_id) impede lancamento duplicado. Nao ha UPSERT.
  INSERT INTO public.antares_event_attendance(event_id,organization_id,actual_students,closed_by)
  VALUES (p_event,v_org,p_students,p_subject);

  UPDATE public.crm_events SET status='completed'
  WHERE id=p_event AND organization_id=v_org AND status='confirmed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao atualizado'; END IF;

  INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
  VALUES (v_org,p_subject,'event_closed','crm_event',p_event);
END;
$$;

REVOKE ALL ON FUNCTION public.antares_close_event(text,uuid,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_close_event(text,uuid,integer) FROM PUBLIC, neondb_owner;
GRANT EXECUTE ON FUNCTION public.antares_close_event(text,uuid,integer) TO antares_team_runtime;
COMMIT;

-- NOTA: nao criar politicas de acesso direto para o usuario operacional.
-- A consulta usa DATABASE_URL com verificacao de organizacao no servidor.
-- Correcao posterior de quantidade exige uma funcao separada e auditavel.
