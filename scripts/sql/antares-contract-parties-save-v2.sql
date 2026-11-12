-- ANTARES CRM — Etapa 3B: função v2 de identificação contratual.
-- Pré-requisito: sete colunas da etapa 3 já adicionadas.
-- Preserva a função original de oito argumentos.
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_save_contract_draft_v2(
 p_actor text, p_contract_id uuid, p_draft_id uuid,
 p_title text, p_institution text, p_responsible text,
 p_object text, p_terms text,
 p_contractor_legal_name text, p_contractor_document text,
 p_contractor_address text, p_provider_legal_name text,
 p_provider_document text, p_provider_address text,
 p_provider_representative text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
 v_org uuid;
 v_draft uuid;
 v_version integer;
BEGIN
 SELECT tm.organization_id INTO STRICT v_org
 FROM public.team_members tm
 WHERE tm.auth_subject=p_actor AND tm.active=true AND tm.role='owner';

 IF NOT EXISTS (
 SELECT 1 FROM public.business_contracts bc
 JOIN public.business_proposals bp ON bp.id=bc.proposal_id AND bp.organization_id=bc.organization_id
 WHERE bc.id=p_contract_id AND bc.organization_id=v_org
 AND bp.client_id IN (SELECT cc.id FROM public.crm_clients cc WHERE cc.organization_id=v_org)
 ) THEN RAISE EXCEPTION 'Contrato não autorizado'; END IF;

 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 200
 OR length(btrim(coalesce(p_institution,''))) NOT BETWEEN 2 AND 200
 OR length(coalesce(p_responsible,''))>180
 OR length(coalesce(p_object,''))>8000
 OR length(coalesce(p_terms,''))>16000
 OR length(coalesce(p_contractor_legal_name,''))>240
 OR length(coalesce(p_contractor_document,''))>30
 OR length(coalesce(p_contractor_address,''))>500
 OR length(coalesce(p_provider_legal_name,''))>240
 OR length(coalesce(p_provider_document,''))>30
 OR length(coalesce(p_provider_address,''))>500
 OR length(coalesce(p_provider_representative,''))>180
 THEN RAISE EXCEPTION 'Dados da minuta inválidos'; END IF;

 IF p_draft_id IS NULL THEN
 INSERT INTO public.antares_contract_drafts(
 organization_id,contract_id,title,institution,responsible,object_text,terms,version_number,
 contractor_legal_name,contractor_document,contractor_address,
 provider_legal_name,provider_document,provider_address,provider_representative)
 VALUES (
 v_org,p_contract_id,btrim(p_title),btrim(p_institution),coalesce(p_responsible,''),
 coalesce(p_object,''),coalesce(p_terms,''),1,
 coalesce(p_contractor_legal_name,''),coalesce(p_contractor_document,''),coalesce(p_contractor_address,''),
 coalesce(p_provider_legal_name,''),coalesce(p_provider_document,''),coalesce(p_provider_address,''),
 coalesce(p_provider_representative,''))
 RETURNING id INTO v_draft;
 v_version:=1;
 ELSE
 SELECT version_number INTO STRICT v_version FROM public.antares_contract_drafts
 WHERE id=p_draft_id AND organization_id=v_org AND contract_id=p_contract_id
 AND archived_at IS NULL AND deleted_at IS NULL FOR UPDATE;
 v_version:=v_version+1;
 v_draft:=p_draft_id;
 UPDATE public.antares_contract_drafts
 SET title=btrim(p_title),institution=btrim(p_institution),responsible=coalesce(p_responsible,''),
 object_text=coalesce(p_object,''),terms=coalesce(p_terms,''),version_number=v_version,
 contractor_legal_name=coalesce(p_contractor_legal_name,''),
 contractor_document=coalesce(p_contractor_document,''),
 contractor_address=coalesce(p_contractor_address,''),
 provider_legal_name=coalesce(p_provider_legal_name,''),
 provider_document=coalesce(p_provider_document,''),
 provider_address=coalesce(p_provider_address,''),
 provider_representative=coalesce(p_provider_representative,''),
 updated_at=now()
 WHERE id=v_draft;
 END IF;

 INSERT INTO public.antares_contract_draft_versions(draft_id,organization_id,version_number,document_data)
 VALUES(v_draft,v_org,v_version,jsonb_build_object(
 'title',btrim(p_title),'institution',btrim(p_institution),
 'responsible',coalesce(p_responsible,''),'object',coalesce(p_object,''),'terms',coalesce(p_terms,''),
 'contractor_legal_name',coalesce(p_contractor_legal_name,''),
 'contractor_document',coalesce(p_contractor_document,''),
 'contractor_address',coalesce(p_contractor_address,''),
 'provider_legal_name',coalesce(p_provider_legal_name,''),
 'provider_document',coalesce(p_provider_document,''),
 'provider_address',coalesce(p_provider_address,''),
 'provider_representative',coalesce(p_provider_representative,'')
 ));
 RETURN v_draft;
EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
 RAISE EXCEPTION 'Usuário ou minuta não autorizado';
END;
$function$;
REVOKE ALL ON FUNCTION public.antares_save_contract_draft_v2(text,uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
-- Não conceder EXECUTE até confirmar papel e permissões no Neon.
COMMIT;
