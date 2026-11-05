-- ANTARES: execute once as neondb_owner in Neon SQL Editor.
-- Transactional reservation changes, isolated audit and conflict checks.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_reservation_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 presentation_id uuid NOT NULL,
 actor_id text NOT NULL,
 action text NOT NULL CHECK(action IN ('edit','cancel')),
 old_dome_id uuid,
 new_dome_id uuid,
 old_start timestamptz,
 new_start timestamptz,
 old_end timestamptz,
 new_end timestamptz,
 old_status text,
 new_status text,
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.antares_reservation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_reservation_audit FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.antares_change_proposal_reservation(
 p_actor text,p_org uuid,p_presentation uuid,p_action text,p_dome uuid,p_start timestamptz,p_end timestamptz
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
 v_old public.presentations%ROWTYPE;
 v_new_dome uuid;
 v_actor_ok boolean;
BEGIN
 IF p_action NOT IN ('edit','cancel') THEN RAISE EXCEPTION 'invalid action'; END IF;
 -- Membership is checked again inside the transaction, not only by the API.
 SELECT EXISTS(SELECT 1 FROM public.team_members t WHERE t.organization_id=p_org
   AND t.auth_subject=p_actor AND t.role='owner' AND t.active=true) INTO v_actor_ok;
 IF NOT v_actor_ok THEN RAISE EXCEPTION 'unauthorized actor'; END IF;
 -- Lock all reservation changes in this organization, including other domes.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text,0));
 SELECT p.* INTO v_old FROM public.presentations p
 JOIN public.antares_proposal_reservations r ON r.presentation_id=p.id AND r.organization_id=p.organization_id
 WHERE p.organization_id=p_org AND p.id=p_presentation FOR UPDATE OF p;
 IF NOT FOUND OR v_old.status='cancelled' THEN RAISE EXCEPTION 'reservation unavailable'; END IF;
 IF p_action='edit' THEN
  IF p_dome IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end<=p_start THEN RAISE EXCEPTION 'invalid schedule'; END IF;
  SELECT l.equipment_id INTO v_new_dome FROM public.antares_dome_links l
  JOIN public.antares_domes d ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
  WHERE l.organization_id=p_org AND l.antares_dome_id=p_dome AND d.active;
  IF v_new_dome IS NULL THEN RAISE EXCEPTION 'invalid dome'; END IF;
  IF EXISTS(SELECT 1 FROM public.presentations p WHERE p.organization_id=p_org AND p.id<>p_presentation
    AND p.dome_id=v_new_dome AND p.status<>'cancelled'
    AND p.starts_at<p_end AND p.ends_at>p_start) THEN RAISE EXCEPTION 'schedule conflict'; END IF;
  UPDATE public.presentations SET dome_id=v_new_dome,starts_at=p_start,ends_at=p_end
  WHERE id=p_presentation AND organization_id=p_org;
 ELSE
  v_new_dome=v_old.dome_id;
  UPDATE public.presentations SET status='cancelled' WHERE id=p_presentation AND organization_id=p_org;
 END IF;
 INSERT INTO public.antares_reservation_audit(
 organization_id,presentation_id,actor_id,action,old_dome_id,new_dome_id,
 old_start,new_start,old_end,new_end,old_status,new_status)
 VALUES(p_org,p_presentation,p_actor,p_action,v_old.dome_id,v_new_dome,
 v_old.starts_at,CASE WHEN p_action='edit' THEN p_start ELSE v_old.starts_at END,
 v_old.ends_at,CASE WHEN p_action='edit' THEN p_end ELSE v_old.ends_at END,
 v_old.status,CASE WHEN p_action='cancel' THEN 'cancelled' ELSE v_old.status END);
 RETURN p_presentation;
END $$;
REVOKE ALL ON FUNCTION public.antares_change_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_change_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz) TO antares_team_runtime;
COMMIT;
