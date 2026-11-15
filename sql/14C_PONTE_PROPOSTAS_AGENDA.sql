-- ANTARES 14C — preparo seguro para integracao da agenda com propostas atuais.
-- Aplicar somente depois de snapshot de production.
-- Nao altera registros existentes nem ativa escritas HTTP.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_proposal_reservations(
 organization_id uuid NOT NULL,
 proposal_id uuid NOT NULL,
 presentation_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,proposal_id,presentation_id),
 UNIQUE(organization_id,presentation_id),
 FOREIGN KEY(proposal_id,organization_id) REFERENCES public.business_proposals(id,organization_id),
 FOREIGN KEY(presentation_id,organization_id) REFERENCES public.presentations(id,organization_id)
);
ALTER TABLE public.antares_proposal_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_proposal_reservations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_proposal_reservations FROM PUBLIC,antares_team_runtime;
COMMIT;
-- O vinculo e feito por tabela ponte, sem substituir as FKs legadas.
-- Proximo passo: verificar clientes/equipamentos compativeis e criar funcao atomica
-- com validacao do owner e de conflitos. Nenhuma funcao de escrita e ativada aqui.
