-- ANTARES CRM | Auditoria financeira | 2026-11-04
-- Aplicar no Neon apenas após exportar as definições originais.
-- Preserva assinaturas, validações e SECURITY DEFINER.
-- A transação inteira será revertida em caso de erro.
BEGIN;

CREATE OR REPLACE FUNCTION public.antares_create_receivable(p_secret text, p_subject text, p_org uuid, p_id uuid, p_client uuid, p_proposal uuid, p_description text, p_total numeric, p_due date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_token text; v_record public.antares_receivables%ROWTYPE; v_inserted boolean := false;
BEGIN
 SELECT secret INTO v_token FROM public.antares_finance_capability WHERE singleton;
 IF v_token IS NULL OR p_secret IS NULL OR length(p_secret)<>64 OR md5(v_token)<>md5(p_secret)
 THEN RAISE EXCEPTION 'Capacidade financeira inválida'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject AND organization_id=p_org AND role='owner' AND active)
 THEN RAISE EXCEPTION 'Proprietário não autorizado'; END IF;
 IF p_id IS NULL OR p_client IS NULL OR p_org IS NULL OR p_total IS NULL OR p_total<=0
 OR p_total<>round(p_total,2) OR p_total>100000000 OR p_due IS NULL OR p_description IS NULL
 OR length(trim(p_description)) NOT BETWEEN 1 AND 300
 THEN RAISE EXCEPTION 'Título inválido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=p_org)
 THEN RAISE EXCEPTION 'Cliente inválido'; END IF;
 IF p_proposal IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.business_proposals WHERE id=p_proposal AND organization_id=p_org AND client_id=p_client)
 THEN RAISE EXCEPTION 'Proposta inválida'; END IF;
 INSERT INTO public.antares_receivables(id,organization_id,client_id,proposal_id,description,total,due_on)
 VALUES(p_id,p_org,p_client,p_proposal,trim(p_description),p_total,p_due)
 ON CONFLICT(id) DO NOTHING;
 v_inserted := FOUND;
 SELECT * INTO v_record FROM public.antares_receivables WHERE id=p_id;
 IF v_record.organization_id<>p_org OR v_record.client_id<>p_client
 OR v_record.proposal_id IS DISTINCT FROM p_proposal OR v_record.total<>p_total
 OR v_record.due_on<>p_due OR v_record.description<>trim(p_description)
 THEN RAISE EXCEPTION 'Identificador já usado para outro título'; END IF;
 IF v_inserted THEN
   INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
   VALUES(p_org,p_subject,'finance_receivable_created','receivable',p_id);
 END IF;
 RETURN p_id;
END $function$;

CREATE OR REPLACE FUNCTION public.antares_post_ledger_entry(p_capability text, p_subject text, p_org uuid, p_id uuid, p_type text, p_amount numeric, p_description text, p_day date, p_presentation uuid DEFAULT NULL::uuid)
RETURNS TABLE(entry_id uuid, already_exists boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_member uuid; v_old public.ledger_entries%ROWTYPE; v_token text;
BEGIN
 SELECT secret INTO v_token FROM public.antares_finance_capability WHERE singleton=true;
 IF v_token IS NULL OR p_capability IS NULL OR length(p_capability)<>64 OR
    md5(p_capability)<>md5(v_token) THEN
   RAISE EXCEPTION 'Capacidade financeira inválida';
 END IF;
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
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'finance_entry_created','ledger_entry',p_id);
 RETURN QUERY SELECT p_id,false;
END $function$;

CREATE OR REPLACE FUNCTION public.antares_pay_receivable(p_secret text, p_subject text, p_org uuid, p_receivable uuid, p_ledger_id uuid, p_amount numeric, p_paid_on date)
RETURNS TABLE(ledger_id uuid, already_exists boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_token text;v_title public.antares_receivables%ROWTYPE;
        v_existing public.ledger_entries%ROWTYPE;v_link uuid;
        v_paid numeric;v_prior boolean;
BEGIN
 SELECT secret INTO v_token FROM public.antares_finance_capability WHERE singleton=true;
 IF v_token IS NULL OR p_secret IS NULL OR length(p_secret)<>64
 OR md5(p_secret)<>md5(v_token) THEN RAISE EXCEPTION 'Capacidade financeira inválida'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.team_members
   WHERE organization_id=p_org AND auth_subject=p_subject AND role='owner' AND active)
 THEN RAISE EXCEPTION 'Proprietário não autorizado'; END IF;
 IF p_org IS NULL OR p_receivable IS NULL OR p_ledger_id IS NULL OR p_amount IS NULL
 OR p_amount<=0 OR p_amount>100000000 OR p_amount<>round(p_amount,2) OR p_paid_on IS NULL
 THEN RAISE EXCEPTION 'Baixa financeira inválida'; END IF;
 SELECT * INTO v_title FROM public.antares_receivables
 WHERE id=p_receivable AND organization_id=p_org AND cancelled_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Título inexistente ou cancelado'; END IF;
 SELECT p.receivable_id INTO v_link FROM public.antares_receivable_payments p
 WHERE p.ledger_id=p_ledger_id AND p.organization_id=p_org;
 IF FOUND AND v_link<>p_receivable THEN RAISE EXCEPTION 'Identificador vinculado a outro título'; END IF;
 SELECT * INTO v_existing FROM public.ledger_entries WHERE id=p_ledger_id;
 IF FOUND THEN
   IF v_link IS DISTINCT FROM p_receivable OR v_existing.organization_id<>p_org
   OR v_existing.entry_type<>'income' OR v_existing.amount<>p_amount
   OR v_existing.occurred_on<>p_paid_on
   OR v_existing.description<>('Recebimento: '||v_title.description)
   THEN RAISE EXCEPTION 'Identificador de baixa já utilizado'; END IF;
   RETURN QUERY SELECT p_ledger_id,true;RETURN;
 END IF;
 SELECT COALESCE(SUM(l.amount),0) INTO v_paid
 FROM public.antares_receivable_payments p
 JOIN public.ledger_entries l ON l.id=p.ledger_id AND l.organization_id=p.organization_id
 WHERE p.organization_id=p_org AND p.receivable_id=p_receivable
 AND l.entry_type='income' AND NOT EXISTS (
  SELECT 1 FROM public.ledger_entries rv WHERE rv.organization_id=p_org AND rv.reversal_of=l.id
 );
 IF v_paid+p_amount>v_title.total THEN RAISE EXCEPTION 'Pagamento excede saldo pendente'; END IF;
 PERFORM public.antares_post_ledger_entry(p_secret,p_subject,p_org,p_ledger_id,
  'income',p_amount,'Recebimento: '||v_title.description,p_paid_on,NULL);
 INSERT INTO public.antares_receivable_payments(organization_id,receivable_id,ledger_id)
 VALUES(p_org,p_receivable,p_ledger_id);
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'finance_receivable_paid','receivable',p_receivable);
 RETURN QUERY SELECT p_ledger_id,false;
END $function$;

CREATE OR REPLACE FUNCTION public.antares_reverse_ledger_entry(p_capability text, p_subject text, p_org uuid, p_original uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'finance_entry_reversed','ledger_entry',v_new);
 RETURN v_new;
END $function$;

COMMIT;
