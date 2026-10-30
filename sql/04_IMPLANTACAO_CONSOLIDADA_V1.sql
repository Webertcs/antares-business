-- ANTARES BUSINESS V1 — MIGRACAO COMERCIAL UNICA
-- Preparada para implantacao futura apos backup e revisao.
-- Nao executar arquivos 04/04A/04B/04C separadamente.
-- Transacao atomica; nenhuma flag HTTP sera ativada.
BEGIN;
-- PARTE 1: sql/04_V1_NUCLEO_COMERCIAL.sql
CREATE TABLE IF NOT EXISTS public.business_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 client_id uuid NOT NULL,
 event_id uuid,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 180),
 pricing_model text NOT NULL CHECK(pricing_model IN ('per_student','fixed','complimentary')),
 expected_attendees integer CHECK(expected_attendees>=0),
 unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(unit_price>=0),
 fixed_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(fixed_price>=0),
 discount numeric(12,2) NOT NULL DEFAULT 0 CHECK(discount>=0),
 deposit numeric(12,2) NOT NULL DEFAULT 0 CHECK(deposit>=0),
 total numeric(12,2) GENERATED ALWAYS AS (GREATEST(0,
   CASE WHEN pricing_model='per_student' THEN coalesce(expected_attendees,0)*unit_price
        WHEN pricing_model='fixed' THEN fixed_price ELSE 0 END - discount)) STORED,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','negotiating','accepted','rejected','expired','cancelled')),
 valid_until date, notes text,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(client_id,organization_id) REFERENCES public.crm_clients(id,organization_id),
 FOREIGN KEY(event_id,organization_id) REFERENCES public.crm_events(id,organization_id),
 UNIQUE(id,organization_id)
);
CREATE TABLE IF NOT EXISTS public.business_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 proposal_id uuid NOT NULL,
 confirmation_mode text NOT NULL CHECK(confirmation_mode IN ('written','verbal','whatsapp')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','fulfilled')),
 confirmed_at timestamptz, terms text, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(proposal_id,organization_id) REFERENCES public.business_proposals(id,organization_id),
 UNIQUE(id,organization_id)
);
CREATE TABLE IF NOT EXISTS public.business_domes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 100),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id),
 UNIQUE(organization_id,name)
);
CREATE TABLE IF NOT EXISTS public.business_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 event_id uuid NOT NULL,
 dome_id uuid NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','confirmed','completed','cancelled')),
 CHECK(ends_at>starts_at),
 FOREIGN KEY(event_id,organization_id) REFERENCES public.crm_events(id,organization_id),
 FOREIGN KEY(dome_id,organization_id) REFERENCES public.business_domes(id,organization_id),
 UNIQUE(id,organization_id)
);
CREATE INDEX IF NOT EXISTS business_bookings_dome_times_idx ON public.business_bookings(organization_id,dome_id,starts_at,ends_at);
CREATE TABLE IF NOT EXISTS public.business_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 proposal_id uuid,
 category text NOT NULL CHECK(category IN ('income','expense')),
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','settled','cancelled')),
 description text NOT NULL CHECK(length(trim(description)) BETWEEN 2 AND 250),
 amount numeric(12,2) NOT NULL CHECK(amount>0),
 occurred_on date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(proposal_id,organization_id) REFERENCES public.business_proposals(id,organization_id),
 UNIQUE(id,organization_id)
);
CREATE INDEX IF NOT EXISTS business_ledger_org_date_idx ON public.business_ledger(organization_id,occurred_on);
CREATE TABLE IF NOT EXISTS public.business_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 actor_subject text NOT NULL, action text NOT NULL, entity_type text NOT NULL,
 entity_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_domes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_proposals,public.business_contracts,public.business_domes,
 public.business_bookings,public.business_ledger,public.business_audit FROM PUBLIC;
REVOKE ALL ON public.business_proposals,public.business_contracts,public.business_domes,
 public.business_bookings,public.business_ledger,public.business_audit FROM antares_team_runtime;

-- PARTE 2: sql/04A_AGENDA_SEM_CONFLITOS.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.business_bookings
 ADD CONSTRAINT business_booking_no_overlap
 EXCLUDE USING gist (
  organization_id WITH =,
  dome_id WITH =,
  tstzrange(starts_at,ends_at,'[)') WITH &&
 ) WHERE (status IN ('reserved','confirmed'));
CREATE INDEX IF NOT EXISTS business_proposals_org_status_idx
 ON public.business_proposals(organization_id,status,created_at);
CREATE INDEX IF NOT EXISTS business_contracts_org_status_idx
 ON public.business_contracts(organization_id,status);
CREATE INDEX IF NOT EXISTS business_audit_org_time_idx
 ON public.business_audit(organization_id,created_at DESC);

-- PARTE 3: sql/04B_FUNCOES_PROPOSTAS_CONTRATOS.sql
CREATE OR REPLACE FUNCTION public.business_create_proposal(
 p_subject text,p_client uuid,p_event uuid,p_title text,p_model text,
 p_attendees integer,p_unit numeric,p_fixed numeric,p_discount numeric,
 p_deposit numeric,p_valid date,p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;v_total numeric;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 IF NOT EXISTS (SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=v_org)
 OR (p_event IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.crm_events WHERE id=p_event AND client_id=p_client AND organization_id=v_org))
 THEN RAISE EXCEPTION 'Cliente ou evento invalido'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 180
 OR p_model NOT IN ('per_student','fixed','complimentary')
 OR coalesce(p_attendees,0)<0 OR coalesce(p_unit,0)<0 OR coalesce(p_fixed,0)<0
 OR coalesce(p_discount,0)<0 OR coalesce(p_deposit,0)<0
 OR length(coalesce(p_notes,''))>4000
 THEN RAISE EXCEPTION 'Dados da proposta invalidos'; END IF;
 v_total:=greatest(0,(CASE WHEN p_model='per_student' THEN coalesce(p_attendees,0)*coalesce(p_unit,0)
 WHEN p_model='fixed' THEN coalesce(p_fixed,0) ELSE 0 END)-coalesce(p_discount,0));
 IF coalesce(p_deposit,0)>v_total THEN RAISE EXCEPTION 'Sinal maior que valor da proposta'; END IF;
 INSERT INTO public.business_proposals(
 organization_id,client_id,event_id,title,pricing_model,expected_attendees,
 unit_price,fixed_price,discount,deposit,valid_until,notes)
 VALUES(v_org,p_client,p_event,trim(p_title),p_model,p_attendees,
 coalesce(p_unit,0),coalesce(p_fixed,0),coalesce(p_discount,0),
 coalesce(p_deposit,0),p_valid,p_notes) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'proposal_created','proposal',v_id);
 RETURN v_id;
END $fn$;
CREATE OR REPLACE FUNCTION public.business_create_contract(
 p_subject text,p_proposal uuid,p_mode text,p_terms text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 IF p_mode NOT IN ('written','verbal','whatsapp') OR length(coalesce(p_terms,''))>8000
 OR NOT EXISTS (SELECT 1 FROM public.business_proposals WHERE id=p_proposal AND organization_id=v_org)
 THEN RAISE EXCEPTION 'Proposta ou modalidade invalida'; END IF;
 IF EXISTS (SELECT 1 FROM public.business_contracts WHERE proposal_id=p_proposal AND organization_id=v_org
 AND status NOT IN ('cancelled'))
 THEN RAISE EXCEPTION 'Contrato ativo ja existe para esta proposta'; END IF;
 INSERT INTO public.business_contracts(organization_id,proposal_id,confirmation_mode,terms)
 VALUES(v_org,p_proposal,p_mode,p_terms) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'contract_created','contract',v_id);
 RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.business_create_proposal(text,uuid,uuid,text,text,integer,numeric,numeric,numeric,numeric,date,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_create_contract(text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_create_proposal(text,uuid,uuid,text,text,integer,numeric,numeric,numeric,numeric,date,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_create_contract(text,uuid,text,text) TO antares_team_runtime;

-- PARTE 4: sql/04C_AGENDA_FINANCEIRO_FUNCOES.sql
CREATE OR REPLACE FUNCTION public.business_create_dome(p_subject text,p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members WHERE auth_subject=p_subject AND active AND role='owner';
 IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Nome invalido';END IF;
 INSERT INTO public.business_domes(organization_id,name) VALUES(v_org,trim(p_name)) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'dome_created','dome',v_id);
 RETURN v_id;
END $fn$;
CREATE OR REPLACE FUNCTION public.business_create_booking(
 p_subject text,p_event uuid,p_dome uuid,p_start timestamptz,p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members WHERE auth_subject=p_subject AND active AND role='owner';
 IF p_start IS NULL OR p_end IS NULL OR p_end<=p_start OR p_end>p_start+interval '12 hours'
 OR NOT EXISTS(SELECT 1 FROM public.crm_events WHERE id=p_event AND organization_id=v_org)
 OR NOT EXISTS(SELECT 1 FROM public.business_domes WHERE id=p_dome AND organization_id=v_org AND active)
 THEN RAISE EXCEPTION 'Reserva invalida';END IF;
 INSERT INTO public.business_bookings(organization_id,event_id,dome_id,starts_at,ends_at)
 VALUES(v_org,p_event,p_dome,p_start,p_end) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'booking_created','booking',v_id);
 RETURN v_id;
END $fn$;
CREATE OR REPLACE FUNCTION public.business_create_ledger_entry(
 p_subject text,p_proposal uuid,p_category text,p_status text,
 p_description text,p_amount numeric,p_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members WHERE auth_subject=p_subject AND active AND role='owner';
 IF p_category NOT IN ('income','expense') OR p_status NOT IN ('planned','settled')
 OR length(trim(coalesce(p_description,''))) NOT BETWEEN 2 AND 250
 OR p_amount IS NULL OR p_amount<=0 OR p_amount>100000000 OR p_date IS NULL
 OR (p_proposal IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM public.business_proposals WHERE id=p_proposal AND organization_id=v_org))
 THEN RAISE EXCEPTION 'Lancamento invalido';END IF;
 INSERT INTO public.business_ledger(organization_id,proposal_id,category,status,description,amount,occurred_on)
 VALUES(v_org,p_proposal,p_category,p_status,trim(p_description),p_amount,p_date) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'ledger_entry_created','ledger',v_id);
 RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.business_create_dome(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_create_booking(text,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_create_ledger_entry(text,uuid,text,text,text,numeric,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_create_dome(text,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_create_booking(text,uuid,uuid,timestamptz,timestamptz) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_create_ledger_entry(text,uuid,text,text,text,numeric,date) TO antares_team_runtime;
COMMIT;
-- Verificacao sem dados sensiveis
SELECT (SELECT count(*) FROM information_schema.tables
 WHERE table_schema='public' AND table_name IN
 ('business_proposals','business_contracts','business_domes',
 'business_bookings','business_ledger','business_audit')) AS tabelas_v1;
