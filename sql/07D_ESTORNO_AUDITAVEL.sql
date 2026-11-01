-- ANTARES 07D: estorno auditável, somente uma reversão por lançamento.
-- Aplicar primeiro em branch de testes Neon; produção somente após homologação.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS ledger_entries_single_reversal_idx
 ON public.ledger_entries(organization_id,reversal_of) WHERE reversal_of IS NOT NULL;
CREATE OR REPLACE FUNCTION public.antares_reverse_ledger_entry(
 p_capability text,p_subject text,p_org uuid,p_original uuid,p_reason text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_token text; v_member uuid; v_original public.ledger_entries%ROWTYPE;
        v_previous uuid; v_new uuid;
BEGIN
 SELECT secret INTO v_token FROM public.antares_finance_capability WHERE singleton;
 IF v_token IS NULL OR p_capability IS NULL OR length(p_capability)<>64
    OR md5(p_capability)<>md5(v_token) THEN
   RAISE EXCEPTION 'Capacidade financeira inválida';
 END IF;
 IF p_org IS NULL OR p_original IS NULL OR p_reason IS NULL
    OR length(trim(p_reason)) NOT BETWEEN 8 AND 400 THEN
   RAISE EXCEPTION 'Justificativa inválida';
 END IF;
 SELECT id INTO v_member FROM public.team_members
 WHERE auth_subject=p_subject AND organization_id=p_org
   AND active AND role='owner' LIMIT 1;
 IF v_member IS NULL THEN RAISE EXCEPTION 'Proprietário não autorizado'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_original::text,0));
 SELECT * INTO v_original FROM public.ledger_entries
 WHERE id=p_original AND organization_id=p_org FOR UPDATE;
 IF NOT FOUND OR v_original.reversal_of IS NOT NULL THEN
   RAISE EXCEPTION 'Lançamento original inválido';
 END IF;
 SELECT id INTO v_previous FROM public.ledger_entries
 WHERE organization_id=p_org AND reversal_of=p_original;
 IF v_previous IS NOT NULL THEN RETURN v_previous; END IF;
 v_new:=gen_random_uuid();
 INSERT INTO public.ledger_entries(
  id,organization_id,entered_by,entry_type,amount,description,occurred_on,presentation_id,reversal_of
 ) VALUES(v_new,p_org,v_member,
   CASE WHEN v_original.entry_type='income' THEN 'expense' ELSE 'income' END,
   v_original.amount,
   'ESTORNO: '||left(trim(p_reason),400),
   CURRENT_DATE,v_original.presentation_id,p_original);
 RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.antares_reverse_ledger_entry(text,text,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_reverse_ledger_entry(text,text,uuid,uuid,text) TO antares_team_runtime;
COMMIT;
