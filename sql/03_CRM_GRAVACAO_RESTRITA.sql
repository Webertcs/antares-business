-- ANTARES BUSINESS BLOCO 03 - CRUD CONTROLADO DE CLIENTES
-- Executar SOMENTE após sql/03_CRM_CLIENTES_EVENTOS.sql, com backup.
-- Protegido por flag da API e role EXECUTE-only.
BEGIN;
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
-- As rotas permanecem bloqueadas até validar isolamento e autenticação.
