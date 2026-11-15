-- ANTARES 06E: arquivamento reversivel de historico, sem excluir registros de negocio
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_relationship_history_archive (
 organization_id uuid NOT NULL,
 action_id uuid NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT now(),
 archived_by text NOT NULL,
 PRIMARY KEY (organization_id,action_id)
);
CREATE TABLE IF NOT EXISTS public.antares_relationship_history_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL,
 action_id uuid NOT NULL,
 actor text NOT NULL,
 operation text NOT NULL CHECK (operation IN ('archive','restore')),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.antares_relationship_history_archive,public.antares_relationship_history_audit FROM PUBLIC,antares_team_runtime;
ALTER TABLE public.antares_relationship_history_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_relationship_history_audit ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.antares_manage_relationship_history(p_actor text,p_action uuid,p_operation text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members WHERE auth_subject=p_actor AND active=true AND role='owner';
 IF p_operation NOT IN ('archive','restore') OR p_action IS NULL THEN RAISE EXCEPTION 'Comando invalido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.antares_relationship_actions WHERE id=p_action AND organization_id=v_org AND status IN ('done','dismissed')) THEN
  RAISE EXCEPTION 'Historico nao encontrado ou ainda em aberto';
 END IF;
 IF p_operation='archive' THEN
  INSERT INTO public.antares_relationship_history_archive(organization_id,action_id,archived_by)
  VALUES(v_org,p_action,p_actor) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'Historico ja arquivado'; END IF;
 ELSE
  DELETE FROM public.antares_relationship_history_archive WHERE organization_id=v_org AND action_id=p_action;
  IF NOT FOUND THEN RAISE EXCEPTION 'Historico nao arquivado'; END IF;
 END IF;
 INSERT INTO public.antares_relationship_history_audit(organization_id,action_id,actor,operation) VALUES(v_org,p_action,p_actor,p_operation);
 RETURN p_action;
EXCEPTION WHEN no_data_found OR too_many_rows THEN RAISE EXCEPTION 'Proprietario nao autorizado';
END $$;
REVOKE ALL ON FUNCTION public.antares_manage_relationship_history(text,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_manage_relationship_history(text,uuid,text) FROM antares_public_inbox_login;
GRANT EXECUTE ON FUNCTION public.antares_manage_relationship_history(text,uuid,text) TO antares_team_runtime;
COMMIT;
