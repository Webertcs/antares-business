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
COMMIT;
-- O registro da emissão será feito na função issue_team_invitation;
-- a função acima mantém alteração e auditoria na mesma transação.
