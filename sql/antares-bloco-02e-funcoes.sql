-- ANTARES · Bloco 02E — funções de modelos de checklist.
-- REVISÃO OBRIGATÓRIA antes de executar. No Neon, executar cada CREATE FUNCTION
-- como instrução INTEIRA, depois os REVOKE/GRANT separadamente.
-- A API deve fornecer p_subject a partir da sessão autenticada (nunca do navegador).
-- Não habilitar a interface de escrita antes de testar as permissões.

CREATE OR REPLACE FUNCTION public.antares_save_checklist_template(
  p_subject text, p_organization uuid, p_template uuid, p_name text, p_items text[]
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $antares_template$
DECLARE v_id uuid; v_label text; v_position integer := 0;
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.team_members m
   WHERE m.organization_id=p_organization AND m.auth_subject=p_subject
     AND m.active=true AND m.role='owner'
 ) THEN RAISE EXCEPTION 'Operação não autorizada'; END IF;
 IF length(trim(coalesce(p_name,''))) NOT BETWEEN 1 AND 120
   OR p_items IS NULL OR cardinality(p_items)>100
   OR EXISTS (SELECT 1 FROM unnest(p_items) AS item
              WHERE length(trim(coalesce(item,''))) NOT BETWEEN 1 AND 180)
   OR (SELECT count(DISTINCT lower(trim(item))) FROM unnest(p_items) AS item)
      <> cardinality(p_items)
 THEN RAISE EXCEPTION 'Modelo ou tarefas inválidos'; END IF;
 IF p_template IS NULL THEN
   INSERT INTO public.antares_checklist_templates(organization_id,name)
   VALUES(p_organization,trim(p_name)) RETURNING id INTO v_id;
 ELSE
   UPDATE public.antares_checklist_templates SET name=trim(p_name),updated_at=now()
   WHERE id=p_template AND organization_id=p_organization RETURNING id INTO v_id;
   IF v_id IS NULL THEN RAISE EXCEPTION 'Modelo não encontrado'; END IF;
   DELETE FROM public.antares_checklist_template_items
   WHERE template_id=v_id AND organization_id=p_organization;
 END IF;
 FOREACH v_label IN ARRAY p_items LOOP
   INSERT INTO public.antares_checklist_template_items(organization_id,template_id,label,position)
   VALUES(p_organization,v_id,trim(v_label),v_position);
   v_position:=v_position+1;
 END LOOP;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_organization,p_subject,'checklist_template_saved','checklist_template',v_id);
 RETURN v_id;
END;
$antares_template$;

CREATE OR REPLACE FUNCTION public.antares_apply_checklist_template(
  p_subject text, p_event uuid, p_template uuid
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $antares_apply$
DECLARE v_org uuid; v_count integer;
BEGIN
 SELECT e.organization_id INTO v_org FROM public.crm_events e WHERE e.id=p_event;
 IF v_org IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.team_members m
   WHERE m.organization_id=v_org AND m.auth_subject=p_subject
     AND m.active=true AND m.role='owner'
 ) THEN RAISE EXCEPTION 'Operação não autorizada'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.antares_checklist_templates t
   WHERE t.id=p_template AND t.organization_id=v_org
 ) THEN RAISE EXCEPTION 'Modelo não encontrado'; END IF;
 -- Serializa aplicações simultâneas para o mesmo evento.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_event::text, 572901));
 INSERT INTO public.antares_event_checklist(event_id,organization_id,label,done)
 SELECT p_event,v_org,i.label,false
 FROM public.antares_checklist_template_items i
 WHERE i.template_id=p_template AND i.organization_id=v_org
   AND NOT EXISTS (
     SELECT 1 FROM public.antares_event_checklist c
     WHERE c.event_id=p_event AND c.organization_id=v_org
       AND lower(trim(c.label))=lower(trim(i.label))
   );
 GET DIAGNOSTICS v_count=ROW_COUNT;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'checklist_template_applied','crm_event',p_event);
 RETURN v_count;
END;
$antares_apply$;

REVOKE ALL ON FUNCTION public.antares_save_checklist_template(text,uuid,uuid,text,text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_apply_checklist_template(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_save_checklist_template(text,uuid,uuid,text,text[]) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_apply_checklist_template(text,uuid,uuid) TO antares_team_runtime;
