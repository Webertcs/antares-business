-- 65B: transferência de acesso, somente após o proprietário REAL entrar
-- no endereço oficial com sua própria conta, e confirmar o acesso aos módulos.
-- Execute somente em production como neondb_owner, após backup.
-- Substitua os três UUIDs pelos IDs de team_members confirmados por SELECT.
-- Este script NÃO remove usuários do Better Auth, nem apaga históricos.
BEGIN;
DO $$
DECLARE
 owner_id uuid := '00000000-0000-0000-0000-000000000000';
 developer_id uuid := '00000000-0000-0000-0000-000000000000';
 tester_id uuid := '00000000-0000-0000-0000-000000000000';
 org uuid; owner_subject text; retired record; changed integer;
BEGIN
 IF current_user <> 'neondb_owner' THEN RAISE EXCEPTION 'Executor inválido'; END IF;
 IF owner_id=developer_id OR owner_id=tester_id OR developer_id=tester_id THEN RAISE EXCEPTION 'Preencha três IDs distintos'; END IF;
 LOCK TABLE public.team_members IN SHARE ROW EXCLUSIVE MODE;
 SELECT organization_id,auth_subject INTO org,owner_subject FROM public.team_members
 WHERE id=owner_id AND role='owner' AND active AND archived_at IS NULL AND auth_subject IS NOT NULL;
 IF NOT FOUND OR (SELECT count(*) FROM public.team_members WHERE auth_subject=owner_subject AND active)<>1 THEN RAISE EXCEPTION 'Proprietário real não confirmado'; END IF;
 IF (SELECT count(*) FROM public.team_members WHERE organization_id=org AND id IN (developer_id,tester_id) AND role='owner')<>2 THEN RAISE EXCEPTION 'Contas alvo não conferem'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE id=tester_id AND NOT active) THEN RAISE EXCEPTION 'Testador ainda ativo'; END IF;
 IF EXISTS(SELECT 1 FROM public.team_members WHERE organization_id=org AND active AND role='owner' AND id NOT IN(owner_id,developer_id)) THEN RAISE EXCEPTION 'Outro proprietário ativo: revisar'; END IF;
 FOR retired IN SELECT id,auth_subject,email FROM public.team_members WHERE organization_id=org AND id IN(developer_id,tester_id)
 LOOP
  IF retired.auth_subject IS NULL OR retired.auth_subject=owner_subject OR EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=retired.auth_subject AND active AND id<>retired.id) THEN RAISE EXCEPTION 'Identidade divergente'; END IF;
  IF EXISTS(SELECT 1 FROM public.team_invitations WHERE organization_id=org AND (lower(invited_email)=lower(retired.email) OR created_by_member_id=retired.id) AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()) THEN RAISE EXCEPTION 'Revogue convites pendentes antes'; END IF;
 END LOOP;
 UPDATE public.team_members SET active=false,archived_at=COALESCE(archived_at,now()) WHERE organization_id=org AND id IN(developer_id,tester_id);
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>2 THEN RAISE EXCEPTION 'Quantidade inesperada'; END IF;
 INSERT INTO public.team_security_events(organization_id,action,actor_subject,target_id)
 SELECT org,'technical_access_retired','database-maintenance',id FROM public.team_members WHERE organization_id=org AND id IN(developer_id,tester_id);
 IF (SELECT count(*) FROM public.team_members WHERE organization_id=org AND active AND role='owner')<>1 THEN RAISE EXCEPTION 'Proprietário único não preservado'; END IF;
END $$;
-- Ensaio reversível. Somente após conferir o resultado, repetir com COMMIT.
SELECT role,active,(archived_at IS NOT NULL) AS arquivado,count(*) FROM public.team_members GROUP BY role,active,(archived_at IS NOT NULL) ORDER BY role,active;
ROLLBACK;
