-- ANTARES 06C: lembretes internos, acesso exclusivo ao proprietario
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_manage_relationship_action(
  p_actor text, p_client uuid, p_action uuid, p_kind text,
  p_date date, p_priority text, p_note text, p_command text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid; v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_actor AND active=true AND role='owner';
 IF p_command NOT IN ('create','complete','dismiss') THEN RAISE EXCEPTION 'Comando invalido'; END IF;
 IF p_command='create' THEN
   IF p_client IS NULL OR p_kind NOT IN ('follow_up','renewal','feedback','offer','other')
      OR p_priority NOT IN ('low','normal','high') OR length(coalesce(p_note,''))>2000
      OR NOT EXISTS(SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=v_org)
   THEN RAISE EXCEPTION 'Dados invalidos'; END IF;
   INSERT INTO public.antares_relationship_actions
    (organization_id,client_id,action_kind,due_date,priority,note)
   VALUES(v_org,p_client,p_kind,p_date,p_priority,coalesce(p_note,''))
   RETURNING id INTO v_id;
 ELSE
   UPDATE public.antares_relationship_actions
   SET status=CASE WHEN p_command='complete' THEN 'done' ELSE 'dismissed' END,
       completed_at=now()
   WHERE id=p_action AND organization_id=v_org AND status='open'
   RETURNING id INTO v_id;
   IF v_id IS NULL THEN RAISE EXCEPTION 'Acao nao encontrada ou finalizada'; END IF;
 END IF;
 RETURN v_id;
EXCEPTION WHEN no_data_found OR too_many_rows THEN RAISE EXCEPTION 'Proprietario nao autorizado';
END $$;
REVOKE ALL ON FUNCTION public.antares_manage_relationship_action(text,uuid,uuid,text,date,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_manage_relationship_action(text,uuid,uuid,text,date,text,text,text) FROM antares_public_inbox_login;
GRANT EXECUTE ON FUNCTION public.antares_manage_relationship_action(text,uuid,uuid,text,date,text,text,text) TO antares_team_runtime;
COMMIT;