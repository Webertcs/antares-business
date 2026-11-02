-- ANTARES 14E | Ponte atomica CRM -> agenda. Aplicar em production apos snapshot.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_client_links(
 organization_id uuid NOT NULL,crm_client_id uuid NOT NULL,operational_client_id uuid NOT NULL,
 PRIMARY KEY(organization_id,crm_client_id),UNIQUE(organization_id,operational_client_id),
 FOREIGN KEY(crm_client_id,organization_id) REFERENCES public.crm_clients(id,organization_id),
 FOREIGN KEY(operational_client_id,organization_id) REFERENCES public.clients(id,organization_id));
CREATE TABLE IF NOT EXISTS public.antares_dome_links(
 organization_id uuid NOT NULL,antares_dome_id uuid NOT NULL,equipment_id uuid NOT NULL,
 PRIMARY KEY(organization_id,antares_dome_id),UNIQUE(organization_id,equipment_id),
 FOREIGN KEY(antares_dome_id,organization_id) REFERENCES public.antares_domes(id,organization_id),
 FOREIGN KEY(equipment_id,organization_id) REFERENCES public.equipment(id,organization_id));
ALTER TABLE public.antares_client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_client_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.antares_dome_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_dome_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_client_links,public.antares_dome_links FROM PUBLIC,antares_team_runtime;
CREATE OR REPLACE FUNCTION public.antares_book_proposal(
 p_subject text,p_org uuid,p_proposal uuid,p_dome uuid,p_start timestamptz,p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_client uuid;v_legacy uuid;v_equipment uuid;v_presentation uuid;v_title text;v_students integer;v_capacity integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject AND organization_id=p_org AND active AND role='owner')
 THEN RAISE EXCEPTION 'Acesso negado';END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_start<=now() OR p_end<=p_start OR p_end>p_start+interval '24 hours'
 THEN RAISE EXCEPTION 'Periodo invalido';END IF;
 SELECT client_id,title,expected_attendees INTO v_client,v_title,v_students
 FROM public.business_proposals WHERE organization_id=p_org AND id=p_proposal AND status='accepted';
 IF v_client IS NULL THEN RAISE EXCEPTION 'Proposta nao aprovada';END IF;
 SELECT operational_client_id INTO v_legacy FROM public.antares_client_links
 WHERE organization_id=p_org AND crm_client_id=v_client;
 IF v_legacy IS NULL THEN RAISE EXCEPTION 'Cliente sem vinculo operacional';END IF;
 SELECT l.equipment_id,d.capacity INTO v_equipment,v_capacity
 FROM public.antares_dome_links l JOIN public.antares_domes d
 ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
 JOIN public.equipment e ON e.id=l.equipment_id AND e.organization_id=l.organization_id
 WHERE l.organization_id=p_org AND l.antares_dome_id=p_dome AND d.active AND e.active AND e.category='dome';
 IF v_equipment IS NULL THEN RAISE EXCEPTION 'Cupula nao vinculada ou inativa';END IF;
 IF v_students IS NOT NULL AND v_students>0 AND v_capacity IS NOT NULL AND v_students>v_capacity
 THEN RAISE EXCEPTION 'Capacidade insuficiente';END IF;
 IF EXISTS(SELECT 1 FROM public.antares_proposal_reservations
 WHERE organization_id=p_org AND proposal_id=p_proposal)
 THEN RAISE EXCEPTION 'Proposta ja possui reserva';END IF;
 INSERT INTO public.presentations(organization_id,client_id,dome_id,dome_category,title,starts_at,ends_at,status,expected_students)
 VALUES(p_org,v_legacy,v_equipment,'dome',v_title,p_start,p_end,'reserved',NULLIF(v_students,0))
 RETURNING id INTO v_presentation;
 INSERT INTO public.antares_proposal_reservations(organization_id,proposal_id,presentation_id)
 VALUES(p_org,p_proposal,v_presentation);
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'proposal_presentation_reserved','presentation',v_presentation);
 RETURN v_presentation;
END $$;
REVOKE ALL ON FUNCTION public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) TO antares_team_runtime;
COMMIT;
