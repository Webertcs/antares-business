-- 65A: implantação aditiva. Primeiro em homologação, depois em production após validação.
-- Não altera contas existentes, não exclui registros, não habilita acesso adicional.
BEGIN;
DO $$
BEGIN
 IF current_user <> 'neondb_owner' THEN RAISE EXCEPTION 'Execute como neondb_owner'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_team_runtime' AND rolcanlogin AND NOT rolsuper AND NOT rolbypassrls) THEN
  RAISE EXCEPTION 'Runtime não homologado';
 END IF;
END $$;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS antares_archived_member_inactive;
ALTER TABLE public.team_members ADD CONSTRAINT antares_archived_member_inactive CHECK (archived_at IS NULL OR NOT active);
ALTER TABLE public.team_security_events DROP CONSTRAINT IF EXISTS team_security_events_action_check;
ALTER TABLE public.team_security_events ADD CONSTRAINT team_security_events_action_check
 CHECK (action IN ('invitation_issued','invitation_accepted','invitation_revoked','member_suspended','member_reactivated','member_archived','technical_access_retired'));
CREATE OR REPLACE FUNCTION public.antares_manage_collaborator(p_subject text,p_org uuid,p_member uuid,p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE target public.team_members%ROWTYPE; v_subject text; v_email text;
BEGIN
 IF p_subject IS NULL OR p_org IS NULL OR p_member IS NULL OR p_action IS NULL OR p_action NOT IN ('reactivate','archive') THEN RETURN false; END IF;
 PERFORM 1 FROM public.team_members WHERE organization_id=p_org AND auth_subject=p_subject AND active AND role='owner' FOR SHARE;
 IF NOT FOUND OR (SELECT count(*) FROM public.team_members WHERE auth_subject=p_subject AND active)<>1 THEN RETURN false; END IF;
 SELECT auth_subject,lower(email) INTO v_subject,v_email FROM public.team_members WHERE id=p_member AND organization_id=p_org AND role='collaborator' AND NOT active;
 IF NOT FOUND OR nullif(btrim(v_subject),'') IS NULL OR v_email IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_subject,0));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||v_email,0));
 SELECT * INTO target FROM public.team_members WHERE id=p_member AND organization_id=p_org AND role='collaborator' AND NOT active AND auth_subject=v_subject AND lower(email)=v_email FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.team_invitations WHERE organization_id=p_org AND invited_email=v_email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()) THEN RETURN false; END IF;
 IF p_action='reactivate' THEN
  IF EXISTS(SELECT 1 FROM public.team_members WHERE active AND (auth_subject=v_subject OR (organization_id=p_org AND lower(email)=v_email))) THEN RETURN false; END IF;
  UPDATE public.team_members SET active=true,archived_at=NULL WHERE id=target.id;
 ELSE
  IF target.archived_at IS NOT NULL THEN RETURN false; END IF;
  UPDATE public.team_members SET archived_at=now() WHERE id=target.id;
 END IF;
 INSERT INTO public.team_security_events(organization_id,action,actor_subject,target_id)
 VALUES(p_org,CASE WHEN p_action='reactivate' THEN 'member_reactivated' ELSE 'member_archived' END,p_subject,target.id);
 RETURN true;
END $$;
ALTER FUNCTION public.antares_manage_collaborator(text,uuid,uuid,text) OWNER TO neondb_owner;
REVOKE ALL ON FUNCTION public.antares_manage_collaborator(text,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_manage_collaborator(text,uuid,uuid,text) TO antares_team_runtime;
COMMENT ON FUNCTION public.antares_manage_collaborator(text,uuid,uuid,text) IS 'ANTARES_TEAM_MANAGE_V1';
COMMIT;
