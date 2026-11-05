-- 02D: funções transacionais para suspensão e revogação.
-- Executar somente após validação de permissões, backup e testes em homologação.
BEGIN;
CREATE OR REPLACE FUNCTION public.suspend_team_collaborator(
  p_owner_subject text,
  p_target_member uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp AS $$
DECLARE v_owner public.team_members%ROWTYPE;
BEGIN
  SELECT * INTO v_owner FROM public.team_members
  WHERE auth_subject = p_owner_subject AND active = true AND role = 'owner'
  LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.team_members SET active = false
  WHERE id = p_target_member AND organization_id = v_owner.organization_id
    AND role = 'collaborator' AND active = true;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.suspend_team_collaborator(text,uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.revoke_team_invitation(
  p_owner_subject text,
  p_invitation_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp AS $$
DECLARE v_owner public.team_members%ROWTYPE;
BEGIN
  SELECT * INTO v_owner FROM public.team_members
  WHERE auth_subject = p_owner_subject AND active = true AND role = 'owner'
  LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.team_invitations SET revoked_at = now()
  WHERE id = p_invitation_id AND organization_id = v_owner.organization_id
    AND revoked_at IS NULL AND accepted_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_team_invitation(text,uuid) FROM PUBLIC;
COMMIT;
