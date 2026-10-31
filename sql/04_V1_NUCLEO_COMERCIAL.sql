-- ANTARES BUSINESS V1: núcleo comercial, contratos, agenda e financeiro.
-- Aplicar no Neon em uma única implantação controlada, após backup.
-- Não altera tabelas anteriores nem habilita escrita HTTP.
BEGIN;
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
COMMIT;
