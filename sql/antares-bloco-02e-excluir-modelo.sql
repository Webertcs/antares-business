-- ANTARES 02E: exclusão controlada de modelo de checklist.
-- Executar CREATE FUNCTION inteiro no Neon, depois REVOKE/GRANT.
-- Não remove tarefas já aplicadas em eventos.
CREATE OR REPLACE FUNCTION public.antares_delete_checklist_template(
 p_subject text, p_organization uuid, p_template uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $antares_delete_template$
DECLARE v_deleted uuid;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.team_members m
  WHERE m.organization_id=p_organization AND m.auth_subject=p_subject
   AND m.active=true AND m.role='owner'
 ) THEN RAISE EXCEPTION 'Operação não autorizada'; END IF;
 IF p_template IS NULL THEN RAISE EXCEPTION 'Modelo inválido'; END IF;
 -- Bloqueia o modelo durante a exclusão; os itens têm FK para o modelo.
 PERFORM 1 FROM public.antares_checklist_templates t
 WHERE t.id=p_template AND t.organization_id=p_organization FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Modelo não encontrado'; END IF;
 DELETE FROM public.antares_checklist_template_items
 WHERE template_id=p_template AND organization_id=p_organization;
 DELETE FROM public.antares_checklist_templates
 WHERE id=p_template AND organization_id=p_organization RETURNING id INTO v_deleted;
 IF v_deleted IS NULL THEN RAISE EXCEPTION 'Modelo não encontrado'; END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_organization,p_subject,'checklist_template_deleted','checklist_template',v_deleted);
 RETURN true;
END;
$antares_delete_template$;

REVOKE ALL ON FUNCTION public.antares_delete_checklist_template(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_delete_checklist_template(text,uuid,uuid) TO antares_team_runtime;
