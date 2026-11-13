-- ANTARES CRM | Migração aditiva do telefone da empresa
-- Executar uma única vez no SQL Editor do projeto Neon correto.
-- Não exclui registros, não altera as funções de cadastro já utilizadas.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.antares_provider_profiles') IS NULL THEN
    RAISE EXCEPTION 'Tabela de dados da empresa ausente; verifique a migração 14.';
  END IF;
  IF to_regclass('public.team_members') IS NULL THEN
    RAISE EXCEPTION 'Tabela de equipe ausente; interrompendo.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'antares_team_runtime') THEN
    RAISE EXCEPTION 'Papel antares_team_runtime ausente; interrompendo.';
  END IF;
END;
$$;

ALTER TABLE public.antares_provider_profiles
  ADD COLUMN IF NOT EXISTS contact_phone text;

COMMENT ON COLUMN public.antares_provider_profiles.contact_phone
  IS 'Telefone de contato do planetário, no formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.';

CREATE OR REPLACE FUNCTION public.antares_save_provider_phone(
  p_auth_subject text,
  p_organization_id uuid,
  p_phone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  owner_matches integer;
BEGIN
  SELECT count(*) INTO owner_matches
    FROM public.team_members AS m
   WHERE m.auth_subject::text = p_auth_subject
     AND m.organization_id = p_organization_id
     AND m.active = true
     AND m.role = 'owner';

  IF owner_matches <> 1 THEN
    RAISE EXCEPTION 'Proprietario nao autorizado para esta organizacao.';
  END IF;

  IF p_phone IS NULL OR p_phone !~ '^[(][0-9]{2}[)] [0-9]{4,5}-[0-9]{4}$' THEN
    RAISE EXCEPTION 'Telefone deve estar em formato brasileiro com DDD.';
  END IF;

  UPDATE public.antares_provider_profiles
     SET contact_phone = p_phone
   WHERE organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cadastre primeiro os dados da empresa.';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.antares_save_provider_phone(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_save_provider_phone(text,uuid,text)
  TO antares_team_runtime;

COMMIT;

-- Conferência após executar (somente leitura):
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='antares_provider_profiles'
--    AND column_name='contact_phone';
