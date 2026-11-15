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
