-- ANTARES BUSINESS — Bloco 02D
-- MIGRAÇÃO PROPOSTA: execute somente em homologação após revisão.
-- Não cria usuários automaticamente nem altera vínculos existentes.
-- Tokens de convite somente em SHA-256 (o token bruto nunca vai ao banco).
BEGIN;

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_name text NOT NULL,
  proposed_role text NOT NULL DEFAULT 'collaborator'
    CHECK (proposed_role = 'collaborator'),
  token_sha256 text NOT NULL UNIQUE
    CHECK (token_sha256 ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by_member_id uuid NOT NULL REFERENCES public.team_members(id),
  accepted_by_subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitation_email_valid CHECK (
    length(invited_email) BETWEEN 3 AND 254
    AND invited_email = lower(btrim(invited_email))
    AND invited_email LIKE '%@%'
  ),
  CONSTRAINT invitation_name_valid CHECK (length(btrim(invited_name)) BETWEEN 2 AND 160),
  CONSTRAINT invitation_expiry_valid CHECK (expires_at > created_at),
  CONSTRAINT invitation_state_valid CHECK (
    NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS team_invitations_pending
  ON public.team_invitations(organization_id, invited_email, expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
-- Sem políticas deliberadamente: nenhuma consulta direta via role cliente.
-- APIs do servidor precisam verificar explicitamente sessão e organização.
-- Importante: o papel do DATABASE_URL deve ter permissões mínimas.

COMMIT;
