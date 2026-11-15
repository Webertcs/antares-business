-- ANTARES · Bloco 02E — modelos reutilizáveis de checklist.
-- ETAPA 1: somente estrutura. Revisar e fazer backup antes de executar no Neon.
-- Não concede acesso direto à conta antares_team_runtime.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS antares_checklist_templates_name_uq
  ON public.antares_checklist_templates (organization_id, lower(trim(name)));
CREATE TABLE IF NOT EXISTS public.antares_checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  template_id uuid NOT NULL,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 180),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (template_id, organization_id)
    REFERENCES public.antares_checklist_templates(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS antares_checklist_template_items_idx
  ON public.antares_checklist_template_items (organization_id, template_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS antares_checklist_template_items_label_uq
  ON public.antares_checklist_template_items (template_id, lower(trim(label)));
ALTER TABLE public.antares_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_checklist_template_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_checklist_templates FROM PUBLIC;
REVOKE ALL ON public.antares_checklist_template_items FROM PUBLIC;
COMMIT;
-- Próximas etapas: funções SECURITY DEFINER restritas ao owner,
-- API autenticada, aplicação idempotente por evento e auditoria.
