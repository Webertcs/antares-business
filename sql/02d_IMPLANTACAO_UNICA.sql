-- ANTARES BUSINESS — 02D, MIGRACAO UNICA (29/10/2026)
-- Executar no SQL Editor com backup. Nao apaga ou modifica membros existentes.
-- Esta migracao NAO corrige isoladamente o RLS dos modulos financeiros/CRM.
BEGIN;

CREATE TABLE IF NOT EXISTS public.team_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 invited_email text NOT NULL CHECK (invited_email=lower(btrim(invited_email)) AND length(invited_email) BETWEEN 3 AND 254),
 invited_name text NOT NULL CHECK (length(btrim(invited_name)) BETWEEN 2 AND 160),
 proposed_role text NOT NULL DEFAULT 'collaborator' CHECK (proposed_role='collaborator'),
 token_sha256 text NOT NULL UNIQUE CHECK(token_sha256 ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL,
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_by_member_id uuid NOT NULL REFERENCES public.team_members(id),
 accepted_by_subject text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT invitation_valid_state CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invites_pending
 ON public.team_invitations(organization_id, invited_email)
 WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Tabela de auditoria especializada, sem PII nem token bruto.
CREATE TABLE IF NOT EXISTS public.team_security_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 action text NOT NULL CHECK (action IN ('invitation_accepted','member_suspended')),
 actor_subject text NOT NULL,
 target_id uuid NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_security_events FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(
 p_token_sha256 text, p_auth_subject text, p_email text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE inv public.team_invitations%ROWTYPE; new_id uuid;
BEGIN
 IF p_token_sha256 IS NULL OR p_token_sha256 !~ '^[a-f0-9]{64}$'
    OR nullif(btrim(p_auth_subject),'') IS NULL OR p_email IS NULL THEN RETURN NULL; END IF;
 -- Serializa aceites concorrentes da mesma identidade.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_auth_subject, 0));
 SELECT * INTO inv FROM public.team_invitations
 WHERE token_sha256=p_token_sha256 FOR UPDATE;
 IF NOT FOUND OR inv.accepted_at IS NOT NULL OR inv.revoked_at IS NOT NULL
    OR inv.expires_at<=now() OR inv.proposed_role<>'collaborator'
    OR inv.invited_email<>lower(btrim(p_email)) THEN RETURN NULL; END IF;
 IF EXISTS (SELECT 1 FROM public.team_members WHERE auth_subject=p_auth_subject AND active=true)
 THEN RETURN NULL; END IF;
 INSERT INTO public.team_members(organization_id,auth_subject,full_name,email,role,active)
 VALUES(inv.organization_id,p_auth_subject,inv.invited_name,inv.invited_email,'collaborator',true)
 RETURNING id INTO new_id;
 UPDATE public.team_invitations SET accepted_at=now(),accepted_by_subject=p_auth_subject WHERE id=inv.id;
 INSERT INTO public.team_security_events(organization_id,action,actor_subject,target_id)
 VALUES(inv.organization_id,'invitation_accepted',p_auth_subject,new_id);
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.accept_team_invitation(text,text,text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.suspend_team_collaborator(
 p_owner_subject text,p_target_member uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE owner_row public.team_members%ROWTYPE; suspended_id uuid;
BEGIN
 SELECT * INTO owner_row FROM public.team_members
 WHERE auth_subject=p_owner_subject AND role='owner' AND active=true LIMIT 1;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.team_members SET active=false
 WHERE id=p_target_member AND organization_id=owner_row.organization_id
 AND role='collaborator' AND active=true RETURNING id INTO suspended_id;
 IF suspended_id IS NULL THEN RETURN false; END IF;
 INSERT INTO public.team_security_events(organization_id,action,actor_subject,target_id)
 VALUES(owner_row.organization_id,'member_suspended',p_owner_subject,suspended_id);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.suspend_team_collaborator(text,uuid) FROM PUBLIC;

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
 RETURN changed_id IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.revoke_team_invitation(text,uuid) FROM PUBLIC;

COMMIT;

-- ATENCAO: antes de habilitar APIs, revisar privileges, segregacao de role
-- runtime e politicas RLS. Nao configure TEAM_WRITES_ENABLED=true ainda.
