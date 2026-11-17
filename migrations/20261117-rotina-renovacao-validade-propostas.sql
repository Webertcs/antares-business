-- ANTARES CRM | Renovação auditada de validade de proposta da vitrine
-- Executar no SQL Editor do Neon usando a conexão proprietária (neondb_owner).
-- Migração aditiva: não modifica nenhum registro de proposta existente.
-- A renovação não registra aceite da escola e não altera valores nem aprovação.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.business_proposals') IS NULL
     OR to_regclass('public.business_audit') IS NULL
     OR to_regclass('public.vitrine_leads') IS NULL
     OR to_regclass('public.team_members') IS NULL
  THEN RAISE EXCEPTION 'Tabelas essenciais do ANTARES ausentes'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='antares_team_runtime')
  THEN RAISE EXCEPTION 'Papel de execução antares_team_runtime ausente'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='neondb_owner')
  THEN RAISE EXCEPTION 'Papel proprietário neondb_owner ausente'; END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.antares_proposal_validity_history (
 id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 proposal_id uuid NOT NULL,
 actor_subject text NOT NULL,
 previous_valid_until date NOT NULL,
 renewed_valid_until date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT antares_proposal_validity_history_proposal_fk
   FOREIGN KEY (proposal_id,organization_id)
   REFERENCES public.business_proposals(id,organization_id),
 CONSTRAINT antares_proposal_validity_history_forward_ck
   CHECK (renewed_valid_until > previous_valid_until)
);
CREATE INDEX IF NOT EXISTS antares_proposal_validity_history_lookup_idx
 ON public.antares_proposal_validity_history(organization_id,proposal_id,created_at DESC);

ALTER TABLE public.antares_proposal_validity_history OWNER TO neondb_owner;
ALTER TABLE public.antares_proposal_validity_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.antares_proposal_validity_history FROM PUBLIC;
REVOKE ALL ON TABLE public.antares_proposal_validity_history FROM antares_team_runtime;

CREATE OR REPLACE FUNCTION public.antares_renew_proposal_validity(
 p_subject text,p_proposal_id uuid,p_new_valid_until date
) RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog,public,pg_temp
AS $function$
DECLARE
 v_org uuid;
 v_count integer;
 v_proposal public.business_proposals%ROWTYPE;
BEGIN
 SELECT count(*),max(tm.organization_id)
 INTO v_count,v_org
 FROM public.team_members tm
 WHERE tm.auth_subject=p_subject AND tm.active AND tm.role='owner';
 IF v_count<>1 OR v_org IS NULL
 THEN RAISE EXCEPTION 'Proprietario nao autorizado'; END IF;

 SELECT * INTO v_proposal FROM public.business_proposals
 WHERE id=p_proposal_id AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposta nao encontrada'; END IF;

 IF NOT EXISTS(SELECT 1 FROM public.vitrine_leads
   WHERE organization_id=v_org AND converted_proposal_id=p_proposal_id)
 THEN RAISE EXCEPTION 'Renovacao restrita as propostas da vitrine'; END IF;

 IF v_proposal.approved_at IS NULL
    OR v_proposal.client_accepted_at IS NOT NULL
    OR v_proposal.status NOT IN ('draft','accepted')
    OR v_proposal.archived_at IS NOT NULL
 THEN RAISE EXCEPTION 'Proposta sem aprovacao interna ou ja encerrada'; END IF;

 IF v_proposal.valid_until IS NULL OR v_proposal.valid_until>=CURRENT_DATE
 THEN RAISE EXCEPTION 'Renovacao somente para proposta vencida com validade anterior'; END IF;
 IF v_proposal.total<=0 THEN RAISE EXCEPTION 'Proposta sem valor valido'; END IF;
 IF p_new_valid_until IS NULL OR p_new_valid_until<=v_proposal.valid_until
    OR p_new_valid_until<CURRENT_DATE OR p_new_valid_until>CURRENT_DATE+365
 THEN RAISE EXCEPTION 'Nova validade invalida'; END IF;

 UPDATE public.business_proposals
 SET valid_until=p_new_valid_until
 WHERE id=p_proposal_id AND organization_id=v_org;

 INSERT INTO public.antares_proposal_validity_history(
   organization_id,proposal_id,actor_subject,previous_valid_until,renewed_valid_until
 ) VALUES(v_org,p_proposal_id,p_subject,v_proposal.valid_until,p_new_valid_until);

 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'proposal_validity_renewed','proposal',p_proposal_id);

 RETURN p_new_valid_until;
END;
$function$;

ALTER FUNCTION public.antares_renew_proposal_validity(text,uuid,date)
 OWNER TO neondb_owner;
REVOKE ALL ON FUNCTION public.antares_renew_proposal_validity(text,uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_renew_proposal_validity(text,uuid,date)
 TO antares_team_runtime;

COMMIT;

-- Conferências de leitura (executar separadamente):
-- SELECT p.proname,p.prosecdef,pg_get_userbyid(p.proowner) AS function_owner
-- FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_renew_proposal_validity(text,uuid,date)');
-- SELECT count(*) FROM public.antares_proposal_validity_history;
