-- ANTARES 07E — contas a receber: títulos e baixas parciais auditáveis.
-- Aplicar primeiro na branch de testes; preservar estrutura existente.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_receivables(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 client_id uuid NOT NULL,
 proposal_id uuid,
 description text NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 300),
 total numeric(14,2) NOT NULL CHECK(total>0),
 due_on date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 CONSTRAINT antares_receivables_org_id_unique UNIQUE(organization_id,id)
);
CREATE TABLE IF NOT EXISTS public.antares_receivable_payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 receivable_id uuid NOT NULL,
 ledger_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT antares_receivable_payments_ledger_unique UNIQUE(organization_id,ledger_id),
 CONSTRAINT antares_receivable_payments_receivable_fk FOREIGN KEY(organization_id,receivable_id)
 REFERENCES public.antares_receivables(organization_id,id)
);
CREATE INDEX IF NOT EXISTS antares_receivables_org_due_idx ON public.antares_receivables(organization_id,due_on);
CREATE INDEX IF NOT EXISTS antares_receivable_payments_due_idx ON public.antares_receivable_payments(organization_id,receivable_id);
ALTER TABLE public.antares_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_receivable_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_receivables,public.antares_receivable_payments FROM PUBLIC,antares_team_runtime;
-- Gestão por função protegida; nenhum INSERT direto pelo runtime.
CREATE OR REPLACE FUNCTION public.antares_create_receivable(
 p_secret text,p_subject text,p_org uuid,p_id uuid,p_client uuid,p_proposal uuid,
 p_description text,p_total numeric,p_due date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_token text; v_record public.antares_receivables%ROWTYPE;
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
 SELECT * INTO v_record FROM public.antares_receivables WHERE id=p_id;
 IF v_record.organization_id<>p_org OR v_record.client_id<>p_client
 OR v_record.proposal_id IS DISTINCT FROM p_proposal OR v_record.total<>p_total
 OR v_record.due_on<>p_due OR v_record.description<>trim(p_description)
 THEN RAISE EXCEPTION 'Identificador já usado para outro título'; END IF;
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.antares_create_receivable(text,text,uuid,uuid,uuid,uuid,text,numeric,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_create_receivable(text,text,uuid,uuid,uuid,uuid,text,numeric,date) TO antares_team_runtime;
-- Integridade referencial: nunca relacionar entidades de organizações diferentes.
ALTER TABLE public.antares_receivables
 ADD CONSTRAINT antares_receivables_client_fk FOREIGN KEY(client_id,organization_id)
 REFERENCES public.crm_clients(id,organization_id);
ALTER TABLE public.antares_receivables
 ADD CONSTRAINT antares_receivables_proposal_fk FOREIGN KEY(proposal_id)
 REFERENCES public.business_proposals(id);
ALTER TABLE public.antares_receivable_payments
 ADD CONSTRAINT antares_receivable_payments_ledger_fk FOREIGN KEY(ledger_id,organization_id)
 REFERENCES public.ledger_entries(id,organization_id);

-- Baixa parcial: registra receita no livro-caixa na mesma transação do vínculo ao título.
-- Um lançamento nunca pode pagar mais que o saldo do título.
CREATE OR REPLACE FUNCTION public.antares_pay_receivable(
 p_secret text,p_subject text,p_org uuid,p_receivable uuid,p_ledger_id uuid,
 p_amount numeric,p_paid_on date
) RETURNS TABLE(ledger_id uuid,already_exists boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
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
 RETURN QUERY SELECT p_ledger_id,false;
END $$;
REVOKE ALL ON FUNCTION public.antares_pay_receivable(text,text,uuid,uuid,uuid,numeric,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_pay_receivable(text,text,uuid,uuid,uuid,numeric,date) TO antares_team_runtime;
COMMIT;
-- O saldo é apurado por receitas vinculadas, excluindo lançamentos já estornados.
-- Aplicar somente na branch de teste antes de homologar produção.
