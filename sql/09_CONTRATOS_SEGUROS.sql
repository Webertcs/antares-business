-- Bloco 09: contratos na estrutura atual, sem ativar gravacoes.
-- Execute APENAS apos snapshot de production. SQL transacional e reversivel se falhar.
BEGIN;
CREATE TABLE IF NOT EXISTS public.business_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 proposal_id uuid NOT NULL,
 confirmation_mode text NOT NULL CHECK (confirmation_mode IN ('written','verbal','whatsapp')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','fulfilled')),
 confirmed_at timestamptz,
 terms text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT business_contracts_proposal_org_fk
 FOREIGN KEY (proposal_id,organization_id) REFERENCES public.business_proposals(id,organization_id),
 UNIQUE (id,organization_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS business_contracts_one_per_proposal
 ON public.business_contracts(organization_id,proposal_id) WHERE status!='cancelled';
ALTER TABLE public.business_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_contracts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_contracts FROM PUBLIC,antares_team_runtime;
CREATE OR REPLACE FUNCTION public.antares_register_contract(
 p_subject text,p_org uuid,p_proposal uuid,p_mode text,p_terms text,p_confirm boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.team_members
 WHERE organization_id=p_org AND auth_subject=p_subject AND active AND role='owner')
 THEN RAISE EXCEPTION 'Proprietario nao autorizado';END IF;
 IF p_mode NOT IN ('written','verbal','whatsapp')
 OR length(btrim(coalesce(p_terms,''))) NOT BETWEEN 8 AND 4000
 THEN RAISE EXCEPTION 'Contrato invalido';END IF;
 IF NOT EXISTS (SELECT 1 FROM public.business_proposals
 WHERE organization_id=p_org AND id=p_proposal AND status='accepted')
 THEN RAISE EXCEPTION 'Proposta nao aprovada';END IF;
 INSERT INTO public.business_contracts(organization_id,proposal_id,confirmation_mode,status,confirmed_at,terms)
 VALUES(p_org,p_proposal,p_mode,CASE WHEN p_confirm THEN 'confirmed' ELSE 'pending' END,
 CASE WHEN p_confirm THEN now() ELSE NULL END,btrim(p_terms))
 RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,CASE WHEN p_confirm THEN 'contract_confirmed' ELSE 'contract_drafted' END,'contract',v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.antares_register_contract(text,uuid,uuid,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_register_contract(text,uuid,uuid,text,text,boolean) TO antares_team_runtime;
COMMIT;
SELECT to_regclass('public.business_contracts') IS NOT NULL AS contratos_instalados,
 to_regprocedure('public.antares_register_contract(text,uuid,uuid,text,text,boolean)') IS NOT NULL AS funcao_instalada;
