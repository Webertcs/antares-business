-- ANTARES 13C - homologacao funcional sem persistencia
-- PRODUCTION: executar o arquivo inteiro, incluindo BEGIN e ROLLBACK.
-- Nao ativa flags HTTP. Nao revela dados pessoais nem credenciais.
BEGIN;
DO $test$
DECLARE
 v_org uuid; v_subject text; v_proposal uuid; v_school uuid;
 v_contract uuid; v_group uuid; v_count integer;
 v_duplicate_blocked boolean:=false;
 v_overflow_blocked boolean:=false;
BEGIN
 SELECT tm.organization_id,tm.auth_subject,p.id
 INTO v_org,v_subject,v_proposal
 FROM public.team_members tm
 JOIN public.business_proposals p ON p.organization_id=tm.organization_id AND p.status='accepted'
 WHERE tm.active=true AND tm.role='owner' AND tm.auth_subject IS NOT NULL
 ORDER BY p.created_at DESC LIMIT 1;
 IF v_org IS NULL THEN
  RAISE NOTICE 'PENDENTE: nenhuma proposta aceita com proprietario ativo. Teste funcional nao executado.';
  RETURN;
 END IF;
 -- Uma chamada efetiva atraves da funcao autorizada
 v_contract:=public.antares_register_contract(v_subject,v_org,v_proposal,
 'written','HOMOLOGACAO TRANSITORIA - sem acordo real e sem assinatura',false);
 IF v_contract IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.business_contracts WHERE id=v_contract
   AND organization_id=v_org AND proposal_id=v_proposal AND status='pending'
   AND confirmed_at IS NULL
 ) THEN RAISE EXCEPTION 'FALHOU: contrato pendente nao persistiu na transacao';END IF;
 RAISE NOTICE 'APROVADO: contrato pendente vinculado a proposta aceita';
 BEGIN
  PERFORM public.antares_register_contract(v_subject,v_org,v_proposal,
  'verbal','HOMOLOGACAO TRANSITORIA - tentativa duplicada',false);
 EXCEPTION WHEN unique_violation THEN v_duplicate_blocked:=true;
 END;
 IF NOT v_duplicate_blocked THEN RAISE EXCEPTION 'FALHOU: duplicidade de contrato permitida';END IF;
 RAISE NOTICE 'APROVADO: segundo contrato ativo da mesma proposta bloqueado';
 SELECT id INTO v_school FROM public.crm_clients
 WHERE organization_id=v_org AND kind='school' LIMIT 1;
 IF v_school IS NULL THEN
  RAISE NOTICE 'PENDENTE: nenhuma escola na organizacao; teste da turma nao executado';
 ELSE
  v_group:=public.antares_education_create_group(v_subject,v_org,v_school,
  'TURMA 13C TEMPORARIA','6 ano',24,'Professor de homologacao','','Sem dados de criancas');
  IF v_group IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.antares_education_groups
   WHERE id=v_group AND organization_id=v_org AND student_count=24
  ) THEN RAISE EXCEPTION 'FALHOU: turma nao registrada na transacao';END IF;
  RAISE NOTICE 'APROVADO: turma, 24 participantes e professor institucional';
  BEGIN
   PERFORM public.antares_education_create_group(v_subject,v_org,v_school,
   'TURMA INVALIDA','6 ano',1001,'','','');
  EXCEPTION WHEN check_violation THEN v_overflow_blocked:=true;
  END;
  IF NOT v_overflow_blocked THEN RAISE EXCEPTION 'FALHOU: 1001 participantes aceitos';END IF;
  RAISE NOTICE 'APROVADO: limite de alunos protegido no banco';
 END IF;
 SELECT count(*) INTO v_count FROM pg_constraint
 WHERE conrelid='public.presentations'::regclass
 AND conname='antares_presentations_no_overlap' AND contype='x';
 IF v_count<>1 THEN RAISE EXCEPTION 'FALHOU: restricao anti-conflito nao instalada';END IF;
 RAISE NOTICE 'APROVADO: restricao estrutural anti-conflito presente';
 RAISE NOTICE 'APROVADO 13C: verificacoes executadas dentro de transacao reversivel';
END $test$;
ROLLBACK;
-- Verificar no historico que o editor executou ROLLBACK.
-- O teste NAO comprova a operacao via navegador/HTTP.
