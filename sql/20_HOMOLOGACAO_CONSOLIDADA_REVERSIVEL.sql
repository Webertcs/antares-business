-- ANTARES BLOCO 20 | Uma rodada de homologacao SQL reversivel.
-- Requer snapshot recente; executar o ARQUIVO INTEIRO no Neon SQL Editor.
-- NAO ativa flags, NAO substitui testes HTTP autenticados, NAO cria dados permanentes.
-- Tres transacoes independentes ROLLBACK: agenda; contratos/turmas; prestador.
-- Se o editor interromper na primeira falha, nao presumir aprovacao dos demais testes.

-- ANTARES 14G: homologacao completa da Agenda, SEM registros permanentes.
-- Apenas apos aplicar 14E e 14F, com snapshot em production.
BEGIN;
DO $test$
DECLARE v_subject text;v_org uuid;v_proposal uuid;v_dome uuid;v_presentation uuid;v_client uuid;
 v_duplicate boolean:=false;v_collision boolean:=false;
BEGIN
 SELECT tm.auth_subject,tm.organization_id,p.id INTO v_subject,v_org,v_proposal
 FROM public.team_members tm JOIN public.business_proposals p ON p.organization_id=tm.organization_id
 WHERE tm.active AND tm.role='owner' AND p.status='accepted'
 ORDER BY p.created_at DESC LIMIT 1;
 IF v_proposal IS NULL THEN RAISE EXCEPTION 'PENDENTE: proposta aceita e owner ativo obrigatorios';END IF;
 v_client:=public.antares_prepare_proposal_client(v_subject,v_org,v_proposal);
 IF v_client IS NULL THEN RAISE EXCEPTION 'FALHOU: sincronizacao de cliente';END IF;
 RAISE NOTICE 'APROVADO: cliente operacional preparado na transacao';
 v_dome:=public.antares_create_linked_dome(v_subject,v_org,'Cupula homologacao temporaria','TMP-14G',300);
 IF v_dome IS NULL THEN RAISE EXCEPTION 'FALHOU: cadastro de cupula';END IF;
 RAISE NOTICE 'APROVADO: cupula e equipamento vinculados';
 v_presentation:=public.antares_book_proposal(v_subject,v_org,v_proposal,v_dome,
 '2027-03-10 10:00-03'::timestamptz,'2027-03-10 11:00-03'::timestamptz);
 IF NOT EXISTS(SELECT 1 FROM public.antares_proposal_reservations WHERE organization_id=v_org AND proposal_id=v_proposal AND presentation_id=v_presentation)
 THEN RAISE EXCEPTION 'FALHOU: reserva nao vinculada a proposta';END IF;
 RAISE NOTICE 'APROVADO: proposta aceita reservada e vinculada a apresentacao';
 BEGIN
  PERFORM public.antares_book_proposal(v_subject,v_org,v_proposal,v_dome,
   '2027-03-11 10:00-03'::timestamptz,'2027-03-11 11:00-03'::timestamptz);
 EXCEPTION WHEN OTHERS THEN v_duplicate:=true;END;
 IF NOT v_duplicate THEN RAISE EXCEPTION 'FALHOU: duplicidade nao rejeitada';END IF;
 RAISE NOTICE 'APROVADO: proposta duplicada rejeitada';
 BEGIN
 INSERT INTO public.presentations(organization_id,client_id,dome_id,title,starts_at,ends_at,status)
 VALUES(v_org,v_client,(SELECT equipment_id FROM public.antares_dome_links WHERE organization_id=v_org AND antares_dome_id=v_dome),
 'Teste conflito','2027-03-10 10:30-03','2027-03-10 11:30-03','reserved');
 EXCEPTION WHEN exclusion_violation THEN v_collision:=true;END;
 IF NOT v_collision THEN RAISE EXCEPTION 'FALHOU: conflito de cupula permitido';END IF;
 RAISE NOTICE 'APROVADO: sobreposicao de cupula bloqueada';
 RAISE NOTICE 'APROVADO 14G: teste reversivel completo';
END $test$;
ROLLBACK;


-- PROXIMA FRENTE --

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


-- PROXIMA FRENTE --

-- ANTARES 14B — Homologacao do cadastro do prestador, sem persistir.
-- Executar somente DEPOIS da migracao 14 e de snapshot em production.
BEGIN;
DO $body$
DECLARE v_subject text;v_org uuid;v_previous bigint;v_saved boolean;
BEGIN
 SELECT tm.auth_subject,tm.organization_id INTO v_subject,v_org FROM public.team_members tm
 WHERE tm.role='owner' AND tm.active=true ORDER BY tm.organization_id LIMIT 1;
 IF v_org IS NULL THEN RAISE EXCEPTION 'PENDENTE: proprietario ativo ausente';END IF;
 SELECT count(*) INTO v_previous FROM public.antares_provider_profiles WHERE organization_id=v_org;
 SELECT public.antares_save_provider_profile(v_subject,v_org,'Prestador de homologacao 14B','00000000000000','Endereco ficticio para rollback','Representante de teste') INTO v_saved;
 IF NOT v_saved OR NOT EXISTS(SELECT 1 FROM public.antares_provider_profiles WHERE organization_id=v_org AND legal_name='Prestador de homologacao 14B')
 THEN RAISE EXCEPTION 'FALHOU: cadastro autorizado';END IF;
 RAISE NOTICE 'APROVADO: registro de prestador aceito dentro da transacao';
 BEGIN
  PERFORM public.antares_save_provider_profile('identidade-falsa-14b',v_org,'Prestador invalido','00000000000000','Endereco ficticio para rollback','Teste de acesso');
  RAISE EXCEPTION 'FALHOU: usuario ficticio autorizado';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='FALHOU: usuario ficticio autorizado' THEN RAISE;END IF;
  RAISE NOTICE 'APROVADO: identidade ficticia rejeitada';
 END;
 RAISE NOTICE 'APROVADO: contagem anterior preservada apos ROLLBACK (anterior: %)',v_previous;
END $body$;
ROLLBACK;
-- Nao ativa ANTARES_PROVIDER_WRITES_ENABLED e nao testa a API autenticada.

-- FINANCEIRO: verificacao exclusivamente de permissoes, sem lancamentos.
-- Testes financeiros com secret devem permanecer nos roteiros 07B em ambiente ISOLADO.
SELECT
  has_function_privilege('antares_team_runtime','public.antares_create_receivable(text,text,uuid,uuid,uuid,uuid,text,numeric,date)','EXECUTE') AS runtime_pode_criar_titulo,
  has_table_privilege('antares_team_runtime','public.antares_receivables','INSERT') AS runtime_insere_titulo_diretamente,
  has_table_privilege('antares_team_runtime','public.ledger_entries','INSERT') AS runtime_insere_livro_diretamente;
-- Resultado esperado: true, false, false.
