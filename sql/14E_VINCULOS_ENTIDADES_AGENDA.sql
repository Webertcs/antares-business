-- ANTARES 14E: ligacao segura entre entidades do CRM e entidades legadas.
-- A instalacao nao cria escolas nem cupulas automaticamente.
-- Backup/snapshot production obrigatorio antes de executar.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_client_links(
 organization_id uuid NOT NULL,
 crm_client_id uuid NOT NULL,
 operational_client_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,crm_client_id),
 UNIQUE(organization_id,operational_client_id),
 FOREIGN KEY(crm_client_id,organization_id) REFERENCES public.crm_clients(id,organization_id),
 FOREIGN KEY(operational_client_id,organization_id) REFERENCES public.clients(id,organization_id)
);
CREATE TABLE IF NOT EXISTS public.antares_dome_links(
 organization_id uuid NOT NULL,
 antares_dome_id uuid NOT NULL,
 equipment_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,antares_dome_id),
 UNIQUE(organization_id,equipment_id),
 FOREIGN KEY(antares_dome_id,organization_id) REFERENCES public.antares_domes(id,organization_id),
 FOREIGN KEY(equipment_id,organization_id) REFERENCES public.equipment(id,organization_id)
);
ALTER TABLE public.antares_client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_client_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.antares_dome_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_dome_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_client_links,public.antares_dome_links FROM PUBLIC,antares_team_runtime;
COMMIT;
-- Ponte adicional entre duas entidades reais, sem gerar registros ficticios.
-- Ligacoes serao criadas atomicamente pela funcao de agendamento, apos homologacao.
