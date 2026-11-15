-- ANTARES BUSINESS - BLOCO 03: CLIENTES, CONTATOS E EVENTOS
-- Escolas, empresas, associacoes e clientes particulares.
-- Executar com backup no Neon SQL Editor. Nao altera dados do Bloco 02.
BEGIN;
CREATE TABLE IF NOT EXISTS public.crm_clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 kind text NOT NULL CHECK(kind IN ('school','company','association','private','other')),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 180),
 legal_name text, document_id text, email text, phone text,
 city text, address text, notes text,
 status text NOT NULL DEFAULT 'prospect' CHECK(status IN ('prospect','active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id)
);
CREATE INDEX IF NOT EXISTS crm_clients_org_name_idx ON public.crm_clients(organization_id,name);
CREATE INDEX IF NOT EXISTS crm_clients_org_kind_idx ON public.crm_clients(organization_id,kind);
CREATE TABLE IF NOT EXISTS public.crm_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 client_id uuid NOT NULL,
 full_name text NOT NULL CHECK(length(trim(full_name)) BETWEEN 2 AND 160),
 position text, email text, phone text, whatsapp boolean NOT NULL DEFAULT false,
 is_primary boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (client_id,organization_id) REFERENCES public.crm_clients(id,organization_id)
);
CREATE INDEX IF NOT EXISTS crm_contacts_org_client_idx ON public.crm_contacts(organization_id,client_id);
CREATE TABLE IF NOT EXISTS public.crm_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 client_id uuid NOT NULL,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 180),
 event_kind text NOT NULL DEFAULT 'presentation'
   CHECK(event_kind IN ('presentation','corporate','private','other')),
 event_date date, expected_attendees integer CHECK(expected_attendees >= 0),
 pricing_model text NOT NULL DEFAULT 'per_student' CHECK(pricing_model IN ('per_student','fixed','complimentary')),
 price_per_person numeric(12,2) CHECK(price_per_person>=0),
 fixed_amount numeric(12,2) CHECK(fixed_amount>=0),
 status text NOT NULL DEFAULT 'lead'
   CHECK(status IN ('lead','quoted','reserved','confirmed','completed','cancelled')),
 venue text, notes text, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (client_id,organization_id) REFERENCES public.crm_clients(id,organization_id)
);
CREATE INDEX IF NOT EXISTS crm_events_org_date_idx ON public.crm_events(organization_id,event_date);
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
-- Falha fechada para papeis nao proprietarios: nenhuma policy liberada nesta fase.
REVOKE ALL ON public.crm_clients,public.crm_contacts,public.crm_events FROM PUBLIC;
REVOKE ALL ON public.crm_clients,public.crm_contacts,public.crm_events FROM antares_team_runtime;
COMMIT;
-- Nao usar DATABASE_URL_TEAM_RUNTIME para acesso CRUD direto.
-- APIs de escrita do Bloco 03 permanecem bloqueadas ate isolamento aprovado.
