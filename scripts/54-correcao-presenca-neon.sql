-- ANTARES 54 — Correção auditável da presença após encerramento.
-- Executar no SQL Editor do Neon com neondb_owner APÓS backup.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_attendance_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL,
 organization_id uuid NOT NULL,
 previous_students integer NOT NULL CHECK(previous_students BETWEEN 0 AND 100000),
 corrected_students integer NOT NULL CHECK(corrected_students BETWEEN 0 AND 100000),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),
 corrected_by text NOT NULL,
 corrected_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT antares_correction_event_fk FOREIGN KEY(event_id,organization_id)
 REFERENCES public.crm_events(id,organization_id)
);
ALTER TABLE public.antares_attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_attendance_corrections FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_attendance_corrections FROM PUBLIC,antares_team_runtime;

CREATE OR REPLACE FUNCTION public.antares_correct_event_attendance(
 p_subject text,p_event uuid,p_students integer,p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_previous integer;
BEGIN
 IF p_subject IS NULL OR btrim(p_subject)='' OR p_event IS NULL
 OR p_students IS NULL OR p_students NOT BETWEEN 0 AND 100000
 OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 5 AND 500 THEN
  RAISE EXCEPTION 'Dados de correcao invalidos';
 END IF;
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND role='owner' AND active=true;
 PERFORM 1 FROM public.crm_events WHERE id=p_event AND organization_id=v_org AND status='completed' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao encerrado ou sem permissao';END IF;
 SELECT actual_students INTO STRICT v_previous FROM public.antares_event_attendance
 WHERE event_id=p_event AND organization_id=v_org FOR UPDATE;
 IF v_previous=p_students THEN RAISE EXCEPTION 'Quantidade igual a registrada';END IF;
 UPDATE public.antares_event_attendance SET actual_students=p_students
 WHERE event_id=p_event AND organization_id=v_org;
 INSERT INTO public.antares_attendance_corrections
 (event_id,organization_id,previous_students,corrected_students,reason,corrected_by)
 VALUES(p_event,v_org,v_previous,p_students,btrim(p_reason),p_subject);
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'event_attendance_corrected','crm_event',p_event);
END;$$;
REVOKE ALL ON FUNCTION public.antares_correct_event_attendance(text,uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_correct_event_attendance(text,uuid,integer,text) TO antares_team_runtime;
COMMIT;
