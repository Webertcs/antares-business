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
COMMIT;
-- Baixas devem vincular exclusivamente lançamentos income já registrados, com validação de saldo
-- em função transacional própria. NÃO efetuar atualização direta por API.
