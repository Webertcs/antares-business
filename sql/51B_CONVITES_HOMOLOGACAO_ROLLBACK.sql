-- ANTARES 51B: ciclo completo de convites em transacao reversivel.
-- Executar no SQL Editor da branch production somente com backup confirmado.
-- Nao habilitar ANTARES_TEAM_WRITES_ENABLED para estes testes.
-- Todo dado de teste, inclusive auditoria e membro, sera revertido.
BEGIN;
DO $test$
DECLARE
  v_owner text; v_org uuid; v_email text;
  v_id uuid; v_exp timestamptz; v_hash text;
  v_member uuid; v_revoked boolean;
  v_wrong uuid; v_again uuid;
BEGIN
  SELECT tm.auth_subject, tm.organization_id INTO v_owner,v_org
  FROM public.team_members tm WHERE tm.role='owner' AND tm.active=true
  AND tm.auth_subject IS NOT NULL LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'PENDENTE: proprietario ativo nao encontrado'; END IF;

  -- O dominio .invalid nao e roteavel e impede envio acidental para pessoas reais.
  v_email:='homologacao-51b-'||substr(md5(gen_random_uuid()::text),1,16)||'@example.invalid';
  v_hash:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);

  SELECT invitation_id,valid_until INTO v_id,v_exp
  FROM public.issue_team_invitation(v_owner,v_email,'Homologacao 51B',v_hash);
  IF v_id IS NULL OR v_exp<=now() OR v_exp>now()+interval '49 hours' THEN
    RAISE EXCEPTION 'FALHOU: emissao de convite e validade';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_security_events
     WHERE organization_id=v_org AND action='invitation_issued' AND target_id=v_id)
  THEN RAISE EXCEPTION 'FALHOU: auditoria da emissao'; END IF;
  RAISE NOTICE 'APROVADO: convite e auditoria emitidos com validade de 48h';

  -- Um convite vigente nao pode ser duplicado para o mesmo e-mail.
  BEGIN
   PERFORM * FROM public.issue_team_invitation(
     v_owner,v_email,'Homologacao 51B',md5('outro')||md5('convite'));
   RAISE EXCEPTION 'FALHOU: convite duplicado aceito';
  EXCEPTION WHEN unique_violation THEN
   RAISE NOTICE 'APROVADO: convite duplicado bloqueado pela unicidade';
  WHEN raise_exception THEN
   IF SQLERRM='FALHOU: convite duplicado aceito' THEN RAISE; END IF;
   RAISE NOTICE 'APROVADO: convite duplicado recusado';
  END;

  -- E-mail diferente nao aceita token nem cria membro.
  v_wrong:=public.accept_team_invitation(v_hash,'subject-falso-51b', 'outra-pessoa@example.invalid');
  IF v_wrong IS NOT NULL THEN RAISE EXCEPTION 'FALHOU: aceite com e-mail diferente'; END IF;
  RAISE NOTICE 'APROVADO: aceite com e-mail incorreto bloqueado';

  -- Aceite correto e suspensao para verificar ciclo de vida.
  v_member:=public.accept_team_invitation(v_hash,'subject-homologacao-'||v_id::text,v_email);
  IF v_member IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id=v_member AND organization_id=v_org AND role='collaborator' AND active=true
  ) THEN RAISE EXCEPTION 'FALHOU: aceite legitimo'; END IF;
  RAISE NOTICE 'APROVADO: aceite com e-mail correspondente cria colaborador';

  v_again:=public.accept_team_invitation(v_hash,'subject-reuso-51b',v_email);
  IF v_again IS NOT NULL THEN RAISE EXCEPTION 'FALHOU: convite reutilizado'; END IF;
  RAISE NOTICE 'APROVADO: reuso do convite bloqueado';

  IF NOT public.suspend_team_collaborator(v_owner,v_member) THEN
    RAISE EXCEPTION 'FALHOU: suspensao';
  END IF;
  IF EXISTS(SELECT 1 FROM public.team_members WHERE id=v_member AND active) THEN
    RAISE EXCEPTION 'FALHOU: colaborador ainda ativo';
  END IF;
  RAISE NOTICE 'APROVADO: suspensao preservando vinculo';

  -- Novo convite: revogar impede aceitacao.
  v_hash:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  SELECT invitation_id INTO v_id FROM public.issue_team_invitation(
    v_owner,'revogacao-'||substr(md5(gen_random_uuid()::text),1,12)||'@example.invalid',
    'Homologacao Revogacao',v_hash);
  v_revoked:=public.revoke_team_invitation(v_owner,v_id);
  IF v_revoked IS DISTINCT FROM true THEN RAISE EXCEPTION 'FALHOU: revogacao'; END IF;
  v_again:=public.accept_team_invitation(v_hash,'subject-revogado-51b',
    (SELECT invited_email FROM public.team_invitations WHERE id=v_id));
  IF v_again IS NOT NULL THEN RAISE EXCEPTION 'FALHOU: convite revogado aceito'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.team_security_events
   WHERE organization_id=v_org AND action='invitation_revoked' AND target_id=v_id)
  THEN RAISE EXCEPTION 'FALHOU: auditoria da revogacao'; END IF;
  RAISE NOTICE 'APROVADO: revogacao e auditoria; aceite posterior bloqueado';
  RAISE NOTICE 'APROVADO 51B: ciclo completo testado; transacao sera revertida';
END $test$;
ROLLBACK;
