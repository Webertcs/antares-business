-- ANTARES 02D: emissão atômica de convites.
-- Pré-requisito: 02F_CORRECAO_SEGURA_INTEGRIDADE.sql.
-- Migração transacional. Não habilita acesso nem muda o papel runtime.
BEGIN;
CREATE OR REPLACE FUNCTION public.issue_team_invitation(
  p_owner_subject text, p_email text, p_name text, p_token_hash text
) RETURNS TABLE(invitation_id uuid, valid_until timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_owner_id uuid; v_org_id uuid; v_id uuid; v_exp timestamptz;
BEGIN
  IF p_owner_subject IS NULL OR length(trim(p_owner_subject))=0
    OR p_email IS NULL OR p_email <> lower(trim(p_email))
    OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    OR length(p_email)>254
    OR length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 160
    OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'Dados de convite inválidos'; END IF;

  SELECT id, organization_id INTO v_owner_id, v_org_id
    FROM public.team_members
    WHERE auth_subject=p_owner_subject AND role='owner' AND active
    LIMIT 1;
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Proprietário não autorizado'; END IF;

  -- Impede concorrência de convites para o mesmo e-mail nesta organização.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_org_id::text || ':' || p_email, 0));
  IF EXISTS (SELECT 1 FROM public.team_members
    WHERE organization_id=v_org_id AND lower(email)=p_email AND active)
  THEN RAISE EXCEPTION 'Colaborador já ativo'; END IF;

  UPDATE public.team_invitations SET revoked_at=now()
  WHERE organization_id=v_org_id AND invited_email=p_email
    AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at<=now();

  IF EXISTS (SELECT 1 FROM public.team_invitations
    WHERE organization_id=v_org_id AND invited_email=p_email
      AND accepted_at IS NULL AND revoked_at IS NULL)
  THEN RAISE EXCEPTION 'Convite pendente já existe'; END IF;

  INSERT INTO public.team_invitations (
    organization_id, invited_email, invited_name, token_sha256,
    expires_at, created_by_member_id
  ) VALUES (v_org_id,p_email,trim(p_name),p_token_hash, now()+interval '48 hours',v_owner_id)
  RETURNING id,expires_at INTO v_id,v_exp;
  RETURN QUERY SELECT v_id,v_exp;
END $$;
REVOKE ALL ON FUNCTION public.issue_team_invitation(text,text,text,text) FROM PUBLIC;
COMMIT;
-- ATENÇÃO: SECURITY INVOKER exige privilégios e RLS do papel executor.
-- Não conceder permissões extras ou ativar TEAM_WRITES até homologar isolamento.
