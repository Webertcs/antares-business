-- ANTARES: vínculo protegido de colaboradores por evento.
-- Executar uma única vez como neondb_owner, após revisão do ambiente.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_event_team_assignments (
 organization_id uuid NOT NULL,
 event_id uuid NOT NULL,
 member_id uuid NOT NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(),
 assigned_by text NOT NULL,
 PRIMARY KEY (organization_id,event_id,member_id)
);
ALTER TABLE public.antares_event_team_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_event_team_assignments FROM PUBLIC;
REVOKE ALL ON public.antares_event_team_assignments FROM antares_team_runtime;
CREATE OR REPLACE FUNCTION public.antares_set_event_team(
 p_subject text,p_org uuid,p_event uuid,p_members uuid[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_member uuid; v_owner_count integer;
BEGIN
 IF p_subject IS NULL OR p_org IS NULL OR p_event IS NULL OR p_members IS NULL OR cardinality(p_members)>30 THEN
  RAISE EXCEPTION 'Parâmetros inválidos';
 END IF;
 SELECT count(*) INTO v_owner_count FROM public.team_members
 WHERE organization_id=p_org AND auth_subject=p_subject AND active=true AND role='owner';
 IF v_owner_count<>1 THEN RAISE EXCEPTION 'Proprietário não autorizado'; END IF;
 PERFORM 1 FROM public.crm_events WHERE id=p_event AND organization_id=p_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento não encontrado'; END IF;
 IF EXISTS (
  SELECT 1 FROM unnest(p_members) AS m(id)
  LEFT JOIN public.team_members t ON t.id=m.id AND t.organization_id=p_org AND t.active=true AND t.role='collaborator'
  WHERE t.id IS NULL
 ) OR (SELECT count(*) FROM unnest(p_members))<>(SELECT count(DISTINCT id) FROM unnest(p_members) AS m(id))
 THEN RAISE EXCEPTION 'Colaborador inválido ou duplicado'; END IF;
 DELETE FROM public.antares_event_team_assignments WHERE organization_id=p_org AND event_id=p_event;
 INSERT INTO public.antares_event_team_assignments(organization_id,event_id,member_id,assigned_by)
 SELECT p_org,p_event,m.id,p_subject FROM unnest(p_members) AS m(id);
END;
$$;
REVOKE ALL ON FUNCTION public.antares_set_event_team(text,uuid,uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_set_event_team(text,uuid,uuid,uuid[]) TO antares_team_runtime;
COMMIT;
