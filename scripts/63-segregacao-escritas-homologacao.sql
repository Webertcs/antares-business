-- ANTARES 63 | Proposta de segregação das duas escritas legadas.
-- NÃO executar em produção. Somente na branch Neon de homologação,
-- depois de snapshot e revisão do esquema. Transação: erros fazem rollback.
-- NÃO cria/atualiza clientes, eventos ou contratos existentes.
-- Este arquivo cria funções e GRANT EXECUTE; a aplicação mantém flags FALSE.
BEGIN;

DO $preflight$
BEGIN
 IF current_user <> 'neondb_owner' THEN
  RAISE EXCEPTION 'Instalar apenas como neondb_owner na branch de homologacao';
 END IF;
 IF to_regclass('public.team_members') IS NULL OR
    to_regclass('public.crm_events') IS NULL OR
    to_regclass('public.antares_presentation_event_links') IS NULL OR
    to_regclass('public.antares_domes') IS NULL OR
    to_regclass('public.crm_clients') IS NULL OR
    to_regclass('public.antares_legal_profiles') IS NULL THEN
  RAISE EXCEPTION 'Schema esperado ausente. Nenhuma alteracao';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_roles
  WHERE rolname='antares_team_runtime' AND rolcanlogin
    AND NOT rolsuper AND NOT rolbypassrls
 ) THEN
  RAISE EXCEPTION 'Role runtime ausente ou privilegiada';
 END IF;
 IF has_table_privilege('antares_team_runtime','public.crm_events','UPDATE') OR
    has_table_privilege('antares_team_runtime','public.antares_legal_profiles','INSERT') OR
    has_table_privilege('antares_team_runtime','public.antares_legal_profiles','UPDATE') THEN
  RAISE EXCEPTION 'Role runtime tem DML direto. Revisar privilegios antes';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_class
  WHERE oid='public.crm_events'::regclass AND relrowsecurity
 ) OR NOT EXISTS (
  SELECT 1 FROM pg_class
  WHERE oid='public.antares_legal_profiles'::regclass AND relrowsecurity
 ) THEN
  RAISE EXCEPTION 'RLS obrigatorio nao habilitado em tabela sensivel';
 END IF;
END
$preflight$;

-- Apenas evento NÃO vinculado à reserva; a validação e a escrita são
-- feitas pelo banco na mesma chamada, sem UPDATE direto pelo runtime.
CREATE FUNCTION public.antares_update_unlinked_event_schedule(
 p_subject text, p_org uuid, p_event uuid, p_start text, p_end text, p_dome uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE v_event jsonb;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.team_members
  WHERE organization_id=p_org AND auth_subject=p_subject
    AND active AND role='owner'
 ) THEN RAISE EXCEPTION 'Proprietario nao autorizado'; END IF;

 IF (p_start IS NOT NULL AND p_start !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$')
 OR (p_end IS NOT NULL AND p_end !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$')
 OR (p_start IS NOT NULL AND p_end IS NOT NULL AND p_end <= p_start)
 THEN RAISE EXCEPTION 'Horario invalido'; END IF;

 -- Bloqueia a linha-alvo enquanto inspeciona vinculos e cupulas.
 PERFORM 1 FROM public.crm_events e
 WHERE e.id=p_event AND e.organization_id=p_org FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;

 IF EXISTS (
  SELECT 1 FROM public.antares_presentation_event_links l
  WHERE l.organization_id=p_org AND l.event_id=p_event
 ) THEN RETURN jsonb_build_object('status','linked'); END IF;

 IF p_dome IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.antares_domes d
  WHERE d.organization_id=p_org AND d.id=p_dome AND d.active
 ) THEN RETURN jsonb_build_object('status','dome'); END IF;

 UPDATE public.crm_events e
 SET start_time=p_start::time, end_time=p_end::time, dome_id=p_dome
 WHERE e.organization_id=p_org AND e.id=p_event
   AND NOT EXISTS(
    SELECT 1 FROM public.antares_presentation_event_links l
    WHERE l.organization_id=e.organization_id AND l.event_id=e.id
   )
 RETURNING jsonb_build_object(
   'id',e.id,'start_time',e.start_time,'end_time',e.end_time,'dome_id',e.dome_id
 ) INTO v_event;
 IF v_event IS NULL THEN RETURN jsonb_build_object('status','linked'); END IF;
 RETURN jsonb_build_object('status','ok','event',v_event);
END
$function$;

-- O prestador e o contratante continuam no mesmo fluxo, mas só a função
-- definer pode realizar o UPSERT, com verificação de organização e owner.
CREATE FUNCTION public.antares_save_legal_profile(
 p_subject text, p_org uuid, p_kind text, p_client uuid,
 p_name text, p_document text, p_address text, p_representative text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.team_members
  WHERE organization_id=p_org AND auth_subject=p_subject
    AND active AND role='owner'
 ) THEN RAISE EXCEPTION 'Proprietario nao autorizado'; END IF;
 IF p_kind NOT IN ('provider','contractor')
    OR p_client IS NULL
    OR p_name IS NULL OR length(p_name)>240
    OR p_document IS NULL OR length(p_document)>30
    OR p_address IS NULL OR length(p_address)>500
    OR p_representative IS NULL OR length(p_representative)>180
 THEN RAISE EXCEPTION 'Dados juridicos invalidos'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.crm_clients
  WHERE organization_id=p_org AND id=p_client
 ) THEN RETURN NULL; END IF;

 IF p_kind='provider' THEN
  INSERT INTO public.antares_legal_profiles(
    organization_id,client_id,legal_name,document_number,full_address,representative
  ) VALUES (
    p_org,NULL,btrim(p_name),btrim(p_document),btrim(p_address),btrim(p_representative)
  )
  ON CONFLICT (organization_id) WHERE client_id IS NULL DO UPDATE SET
    legal_name=excluded.legal_name,
    document_number=excluded.document_number,
    full_address=excluded.full_address,
    representative=excluded.representative,
    updated_at=now()
  RETURNING id INTO v_id;
 ELSE
  INSERT INTO public.antares_legal_profiles(
    organization_id,client_id,legal_name,document_number,full_address,representative
  ) VALUES (
    p_org,p_client,btrim(p_name),btrim(p_document),btrim(p_address),btrim(p_representative)
  )
  ON CONFLICT (organization_id,client_id) WHERE client_id IS NOT NULL DO UPDATE SET
    legal_name=excluded.legal_name,
    document_number=excluded.document_number,
    full_address=excluded.full_address,
    representative=excluded.representative,
    updated_at=now()
  RETURNING id INTO v_id;
 END IF;
 RETURN v_id;
END
$function$;

REVOKE ALL ON FUNCTION
 public.antares_update_unlinked_event_schedule(text,uuid,uuid,text,text,uuid)
 FROM PUBLIC;
REVOKE ALL ON FUNCTION
 public.antares_save_legal_profile(text,uuid,text,uuid,text,text,text,text)
 FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
 public.antares_update_unlinked_event_schedule(text,uuid,uuid,text,text,uuid)
 TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION
 public.antares_save_legal_profile(text,uuid,text,uuid,text,text,text,text)
 TO antares_team_runtime;
COMMIT;

-- Verificação posterior (SOMENTE leitura, sem chamadas de gravação):
-- SELECT p.proname, p.prosecdef, pg_get_userbyid(p.proowner) AS dono
-- FROM pg_proc p WHERE p.oid IN (
--   'public.antares_update_unlinked_event_schedule(text,uuid,uuid,text,text,uuid)'::regprocedure,
--   'public.antares_save_legal_profile(text,uuid,text,uuid,text,text,text,text)'::regprocedure
-- );
