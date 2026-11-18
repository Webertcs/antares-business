-- ANTARES 58B | Reserva única, sem limitar público total à capacidade da cúpula
-- Substitui o plano 58A isolado: NÃO executar 58A e 58B em sequência.
-- Instala a função de reserva ausente e remove SOMENTE o bloqueio legado
-- de capacidade total da reserva e, se presente, do reagendamento.
-- Preserva a versão instalada de todas as outras regras de ambas funções.
-- NAO cria reservas, altera apresentações existentes ou mexe em pagamentos.
-- Somente para aplicação revisada, com snapshot, na branch correta do Neon.
BEGIN;

DO $migrate$
DECLARE
 v_book oid := to_regprocedure('public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)');
 v_manage oid := to_regprocedure('public.antares_manage_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz,text)');
 v_prepare oid := to_regprocedure('public.antares_prepare_proposal_client(text,uuid,uuid)');
 v_link oid := to_regprocedure('public.antares_book_and_link_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)');
 v_book_def text;
 v_manage_def text;
 v_book_pattern text := $pattern$
   IF[[:space:]]+v_students[[:space:]]+IS[[:space:]]+NOT[[:space:]]+NULL[[:space:]]+AND[[:space:]]+v_students[[:space:]]*>[[:space:]]*0[[:space:]]+AND[[:space:]]+v_capacity[[:space:]]+IS[[:space:]]+NOT[[:space:]]+NULL[[:space:]]+AND[[:space:]]+v_students[[:space:]]*>[[:space:]]*v_capacity[[:space:]]+THEN[[:space:]]+RAISE[[:space:]]+EXCEPTION[[:space:]]+'Capacidade insuficiente';[[:space:]]*END[[:space:]]+IF;
 $pattern$;
 v_manage_pattern text := $pattern$
   IF[[:space:]]+v_expected[[:space:]]*>[[:space:]]*0[[:space:]]+AND[[:space:]]+v_capacity[[:space:]]+IS[[:space:]]+NOT[[:space:]]+NULL[[:space:]]+AND[[:space:]]+v_expected[[:space:]]*>[[:space:]]*v_capacity[[:space:]]+THEN[[:space:]]+RAISE[[:space:]]+EXCEPTION[[:space:]]+'Capacidade insuficiente';[[:space:]]*END[[:space:]]+IF;
 $pattern$;
 v_count int;
BEGIN
 IF current_user <> 'neondb_owner' THEN
   RAISE EXCEPTION 'Execute somente como neondb_owner.';
 END IF;
 IF v_book IS NULL OR v_manage IS NULL OR v_prepare IS NULL OR v_link IS NULL THEN
   RAISE EXCEPTION 'Funcoes 14F/15A/14E incompletas. Nenhuma alteracao.';
 END IF;
 IF to_regprocedure('public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)') IS NOT NULL THEN
   RAISE EXCEPTION 'Funcao de integracao ja existe. Reavaliar antes de alterar.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_roles
   WHERE rolname='antares_team_runtime'
     AND NOT rolsuper AND NOT rolbypassrls
 ) THEN
   RAISE EXCEPTION 'Papel operacional ausente ou excessivamente privilegiado.';
 END IF;
 IF EXISTS (
   SELECT 1 FROM pg_proc p
   WHERE p.oid IN (v_book,v_manage,v_prepare,v_link)
   AND (NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'neondb_owner')
 ) THEN
   RAISE EXCEPTION 'Proprietario ou SECURITY DEFINER das dependencias divergente.';
 END IF;

 -- Usa as definicoes REAIS instaladas, sem substituir as demais regras por
 -- uma versao presumida do repositório. Interrompe se a regra for diferente.
 v_book_def := pg_get_functiondef(v_book);
 v_manage_def := pg_get_functiondef(v_manage);
 v_count := regexp_count(v_book_def,v_book_pattern,1,'i');
 IF v_count <> 1 THEN
   RAISE EXCEPTION 'Regra antiga da reserva divergente: % ocorrencias; nenhuma alteracao.',v_count;
 END IF;
 v_book_def := regexp_replace(v_book_def,v_book_pattern,
   E'\n -- Publico contratado total nao representa ocupacao simultanea da cupula.\n', 'i');

 v_count := regexp_count(v_manage_def,v_manage_pattern,1,'i');
 IF v_count=1 THEN
   v_manage_def := regexp_replace(v_manage_def,v_manage_pattern,
     E'\n -- Reagendamento nao compara publico total com capacidade simultanea.\n', 'i');
 ELSIF v_count<>0 OR position('Capacidade insuficiente' in v_manage_def)>0 THEN
   RAISE EXCEPTION 'Regra de reagendamento divergente; nenhuma alteracao.';
 END IF;

 EXECUTE v_book_def;
 IF v_count=1 THEN
   EXECUTE v_manage_def;
 END IF;
END
$migrate$;

CREATE FUNCTION public.antares_book_ready_proposal(
 p_subject text,p_org uuid,p_proposal uuid,p_dome uuid,
 p_start timestamptz,p_end timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $fn$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.team_members m
  WHERE m.organization_id=p_org
    AND m.auth_subject=p_subject
    AND m.active AND m.role='owner'
 ) THEN
  RAISE EXCEPTION 'Nao autorizado';
 END IF;
 PERFORM public.antares_prepare_proposal_client(p_subject,p_org,p_proposal);
 RETURN public.antares_book_and_link_proposal(
  p_subject,p_org,p_proposal,p_dome,p_start,p_end);
END $fn$;

REVOKE ALL ON FUNCTION
 public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)
 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
 public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)
 TO antares_team_runtime;
COMMENT ON FUNCTION
 public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)
 IS 'ANTARES_READY_BOOK_V2_TOTAL_EVENT';

COMMIT;

-- POS-INSTALACAO: somente leitura, sem efetuar reservas:
-- SELECT obj_description(to_regprocedure(
--   'public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)'
-- )::oid) AS versao;
-- Esperado: ANTARES_READY_BOOK_V2_TOTAL_EVENT
