-- ANTARES | Cadastro dos dados do prestador. Aplicar apos snapshot na production.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_provider_profiles(
 organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
 legal_name text NOT NULL CHECK(length(btrim(legal_name)) BETWEEN 2 AND 180),
 tax_id text NOT NULL CHECK(length(btrim(tax_id)) BETWEEN 11 AND 20),
 address text NOT NULL CHECK(length(btrim(address)) BETWEEN 5 AND 300),
 representative text NOT NULL CHECK(length(btrim(representative)) BETWEEN 2 AND 160),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.antares_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_provider_profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_provider_profiles FROM PUBLIC,antares_team_runtime;
CREATE OR REPLACE FUNCTION public.antares_save_provider_profile(
 p_subject text,p_org uuid,p_name text,p_tax text,p_address text,p_representative text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE organization_id=p_org AND auth_subject=p_subject AND active AND role='owner')
 THEN RAISE EXCEPTION 'Acesso negado';END IF;
 INSERT INTO public.antares_provider_profiles(organization_id,legal_name,tax_id,address,representative)
 VALUES(p_org,btrim(p_name),btrim(p_tax),btrim(p_address),btrim(p_representative))
 ON CONFLICT(organization_id) DO UPDATE SET
 legal_name=excluded.legal_name,tax_id=excluded.tax_id,address=excluded.address,
 representative=excluded.representative,updated_at=now();
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.antares_save_provider_profile(text,uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_save_provider_profile(text,uuid,text,text,text,text) TO antares_team_runtime;
COMMIT;
