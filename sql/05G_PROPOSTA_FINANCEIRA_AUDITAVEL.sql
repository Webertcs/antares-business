-- BLOCO 05G - edicao financeira auditavel, apenas rascunhos
BEGIN;
CREATE TABLE IF NOT EXISTS public.business_proposal_changes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 proposal_id uuid NOT NULL,
 actor_subject text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 before_values jsonb NOT NULL,
 after_values jsonb NOT NULL,
 FOREIGN KEY(proposal_id,organization_id) REFERENCES public.business_proposals(id,organization_id)
);
ALTER TABLE public.business_proposal_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_proposal_changes FROM PUBLIC,antares_team_runtime;
CREATE OR REPLACE FUNCTION public.business_update_draft_prices(
 p_subject text,p_id uuid,p_model text,p_attendees integer,
 p_unit numeric,p_fixed numeric,p_discount numeric,p_deposit numeric)
RETURNS TABLE(total numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid;v_old public.business_proposals%ROWTYPE;v_new public.business_proposals%ROWTYPE;
v_total numeric;
BEGIN
 SELECT tm.organization_id INTO STRICT v_org FROM public.team_members tm
 WHERE tm.auth_subject=p_subject AND tm.active=true AND tm.role='owner';
 SELECT * INTO v_old FROM public.business_proposals
 WHERE id=p_id AND organization_id=v_org FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposta nao encontrada';END IF;
 IF v_old.status<>'draft' THEN RAISE EXCEPTION 'Somente rascunhos podem ser editados';END IF;
 IF p_model NOT IN ('per_student','fixed','complimentary') OR
    p_attendees IS NULL OR p_attendees<0 OR p_attendees>100000 OR
    p_unit IS NULL OR p_fixed IS NULL OR p_discount IS NULL OR p_deposit IS NULL OR
    p_unit<0 OR p_fixed<0 OR p_discount<0 OR p_deposit<0 OR
    p_unit>10000000 OR p_fixed>10000000 OR p_discount>10000000 OR p_deposit>10000000
 THEN RAISE EXCEPTION 'Valores fora dos limites';END IF;
 v_total:=CASE WHEN p_model='per_student' THEN p_attendees*p_unit
 WHEN p_model='fixed' THEN p_fixed ELSE 0 END;
 IF p_discount>v_total OR p_deposit>(v_total-p_discount)
 THEN RAISE EXCEPTION 'Desconto ou sinal maior que o total';END IF;
 UPDATE public.business_proposals
 SET pricing_model=p_model,expected_attendees=p_attendees,unit_price=p_unit,
 fixed_price=p_fixed,discount=p_discount,deposit=p_deposit
 WHERE id=p_id AND organization_id=v_org RETURNING * INTO v_new;
 IF (v_old.pricing_model,v_old.expected_attendees,v_old.unit_price,v_old.fixed_price,v_old.discount,v_old.deposit)
 IS DISTINCT FROM
 (v_new.pricing_model,v_new.expected_attendees,v_new.unit_price,v_new.fixed_price,v_new.discount,v_new.deposit)
 THEN
 INSERT INTO public.business_proposal_changes(organization_id,proposal_id,actor_subject,before_values,after_values)
 VALUES(v_org,p_id,p_subject,to_jsonb(v_old),to_jsonb(v_new));
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'draft_prices_updated','proposal',p_id);
 END IF;
 RETURN QUERY SELECT v_new.total;
END $$;
REVOKE ALL ON FUNCTION public.business_update_draft_prices(text,uuid,text,integer,numeric,numeric,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_update_draft_prices(text,uuid,text,integer,numeric,numeric,numeric,numeric) TO antares_team_runtime;
COMMIT;
