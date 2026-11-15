-- V1: comandos de agenda e financeiro, somente apos migracoes 04 e 04A.
BEGIN;
CREATE OR REPLACE FUNCTION public.business_create_dome(p_subject text,p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members WHERE auth_subject=p_subject AND active AND role='owner';
 IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Nome invalido';END IF;
 INSERT INTO public.business_domes(organization_id,name) VALUES(v_org,trim(p_name)) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'dome_created','dome',v_id);
 RETURN v_id;
END $fn$;
CREATE OR REPLACE FUNCTION public.business_create_booking(
 p_subject text,p_event uuid,p_dome uuid,p_start timestamptz,p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members WHERE auth_subject=p_subject AND active AND role='owner';
 IF p_start IS NULL OR p_end IS NULL OR p_end<=p_start OR p_end>p_start+interval '12 hours'
 OR NOT EXISTS(SELECT 1 FROM public.crm_events WHERE id=p_event AND organization_id=v_org)
 OR NOT EXISTS(SELECT 1 FROM public.business_domes WHERE id=p_dome AND organization_id=v_org AND active)
 THEN RAISE EXCEPTION 'Reserva invalida';END IF;
 INSERT INTO public.business_bookings(organization_id,event_id,dome_id,starts_at,ends_at)
 VALUES(v_org,p_event,p_dome,p_start,p_end) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'booking_created','booking',v_id);
 RETURN v_id;
END $fn$;
CREATE OR REPLACE FUNCTION public.business_create_ledger_entry(
 p_subject text,p_proposal uuid,p_category text,p_status text,
 p_description text,p_amount numeric,p_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members WHERE auth_subject=p_subject AND active AND role='owner';
 IF p_category NOT IN ('income','expense') OR p_status NOT IN ('planned','settled')
 OR length(trim(coalesce(p_description,''))) NOT BETWEEN 2 AND 250
 OR p_amount IS NULL OR p_amount<=0 OR p_amount>100000000 OR p_date IS NULL
 OR (p_proposal IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM public.business_proposals WHERE id=p_proposal AND organization_id=v_org))
 THEN RAISE EXCEPTION 'Lancamento invalido';END IF;
 INSERT INTO public.business_ledger(organization_id,proposal_id,category,status,description,amount,occurred_on)
 VALUES(v_org,p_proposal,p_category,p_status,trim(p_description),p_amount,p_date) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'ledger_entry_created','ledger',v_id);
 RETURN v_id;
END $fn$;
REVOKE ALL ON FUNCTION public.business_create_dome(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_create_booking(text,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_create_ledger_entry(text,uuid,text,text,text,numeric,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_create_dome(text,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_create_booking(text,uuid,uuid,timestamptz,timestamptz) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.business_create_ledger_entry(text,uuid,text,text,text,numeric,date) TO antares_team_runtime;
COMMIT;
