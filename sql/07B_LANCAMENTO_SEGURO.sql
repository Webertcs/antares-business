-- ANTARES 07B: livro-caixa, escrita controlada e idempotente.
-- Execute somente após revisão e backup. Não ativa o feature flag.
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_post_ledger_entry(
 p_subject text,p_org uuid,p_id uuid,p_type text,p_amount numeric,
 p_description text,p_day date,p_presentation uuid DEFAULT NULL
) RETURNS TABLE(entry_id uuid,already_exists boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_member uuid; v_old public.ledger_entries%ROWTYPE;
BEGIN
 IF p_subject IS NULL OR length(trim(p_subject))=0 OR
    p_id IS NULL OR p_org IS NULL OR
    p_type NOT IN ('income','expense') OR p_type IS NULL OR
    p_amount IS NULL OR p_amount<=0 OR p_amount>100000000 OR
    p_amount<>round(p_amount,2) OR
    p_description IS NULL OR length(trim(p_description)) NOT BETWEEN 1 AND 500 OR
    p_day IS NULL THEN RAISE EXCEPTION 'Dados financeiros inválidos'; END IF;
 SELECT id INTO v_member FROM public.team_members
 WHERE auth_subject=p_subject AND organization_id=p_org AND role='owner' AND active
 LIMIT 1;
 IF v_member IS NULL THEN RAISE EXCEPTION 'Proprietário não autorizado'; END IF;
 IF p_presentation IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM public.presentations WHERE id=p_presentation AND organization_id=p_org
 ) THEN RAISE EXCEPTION 'Apresentação inválida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT * INTO v_old FROM public.ledger_entries WHERE id=p_id;
 IF FOUND THEN
  IF v_old.organization_id<>p_org OR v_old.entered_by IS DISTINCT FROM v_member OR
   v_old.entry_type<>p_type OR v_old.amount<>p_amount OR
   v_old.description<>trim(p_description) OR v_old.occurred_on<>p_day OR
   v_old.presentation_id IS DISTINCT FROM p_presentation
  THEN RAISE EXCEPTION 'Identificador de lançamento já utilizado'; END IF;
  RETURN QUERY SELECT p_id,true; RETURN;
 END IF;
 INSERT INTO public.ledger_entries(
  id,organization_id,entered_by,entry_type,amount,description,occurred_on,presentation_id
 ) VALUES(p_id,p_org,v_member,p_type,p_amount,trim(p_description),p_day,p_presentation);
 RETURN QUERY SELECT p_id,false;
END $$;
REVOKE ALL ON FUNCTION public.antares_post_ledger_entry(text,uuid,uuid,text,numeric,text,date,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_post_ledger_entry(text,uuid,uuid,text,numeric,text,date,uuid) FROM antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_post_ledger_entry(text,uuid,uuid,text,numeric,text,date,uuid) TO antares_team_runtime;
COMMIT;
-- Exige revisão adicional: função SECURITY DEFINER depende da integridade
-- do sujeito autenticado enviado pelo servidor. Nunca chamar pelo cliente.
-- A função não concede SELECT/INSERT/UPDATE/DELETE diretamente ao runtime.
