-- Complemento da migração 02D: executar APÓS 02d_team_invitations_proposta.sql.
-- Requer role servidor confiável. NÃO expor EXECUTE a roles públicas.
BEGIN;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(
  p_token_sha256 text,
  p_auth_subject text,
  p_email text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv public.team_invitations%ROWTYPE;
  v_member uuid;
BEGIN
  IF p_token_sha256 !~ '^[a-f0-9]{64}$'
     OR length(coalesce(p_auth_subject, '')) = 0
     OR length(coalesce(p_email, '')) > 254 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_inv
  FROM public.team_invitations
  WHERE token_sha256 = p_token_sha256
  FOR UPDATE;

  IF NOT FOUND OR v_inv.accepted_at IS NOT NULL OR v_inv.revoked_at IS NOT NULL
     OR v_inv.expires_at <= now()
     OR v_inv.invited_email <> lower(btrim(p_email))
     OR v_inv.proposed_role <> 'collaborator' THEN
    RETURN NULL;
  END IF;

  -- Não permitir vincular a identidade a outra organização sem seletor multi-org.
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE auth_subject = p_auth_subject AND active = true
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.team_members
    (organization_id, auth_subject, full_name, email, role, active)
  VALUES
    (v_inv.organization_id, p_auth_subject, v_inv.invited_name, v_inv.invited_email, 'collaborator', true)
  RETURNING id INTO v_member;

  UPDATE public.team_invitations
  SET accepted_at = now(), accepted_by_subject = p_auth_subject
  WHERE id = v_inv.id;

  RETURN v_member;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invitation(text,text,text) FROM PUBLIC;
-- ATENÇÃO: o PostgreSQL não consegue verificar se p_auth_subject foi informado
-- pelo Neon Auth. Somente backend autenticado deve poder EXECUTE esta função.
-- A role de DATABASE_URL deve ser exclusiva do servidor, nunca distribuída ao cliente.
COMMIT;
