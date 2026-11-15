-- ANTARES BLOCO 05E — login exclusivo da vitrine
-- Executar no Neon SQL Editor conectado como neondb_owner.
-- ANTES: criar uma senha forte própria e substituir apenas no SQL Editor.
-- NÃO salvar a senha no GitHub, chat ou arquivo SQL.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_public_inbox_login') THEN
   RAISE EXCEPTION 'Crie primeiro o papel LOGIN antares_public_inbox_login no Neon (Roles), com senha exclusiva.';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_public_inbox_login'
            AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN
   RAISE EXCEPTION 'Role pública excessivamente privilegiada';
 END IF;
END $$;
GRANT antares_public_inbox TO antares_public_inbox_login;
REVOKE ALL ON public.vitrine_leads FROM antares_public_inbox_login;
REVOKE ALL ON FUNCTION public.vitrine_review_lead(text,uuid,text) FROM antares_public_inbox_login;
REVOKE ALL ON FUNCTION public.vitrine_convert_lead(text,uuid) FROM antares_public_inbox_login;
COMMIT;
-- Consultar como a credencial LOGIN para homologar privilégios efetivos.
