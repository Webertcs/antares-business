-- ANTARES BUSINESS — BLOCO 02, PACOTE CONSOLIDADO PARA HOMOLOGAÇÃO
-- Execute com neondb_owner no Neon SQL Editor APÓS backup.
-- Verificações e funções transacionais, SEM habilitar HTTP automaticamente.
-- IMPORTANTE: autenticação é verificada NO SERVIDOR; sujeito passado para
-- funções NÃO deve vir do JSON do cliente. Credencial runtime exclusivamente backend.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_team_runtime'
    AND NOT rolsuper AND NOT rolbypassrls) THEN
  RAISE EXCEPTION 'Papel runtime ausente ou excessivamente privilegiado';
 END IF;
 IF EXISTS (SELECT 1 FROM public.team_members WHERE active AND auth_subject IS NOT NULL
  GROUP BY auth_subject HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Identidade com mais de um vínculo ativo';
 END IF;
 IF EXISTS (SELECT 1 FROM public.team_invitations
  WHERE accepted_at IS NULL AND revoked_at IS NULL
  GROUP BY organization_id,invited_email HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Convites pendentes duplicados';
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS team_members_unique_active_subject
 ON public.team_members(auth_subject) WHERE active AND auth_subject IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_unique_pending_email
 ON public.team_invitations(organization_id,invited_email)
 WHERE accepted_at IS NULL AND revoked_at IS NULL;
ALTER TABLE public.team_security_events DROP CONSTRAINT IF EXISTS team_security_events_action_check;
ALTER TABLE public.team_security_events ADD CONSTRAINT team_security_events_action_check
 CHECK (action IN ('invitation_issued','invitation_accepted','invitation_revoked','member_suspended'));
CREATE OR REPLACE FUNCTION public.issue_team_invitation(
  p_owner_subject text, p_email text, p_name text, p_token_hash text
) RETURNS TABLE(invitation_id uuid, valid_until timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $
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

CREATE OR REPLACE FUNCTION public.accept_team_invitation(
 p_token_sha256 text, p_auth_subject text, p_email text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.suspend_team_collaborator(
 p_owner_subject text,p_target_member uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.revoke_team_invitation(
 p_owner_subject text,p_invitation_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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

-- As funções são propriedade de neondb_owner, com verificações explícitas
-- de dono, organização, email, validade e token; o runtime não lê as tabelas.
ALTER FUNCTION public.issue_team_invitation(text,text,text,text) OWNER TO neondb_owner;
ALTER FUNCTION public.accept_team_invitation(text,text,text) OWNER TO neondb_owner;
ALTER FUNCTION public.suspend_team_collaborator(text,uuid) OWNER TO neondb_owner;
ALTER FUNCTION public.revoke_team_invitation(text,uuid) OWNER TO neondb_owner;
REVOKE ALL ON FUNCTION public.issue_team_invitation(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_team_invitation(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.suspend_team_collaborator(text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_team_invitation(text,uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO antares_team_runtime;
REVOKE ALL ON public.organizations,public.team_members,public.team_invitations,
 public.team_security_events FROM antares_team_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.issue_team_invitation(text,text,text,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text,text,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.suspend_team_collaborator(text,uuid) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.revoke_team_invitation(text,uuid) TO antares_team_runtime;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_security_events ENABLE ROW LEVEL SECURITY;
COMMIT;
-- Não configurar LOGIN/senha em repositório; criar credencial por canal seguro.
-- Não habilitar escrita sem validar privilégios da role e teste tenant A/B.
SELECT proname,prosecdef,pg_get_userbyid(proowner) AS owner
 FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('issue_team_invitation','accept_team_invitation','suspend_team_collaborator','revoke_team_invitation')
 ORDER BY proname;
