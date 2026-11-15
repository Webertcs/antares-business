-- ANTARES | Bloco 06A: infraestrutura para crescimento e relacionamento
-- Aplicar no Neon SQL Editor após revisão. NÃO exclui dados e NÃO ativa funções públicas.
BEGIN;

CREATE TABLE IF NOT EXISTS public.antares_domes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 100),
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 30),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  UNIQUE (organization_id,id),
  UNIQUE (organization_id,code),
  CHECK ((active AND retired_at IS NULL) OR (NOT active))
);

CREATE INDEX IF NOT EXISTS antares_domes_org_active_idx
ON public.antares_domes(organization_id,active);

CREATE TABLE IF NOT EXISTS public.antares_relationship_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 3 AND 60),
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 3 AND 100),
  days_since_last_event integer NOT NULL CHECK (days_since_last_event BETWEEN 1 AND 730),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,code)
);

CREATE TABLE IF NOT EXISTS public.antares_relationship_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  client_id uuid NOT NULL,
  action_kind text NOT NULL CHECK (action_kind IN ('follow_up','renewal','feedback','offer','other')),
  due_date date,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  note text NOT NULL DEFAULT '' CHECK (length(note)<=2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS antares_relationship_actions_queue_idx
ON public.antares_relationship_actions (organization_id,status,due_date);

-- Isolamento: nenhuma leitura/gravação direta por perfis públicos.
ALTER TABLE public.antares_domes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_relationship_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_relationship_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_domes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.antares_relationship_alert_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.antares_relationship_actions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.antares_domes,public.antares_relationship_alert_rules,public.antares_relationship_actions FROM PUBLIC;
REVOKE ALL ON public.antares_domes,public.antares_relationship_alert_rules,public.antares_relationship_actions FROM antares_public_inbox_login;
REVOKE ALL ON public.antares_domes,public.antares_relationship_alert_rules,public.antares_relationship_actions FROM antares_team_runtime;

COMMIT;

-- Próximos sub-blocos: operações auditadas para cadastrar/desativar cúpulas,
-- vincular eventos e custos por cúpula, apurar histórico de sessões concluídas
-- e emitir lembretes internos. Nenhuma dessas automações é ativada aqui.
