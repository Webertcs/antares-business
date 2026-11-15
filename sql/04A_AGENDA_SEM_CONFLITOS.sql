-- ANTARES V1 — proteção de agendamentos contra conflito na mesma cúpula.
-- Complementa sql/04_V1_NUCLEO_COMERCIAL.sql antes da implantação comercial.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.business_bookings
 ADD CONSTRAINT business_booking_no_overlap
 EXCLUDE USING gist (
  organization_id WITH =,
  dome_id WITH =,
  tstzrange(starts_at,ends_at,'[)') WITH &&
 ) WHERE (status IN ('reserved','confirmed'));
CREATE INDEX IF NOT EXISTS business_proposals_org_status_idx
 ON public.business_proposals(organization_id,status,created_at);
CREATE INDEX IF NOT EXISTS business_contracts_org_status_idx
 ON public.business_contracts(organization_id,status);
CREATE INDEX IF NOT EXISTS business_audit_org_time_idx
 ON public.business_audit(organization_id,created_at DESC);
COMMIT;
