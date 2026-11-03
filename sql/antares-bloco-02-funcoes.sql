-- ANTARES Bloco 02: rotinas de escrita operacional.
-- REVISAR APÓS BACKUP e após a criação das tabelas em antares-bloco-02-operacao.sql.
-- Executar como proprietário das tabelas. Nenhum GRANT amplo.
-- REVISÃO PENDENTE: verificar auditoria e autenticação do ator antes de executar.
-- O parâmetro p_subject é fornecido pela API e não comprova identidade no banco.
-- BLOQUEADO: a identidade da role runtime e os privilégios de leitura devem ser verificados no Neon.
-- O argumento p_subject é informado pela aplicação; somente uma role sem acesso SQL arbitrário pode executar estas funções.
-- Não aplicar este arquivo até confirmar role, permissões, isolamento e auditoria.
BEGIN;
CREATE OR REPLACE FUNCTION public.antares_save_event_operation(
  p_subject text,p_event uuid,p_access text,p_parking text,p_power text,p_setup text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;
BEGIN
 SELECT e.organization_id INTO v_org FROM public.crm_events e WHERE e.id=p_event;
 IF v_org IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.team_members m WHERE m.organization_id=v_org
   AND m.auth_subject=p_subject AND m.active=true AND m.role='owner'
 ) THEN RAISE EXCEPTION 'Operação não autorizada'; END IF;
 IF length(coalesce(p_access,''))>2000 OR length(coalesce(p_parking,''))>2000
 OR length(coalesce(p_power,''))>2000 OR length(coalesce(p_setup,''))>4000
 THEN RAISE EXCEPTION 'Texto acima do limite'; END IF;
 INSERT INTO public.antares_event_operations(event_id,organization_id,access_instructions,parking_instructions,power_requirements,setup_notes)
 VALUES(p_event,v_org,p_access,p_parking,p_power,p_setup)
 ON CONFLICT(event_id) DO UPDATE SET access_instructions=excluded.access_instructions,
 parking_instructions=excluded.parking_instructions,power_requirements=excluded.power_requirements,
 setup_notes=excluded.setup_notes,updated_at=now();
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'event_operation_saved','crm_event',p_event);
END $;
CREATE OR REPLACE FUNCTION public.antares_save_event_task(
 p_subject text,p_event uuid,p_task uuid,p_label text,p_done boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT e.organization_id INTO v_org FROM public.crm_events e WHERE e.id=p_event;
 IF v_org IS NULL OR NOT EXISTS(SELECT 1 FROM public.team_members m WHERE m.organization_id=v_org
 AND m.auth_subject=p_subject AND m.active=true AND m.role='owner')
 THEN RAISE EXCEPTION 'Operação não autorizada'; END IF;
 IF length(trim(coalesce(p_label,''))) NOT BETWEEN 1 AND 180 THEN RAISE EXCEPTION 'Tarefa inválida'; END IF;
 IF p_task IS NULL THEN
 INSERT INTO public.antares_event_checklist(event_id,organization_id,label,done,completed_at)
 VALUES(p_event,v_org,trim(p_label),coalesce(p_done,false),CASE WHEN p_done THEN now() ELSE NULL END) RETURNING id INTO v_id;
 ELSE
 UPDATE public.antares_event_checklist SET label=trim(p_label),done=coalesce(p_done,false),
 completed_at=CASE WHEN p_done THEN coalesce(completed_at,now()) ELSE NULL END
 WHERE id=p_task AND event_id=p_event AND organization_id=v_org RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
 END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'event_task_saved','event_checklist',v_id);
 RETURN v_id;
END $;
CREATE OR REPLACE FUNCTION public.antares_save_event_session(
 p_subject text,p_event uuid,p_session uuid,p_label text,p_start time,p_end time,p_students integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_id uuid;
BEGIN
 SELECT e.organization_id INTO v_org FROM public.crm_events e WHERE e.id=p_event;
 IF v_org IS NULL OR NOT EXISTS(SELECT 1 FROM public.team_members m WHERE m.organization_id=v_org
 AND m.auth_subject=p_subject AND m.active=true AND m.role='owner')
 THEN RAISE EXCEPTION 'Operação não autorizada'; END IF;
 IF length(trim(coalesce(p_label,''))) NOT BETWEEN 1 AND 160
 OR (p_start IS NOT NULL AND p_end IS NOT NULL AND p_end<=p_start)
 OR (p_students IS NOT NULL AND (p_students<0 OR p_students>10000))
 THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
 IF p_session IS NULL THEN
 INSERT INTO public.antares_event_sessions(event_id,organization_id,label,starts_at,ends_at,expected_students)
 VALUES(p_event,v_org,trim(p_label),p_start,p_end,p_students) RETURNING id INTO v_id;
 ELSE
 UPDATE public.antares_event_sessions SET label=trim(p_label),starts_at=p_start,ends_at=p_end,expected_students=p_students
 WHERE id=p_session AND event_id=p_event AND organization_id=v_org RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Sessão não encontrada'; END IF;
 END IF;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(v_org,p_subject,'event_session_saved','event_session',v_id);
 RETURN v_id;
END $;
REVOKE ALL ON FUNCTION public.antares_save_event_operation(text,uuid,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_save_event_task(text,uuid,uuid,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_save_event_session(text,uuid,uuid,text,time,time,integer) FROM PUBLIC;
-- Liberar somente a role de runtime restrita usada por getTeamWriteDb.
GRANT EXECUTE ON FUNCTION public.antares_save_event_operation(text,uuid,text,text,text,text) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_save_event_task(text,uuid,uuid,text,boolean) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_save_event_session(text,uuid,uuid,text,time,time,integer) TO antares_team_runtime;
COMMIT;
