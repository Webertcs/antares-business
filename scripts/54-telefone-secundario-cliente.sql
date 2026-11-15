-- ANTARES CRM: telefone secundário opcional, sem alterar a função original.
-- Executar no Neon SQL Editor com o proprietário do esquema, após backup.
BEGIN;
ALTER TABLE public.crm_clients
  ADD COLUMN IF NOT EXISTS phone_secondary text;
ALTER TABLE public.crm_clients
  DROP CONSTRAINT IF EXISTS crm_clients_phone_secondary_length;
ALTER TABLE public.crm_clients
  ADD CONSTRAINT crm_clients_phone_secondary_length
  CHECK (phone_secondary IS NULL OR length(phone_secondary) <= 40);

CREATE OR REPLACE FUNCTION public.crm_save_client_with_secondary(
  p_subject text, p_id uuid, p_kind text, p_name text, p_email text,
  p_phone text, p_city text, p_notes text, p_status text, p_phone_secondary text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid; v_org uuid;
BEGIN
 IF length(coalesce(p_phone_secondary,'')) > 40
 THEN RAISE EXCEPTION 'Telefone secundario invalido'; END IF;
 -- A função original faz todas as validações e o controle de propriedade.
 v_id := public.crm_save_client(
   p_subject,p_id,p_kind,p_name,p_email,p_phone,p_city,p_notes,p_status
 );
 SELECT organization_id INTO STRICT v_org
 FROM public.team_members
 WHERE auth_subject=p_subject AND active AND role='owner';
 UPDATE public.crm_clients
 SET phone_secondary=nullif(btrim(p_phone_secondary),'')
 WHERE id=v_id AND organization_id=v_org;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cliente nao encontrado nesta organizacao'; END IF;
 RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.crm_save_client_with_secondary(
 text,uuid,text,text,text,text,text,text,text,text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_save_client_with_secondary(
 text,uuid,text,text,text,text,text,text,text,text
) TO antares_team_runtime;
COMMIT;

-- Verificação somente leitura:
SELECT
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
 AND table_name='crm_clients' AND column_name='phone_secondary') AS coluna_criada,
 has_function_privilege('antares_team_runtime',
 'public.crm_save_client_with_secondary(text,uuid,text,text,text,text,text,text,text,text)',
 'EXECUTE') AS runtime_autorizado,
 NOT EXISTS(
 SELECT 1 FROM pg_proc p, LATERAL aclexplode(
 coalesce(p.proacl,acldefault('f',p.proowner))) a
 WHERE p.oid='public.crm_save_client_with_secondary(text,uuid,text,text,text,text,text,text,text,text)'::regprocedure
 AND a.grantee=0 AND a.privilege_type='EXECUTE'
 ) AS publico_bloqueado;
