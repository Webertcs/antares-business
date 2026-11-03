-- ANTARES · Bloco 02 — estrutura operacional (NÃO EXECUTAR SEM BACKUP).
-- Aplicar manualmente no Neon após revisão. Não altera crm_events.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_event_operations (
  event_id uuid PRIMARY KEY REFERENCES public.crm_events(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  access_instructions text,
  parking_instructions text,
  power_requirements text,
  setup_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(coalesce(access_instructions,''))<=2000),
  CHECK (length(coalesce(parking_instructions,''))<=2000),
  CHECK (length(coalesce(power_requirements,''))<=2000),
  CHECK (length(coalesce(setup_notes,''))<=4000)
);
CREATE TABLE IF NOT EXISTS public.antares_event_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.crm_events(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 180),
  done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS antares_event_checklist_event_idx ON public.antares_event_checklist(organization_id,event_id);
CREATE TABLE IF NOT EXISTS public.antares_event_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.crm_events(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 160),
  starts_at time,
  ends_at time,
  expected_students integer CHECK (expected_students BETWEEN 0 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at>starts_at)
);
CREATE INDEX IF NOT EXISTS antares_event_sessions_event_idx ON public.antares_event_sessions(organization_id,event_id);
ALTER TABLE public.antares_event_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_event_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_event_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.antares_event_checklist FORCE ROW LEVEL SECURITY;
ALTER TABLE public.antares_event_sessions FORCE ROW LEVEL SECURITY;
-- Sem GRANT para PUBLIC ou para a role de runtime.
-- APIs de escrita exigirão funções restritas com validação de sessão/organização.
COMMIT;
