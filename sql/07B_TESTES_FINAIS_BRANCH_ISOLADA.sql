-- ANTARES 07B: TESTES FINAIS EM BRANCH ISOLADA DO NEON.
-- Requer cópia isolada do banco, migração 07B aplicada, e proprietário ativo de teste.
-- NÃO execute na branch production. Não retorna nem imprime a credencial.
-- ROLLBACK ao final, mesmo que o teste passe.
BEGIN;
DO $$
DECLARE
 v_org uuid; v_subject text; v_id uuid:=gen_random_uuid(); v_secret text;
 v_first record; v_second record; v_count bigint; v_denied boolean:=false;
BEGIN
 SELECT organization_id,auth_subject INTO v_org,v_subject
 FROM public.team_members
 WHERE role='owner' AND active=true AND auth_subject IS NOT NULL
 ORDER BY id LIMIT 1;
 IF v_org IS NULL THEN
  RAISE EXCEPTION 'Nenhum proprietário ativo de teste encontrado; interrompido';
 END IF;
 SELECT secret INTO v_secret
 FROM public.antares_finance_capability WHERE singleton=true;
 IF v_secret IS NULL THEN
  RAISE EXCEPTION 'Capacidade não instalada; interrompido';
 END IF;
 -- Teste 1: um sujeito inexistente NÃO pode registrar, mesmo com segredo válido.
 BEGIN
  PERFORM public.antares_post_ledger_entry(
   v_secret,'TESTE_USUARIO_SEM_ACESSO_07B',v_org,gen_random_uuid(),
   'income',1.00,'TESTE_NEGATIVO',CURRENT_DATE,NULL);
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Proprietário não autorizado' THEN v_denied:=true; ELSE RAISE; END IF;
 END;
 IF NOT v_denied THEN RAISE EXCEPTION 'FALHA: usuário não autorizado aceito'; END IF;
 -- Teste 2: proprietário cria lançamento e chamada idêntica é idempotente.
 SELECT * INTO v_first FROM public.antares_post_ledger_entry(
  v_secret,v_subject,v_org,v_id,'income',1.00,'TESTE_IDEMPOTENCIA_07B',CURRENT_DATE,NULL);
 SELECT * INTO v_second FROM public.antares_post_ledger_entry(
  v_secret,v_subject,v_org,v_id,'income',1.00,'TESTE_IDEMPOTENCIA_07B',CURRENT_DATE,NULL);
 SELECT count(*) INTO v_count FROM public.ledger_entries
 WHERE id=v_id AND organization_id=v_org;
 IF v_first.already_exists IS DISTINCT FROM false OR
    v_second.already_exists IS DISTINCT FROM true OR v_count<>1 THEN
  RAISE EXCEPTION 'FALHA: duplicidade ou retorno inesperado';
 END IF;
 RAISE NOTICE 'APROVADO: não autorizado bloqueado; proprietário autorizado; repetição idempotente (1 registro temporário)';
END $$;
ROLLBACK;
-- Esta transação NÃO prova proteção contra uso indevido do segredo fora do servidor.
-- Após execução, conferir logs e manter flag de gravação desabilitada.
