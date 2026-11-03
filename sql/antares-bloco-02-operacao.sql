-- ANTARES · Bloco 02 — estrutura operacional (NÃO EXECUTAR SEM BACKUP).
-- Aplicar manualmente no Neon após revisão. Não altera crm_events.
BEGIN;
-- Garante que cada registro operacional pertença à mesma organização do evento.
CREATE UNIQUE INDEX IF NOT EXISTS crm_events_id_organization_unique ON public.crm_events(id,organization_id);
CREATE TABLE IF NOT EXISTS public.antares_event_operations (
  event_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  FOREIGN KEY (event_id,organization_id) REFERENCES public.crm_events(id,organization_id) ON DELETE RESTRICT,
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
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  FOREIGN KEY (event_id,organization_id) REFERENCES public.crm_events(id,organization_id) ON DELETE RESTRICT,
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 180),
  done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS antares_event_checklist_event_idx ON public.antares_event_checklist(organization_id,event_id);
CREATE TABLE IF NOT EXISTS public.antares_event_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  FOREIGN KEY (event_id,organization_id) REFERENCES public.crm_events(id,organization_id) ON DELETE RESTRICT,
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
-- Leitura: exclusivamente via DATABASE_URL (role proprietária) e API autenticada,
-- com filtros obrigatórios de event_id e organization_id.
-- A role antares_team_runtime NÃO recebe SELECT/INSERT/UPDATE direto.
-- RLS permanece habilitado; proprietário das tabelas não sofre RLS sem FORCE.
-- Escrita: exclusivamente por funções SECURITY DEFINER com EXECUTE restrito.
REVOKE ALL ON public.antares_event_operations FROM PUBLIC;
REVOKE ALL ON public.antares_event_checklist FROM PUBLIC;
REVOKE ALL ON public.antares_event_sessions FROM PUBLIC;
COMMIT;
