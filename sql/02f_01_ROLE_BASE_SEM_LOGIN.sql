-- ANTARES BUSINESS - 02F / etapa 1: papel sem privilegios (seguro e reversivel).
-- Executar uma unica vez no Neon SQL Editor com neondb_owner.
-- Nao cria conta com login, nao altera membros, nao concede acesso a dados.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_team_runtime') THEN
    CREATE ROLE antares_team_runtime NOLOGIN NOBYPASSRLS INHERIT;
  END IF;
END $$;
-- Esta etapa propositalmente NAO concede grants e NAO habilita rotas de escrita.
COMMIT;
SELECT rolname,rolcanlogin,rolbypassrls,rolsuper FROM pg_roles WHERE rolname='antares_team_runtime';
