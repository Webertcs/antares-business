-- ANTARES 54D — confirmação auditável de contratos, sem confirmar registros existentes.
BEGIN;
ALTER TABLE public.business_contracts
 ADD COLUMN IF NOT EXISTS confirmed_by_subject text,
 ADD COLUMN IF NOT EXISTS confirmed_by_name text;
CREATE OR REPLACE FUNCTION public.antares_confirm_client_contract(
 p_subject text,p_contract uuid,p_responsible text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_status text;v_id uuid;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_subject AND active=true AND role='owner';
 IF length(btrim(coalesce(p_responsible,''))) NOT BETWEEN 3 AND 180 THEN
   RAISE EXCEPTION 'Responsavel invalido';
 END IF;
 SELECT status INTO STRICT v_status FROM public.business_contracts
 WHERE id=p_contract AND organization_id=v_org FOR UPDATE;
 IF v_status<>'pending' THEN RAISE EXCEPTION 'Contrato nao esta pendente'; END IF;
 UPDATE public.business_contracts SET status='confirmed',confirmed_at=now(),
 confirmed_by_subject=p_subject,confirmed_by_name=btrim(p_responsible)
 WHERE id=p_contract AND organization_id=v_org RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'client_contract_confirmed','business_contract',v_id);
 RETURN v_id;
END;$$;
REVOKE ALL ON FUNCTION public.antares_confirm_client_contract(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_confirm_client_contract(text,uuid,text) TO antares_team_runtime;
COMMIT;
