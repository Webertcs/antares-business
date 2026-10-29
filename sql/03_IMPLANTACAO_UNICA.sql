-- ANTARES BUSINESS / BLOCO 03 / MIGRACAO UNICA
-- SOMENTE apos backup do banco neondb e homologacao em ambiente de teste.
-- Nao executar scripts 03 anteriores separadamente.
-- A criacao de tabelas e funcoes sera revertida se ocorrer erro.
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


CREATE OR REPLACE FUNCTION public.crm_save_client(
 p_subject text,p_id uuid,p_kind text,p_name text,p_email text,
 p_phone text,p_city text,p_notes text,p_status text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid; v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 IF p_kind NOT IN ('school','company','association','private','other')
 OR p_status NOT IN ('prospect','active','inactive')
 OR length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 180
 OR length(coalesce(p_email,''))>254 OR length(coalesce(p_phone,''))>40
 OR length(coalesce(p_city,''))>120 OR length(coalesce(p_notes,''))>4000
 THEN RAISE EXCEPTION 'Dados de cliente invalidos'; END IF;
 IF p_id IS NULL THEN
  INSERT INTO public.crm_clients(organization_id,kind,name,email,phone,city,notes,status)
  VALUES(v_org,p_kind,btrim(p_name),nullif(btrim(p_email),''),nullif(btrim(p_phone),''),
  nullif(btrim(p_city),''),nullif(btrim(p_notes),''),p_status) RETURNING id INTO v_id;
 ELSE
  UPDATE public.crm_clients SET kind=p_kind,name=btrim(p_name),email=nullif(btrim(p_email),''),
  phone=nullif(btrim(p_phone),''),city=nullif(btrim(p_city),''),
  notes=nullif(btrim(p_notes),''),status=p_status,updated_at=now()
  WHERE id=p_id AND organization_id=v_org RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Cliente nao encontrado nesta organizacao'; END IF;
 END IF;
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.crm_save_contact(
 p_subject text,p_client uuid,p_name text,p_position text,p_email text,
 p_phone text,p_whatsapp boolean,p_primary boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 IF NOT EXISTS (SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=v_org)
 THEN RAISE EXCEPTION 'Cliente de outra organizacao ou inexistente'; END IF;
 IF length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 160
 OR length(coalesce(p_position,''))>120 OR length(coalesce(p_email,''))>254
 OR length(coalesce(p_phone,''))>40 THEN RAISE EXCEPTION 'Contato invalido'; END IF;
 IF p_primary THEN UPDATE public.crm_contacts SET is_primary=false
 WHERE organization_id=v_org AND client_id=p_client; END IF;
 INSERT INTO public.crm_contacts(organization_id,client_id,full_name,position,email,phone,whatsapp,is_primary)
 VALUES(v_org,p_client,btrim(p_name),nullif(btrim(p_position),''),nullif(btrim(p_email),''),
 nullif(btrim(p_phone),''),coalesce(p_whatsapp,false),coalesce(p_primary,false))
 RETURNING id INTO v_id;
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.crm_save_event(
 p_subject text,p_client uuid,p_title text,p_kind text,p_event_date date,
 p_attendees integer,p_pricing text,p_price numeric,p_fixed numeric,
 p_status text,p_venue text,p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 IF NOT EXISTS(SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=v_org)
 THEN RAISE EXCEPTION 'Cliente de outra organizacao ou inexistente'; END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 2 AND 180
 OR p_kind NOT IN ('presentation','corporate','private','other')
 OR p_pricing NOT IN ('per_student','fixed','complimentary')
 OR p_status NOT IN ('lead','quoted','reserved','confirmed','completed','cancelled')
 OR coalesce(p_attendees,0)<0 OR coalesce(p_price,0)<0 OR coalesce(p_fixed,0)<0
 OR length(coalesce(p_venue,''))>200 OR length(coalesce(p_notes,''))>4000
 THEN RAISE EXCEPTION 'Apresentacao invalida'; END IF;
 INSERT INTO public.crm_events(organization_id,client_id,title,event_kind,event_date,
 expected_attendees,pricing_model,price_per_person,fixed_amount,status,venue,notes)
 VALUES(v_org,p_client,btrim(p_title),p_kind,p_event_date,p_attendees,p_pricing,
 p_price,p_fixed,p_status,nullif(btrim(p_venue),''),nullif(btrim(p_notes),''))
 RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.crm_save_client(text,uuid,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_save_contact(text,uuid,text,text,text,text,boolean,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_save_event(text,uuid,text,text,date,integer,text,numeric,numeric,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_save_client(text,uuid,text,text,text,text,text,text,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.crm_save_contact(text,uuid,text,text,text,text,text,boolean,boolean) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.crm_save_event(text,uuid,text,text,date,integer,text,numeric,numeric,text,text,text) TO antares_team_runtime;

COMMIT;
-- CHECK FINAL (esperado: 3 tabelas e 3 funcoes):
SELECT
 (SELECT count(*) FROM pg_class WHERE oid IN (
 'public.crm_clients'::regclass, 'public.crm_contacts'::regclass,'public.crm_events'::regclass)) AS tabelas,
 (SELECT count(*) FROM pg_proc WHERE oid IN (
 'public.crm_save_client(text,uuid,text,text,text,text,text,text,text)'::regprocedure,
 'public.crm_save_contact(text,uuid,text,text,text,text,boolean,boolean)'::regprocedure,
 'public.crm_save_event(text,uuid,text,text,date,integer,text,numeric,numeric,text,text,text)'::regprocedure
 ) AND prosecdef) AS funcoes_restritas;
