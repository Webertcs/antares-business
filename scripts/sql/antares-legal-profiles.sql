-- ANTARES: perfis jurídicos permanentes por organização e cliente.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_legal_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 client_id uuid NULL REFERENCES public.crm_clients(id),
 legal_name text NOT NULL DEFAULT '',
 document_number text NOT NULL DEFAULT '',
 full_address text NOT NULL DEFAULT '',
 representative text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS antares_legal_profiles_org_provider_unique
 ON public.antares_legal_profiles(organization_id) WHERE client_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS antares_legal_profiles_org_client_unique
 ON public.antares_legal_profiles(organization_id,client_id) WHERE client_id IS NOT NULL;
ALTER TABLE public.antares_legal_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_legal_profiles FROM PUBLIC;
REVOKE ALL ON public.antares_legal_profiles FROM antares_team_runtime;
-- Leitura/gravação exclusivamente por conexão administrativa após requireOwner() na API.
COMMIT;
