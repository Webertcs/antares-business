-- ANTARES CRM | Leitura de notificacoes (sem concluir pendencias)
-- Executar no SQL Editor do Neon correto. Operacao aditiva e idempotente.
BEGIN;

DO $$
BEGIN
 IF to_regclass('public.organizations') IS NULL OR to_regclass('public.team_members') IS NULL
 THEN RAISE EXCEPTION 'Estrutura de organizacoes/equipe ausente. Operacao interrompida.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_team_runtime')
 THEN RAISE EXCEPTION 'Papel antares_team_runtime ausente. Operacao interrompida.'; END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.antares_notification_reads (
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 auth_subject text NOT NULL,
 notification_key text NOT NULL,
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id, auth_subject, notification_key),
 CONSTRAINT antares_notification_key_format
  CHECK (notification_key ~ '^(opportunities|loyalty|agenda|finance):[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}:(pending|warning|critical|today|overdue)$')
);
ALTER TABLE public.antares_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_notification_reads FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_notification_reads FROM PUBLIC, antares_team_runtime;

CREATE OR REPLACE FUNCTION public.antares_mark_notifications_read(
 p_subject text, p_org uuid, p_keys text[]
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $$
DECLARE
 v_count integer;
 v_total integer;
BEGIN
 IF p_subject IS NULL OR p_subject='' OR p_org IS NULL
   OR NOT EXISTS (
    SELECT 1 FROM public.team_members m
    WHERE m.auth_subject::text=p_subject AND m.organization_id=p_org
      AND m.active=true AND m.role='owner')
 THEN RAISE EXCEPTION 'Proprietario sem permissao para esta organizacao.'; END IF;

 v_total:=coalesce(cardinality(p_keys),0);
 IF v_total<1 OR v_total>25
 THEN RAISE EXCEPTION 'Quantidade invalida de notificacoes.'; END IF;
 IF EXISTS (
  SELECT 1 FROM unnest(p_keys) AS k(key)
  WHERE k.key IS NULL OR k.key !~
   '^(opportunities|loyalty|agenda|finance):[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}:(pending|warning|critical|today|overdue)$'
 ) THEN RAISE EXCEPTION 'Identificador de notificacao invalido.'; END IF;

 INSERT INTO public.antares_notification_reads
  (organization_id, auth_subject, notification_key)
 SELECT p_org,p_subject,keys.key
 FROM (SELECT DISTINCT key FROM unnest(p_keys) AS n(key)) AS keys
 ON CONFLICT (organization_id,auth_subject,notification_key) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.antares_mark_notifications_read(text,uuid,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_mark_notifications_read(text,uuid,text[])
 TO antares_team_runtime;

COMMIT;

-- Conferencia opcional, sem dados pessoais:
-- SELECT to_regclass('public.antares_notification_reads') IS NOT NULL AS tabela_criada,
--   to_regprocedure('public.antares_mark_notifications_read(text,uuid,text[])') IS NOT NULL AS funcao_criada;
