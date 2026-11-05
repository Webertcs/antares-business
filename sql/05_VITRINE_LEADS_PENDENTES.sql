-- ANTARES — PROPOSTA DE MIGRAÇÃO 05. NÃO EXECUTAR SEM HOMOLOGAÇÃO.
-- Rode como neondb_owner após backup e auditoria da segurança.
-- Requer provisionar papel LOGIN com senha forte fora deste arquivo e URL própria em ambiente.
-- NÃO concede SELECT/UPDATE/DELETE à conexão pública.
BEGIN;
CREATE TABLE IF NOT EXISTS public.vitrine_leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 responsible_name text NOT NULL,
 institution text NOT NULL,
 city text NOT NULL,
 phone text NOT NULL,
 audience text NOT NULL,
 attendees integer,
 desired_date date,
 notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewing','converted','archived')),
 abuse_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vitrine_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vitrine_leads FROM PUBLIC;
CREATE INDEX IF NOT EXISTS vitrine_leads_inbox_idx ON public.vitrine_leads(organization_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS vitrine_leads_rate_idx ON public.vitrine_leads(abuse_key,created_at DESC);
DO $role$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='antares_public_inbox') THEN
  CREATE ROLE antares_public_inbox NOLOGIN NOSUPERUSER NOBYPASSRLS;
 END IF;
END $role$;
REVOKE ALL ON public.vitrine_leads FROM antares_public_inbox;
CREATE OR REPLACE FUNCTION public.vitrine_receive_lead(
 p_org uuid,p_name text,p_institution text,p_city text,p_phone text,
 p_audience text,p_attendees integer,p_date date,p_notes text,p_abuse_key text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE new_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=p_org)
 OR length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 120
 OR length(btrim(coalesce(p_institution,''))) NOT BETWEEN 2 AND 150
 OR length(btrim(coalesce(p_city,''))) NOT BETWEEN 2 AND 100
 OR p_phone !~ '^[0-9]{10,13}$'
 OR p_audience NOT IN ('Escola','Associação','Empresa','Evento particular')
 OR (p_attendees IS NOT NULL AND (p_attendees < 1 OR p_attendees > 100000))
 OR (p_date IS NOT NULL AND p_date < current_date)
 OR length(coalesce(p_notes,'')) > 800
 OR length(coalesce(p_abuse_key,'')) <> 64
 THEN RAISE EXCEPTION 'Solicitacao invalida'; END IF;
 -- Limite transacional por chave de abuso; serializa concorrência da mesma origem.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_abuse_key,0));
 IF (SELECT count(*) FROM public.vitrine_leads
     WHERE abuse_key=p_abuse_key AND created_at>now()-interval '1 hour')>=4
 THEN RAISE EXCEPTION 'Limite temporario de solicitacoes'; END IF;
 INSERT INTO public.vitrine_leads
 (organization_id,responsible_name,institution,city,phone,audience,attendees,desired_date,notes,abuse_key)
 VALUES(p_org,btrim(p_name),btrim(p_institution),btrim(p_city),p_phone,p_audience,
 p_attendees,p_date,coalesce(p_notes,''),p_abuse_key) RETURNING id INTO new_id;
 RETURN new_id;
END $fn$;
REVOKE ALL ON FUNCTION public.vitrine_receive_lead(uuid,text,text,text,text,text,integer,date,text,text) FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO antares_public_inbox;
GRANT EXECUTE ON FUNCTION public.vitrine_receive_lead(uuid,text,text,text,text,text,integer,date,text,text) TO antares_public_inbox;
COMMIT;
-- Provisionamento posterior pelo administrador: criar login com senha forte e GRANT antares_public_inbox.
-- Usar credencial exclusiva DATABASE_URL_PUBLIC_INBOX; nunca DATABASE_URL (proprietário).
-- O snapshot autenticado do proprietário deve incluir vitrine_leads e permitir revisão, sem conversão automática.
