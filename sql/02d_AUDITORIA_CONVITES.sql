-- ANTARES BUSINESS 02D — Auditoria completa de operações da equipe
-- Executar somente após a migração 02d_CONVITES_ATOMICOS.sql.
-- Não habilita convites nem modifica participantes.
BEGIN;
ALTER TABLE public.team_security_events
 DROP CONSTRAINT IF EXISTS team_security_events_action_check;
ALTER TABLE public.team_security_events
 ADD CONSTRAINT team_security_events_action_check
 CHECK (action IN ('invitation_issued','invitation_accepted','invitation_revoked','member_suspended'));

CREATE OR REPLACE FUNCTION public.revoke_team_invitation(
 p_owner_subject text,p_invitation_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE owner_org uuid; changed_id uuid;
BEGIN
 SELECT organization_id INTO owner_org FROM public.team_members
 WHERE auth_subject=p_owner_subject AND role='owner' AND active=true LIMIT 1;
 IF owner_org IS NULL THEN RETURN false; END IF;
 UPDATE public.team_invitations SET revoked_at=now()
 WHERE id=p_invitation_id AND organization_id=owner_org
 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id INTO changed_id;
 IF changed_id IS NULL THEN RETURN false; END IF;
 INSERT INTO public.team_security_events(organization_id,action,actor_subject,target_id)
 VALUES(owner_org,'invitation_revoked',p_owner_subject,changed_id);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.revoke_team_invitation(text,uuid) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.issue_team_invitation(
  p_owner_subject text, p_email text, p_name text, p_token_hash text
) RETURNS TABLE(invitation_id uuid, valid_until timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $
DECLARE v_owner_id uuid; v_org_id uuid; v_id uuid; v_exp timestamptz;
BEGIN
  IF p_owner_subject IS NULL OR length(trim(p_owner_subject))=0
    OR p_email IS NULL OR p_email <> lower(trim(p_email))
    OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+

    OR length(p_email)>254
    OR length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 160
    OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}

  THEN RAISE EXCEPTION 'Dados de convite inválidos'; END IF;
  SELECT id,organization_id INTO v_owner_id,v_org_id FROM public.team_members
  WHERE auth_subject=p_owner_subject AND role='owner' AND active LIMIT 1;
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Proprietário não autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_org_id::text || ':' || p_email, 0));
  IF EXISTS (SELECT 1 FROM public.team_members WHERE organization_id=v_org_id AND lower(email)=p_email AND active)
  THEN RAISE EXCEPTION 'Colaborador já ativo'; END IF;
  UPDATE public.team_invitations SET revoked_at=now() WHERE organization_id=v_org_id
   AND invited_email=p_email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at<=now();
  IF EXISTS (SELECT 1 FROM public.team_invitations WHERE organization_id=v_org_id
   AND invited_email=p_email AND accepted_at IS NULL AND revoked_at IS NULL)
  THEN RAISE EXCEPTION 'Convite pendente já existe'; END IF;
  INSERT INTO public.team_invitations (organization_id, invited_email, invited_name, token_sha256,expires_at,created_by_member_id)
  VALUES (v_org_id,p_email,trim(p_name),p_token_hash,now()+interval '48 hours',v_owner_id)
  RETURNING id,expires_at INTO v_id,v_exp;
  INSERT INTO public.team_security_events(organization_id,action,actor_subject,target_id)
  VALUES (v_org_id,'invitation_issued',p_owner_subject,v_id);
  RETURN QUERY SELECT v_id,v_exp;
END $;
REVOKE ALL ON FUNCTION public.issue_team_invitation(text,text,text,text) FROM PUBLIC;
COMMIT;
-- SECURITY INVOKER: mantém bloqueio até permissões e RLS do executor estarem validados.

