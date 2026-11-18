-- ANTARES 15B | TESTE nao persistente: executar INTEIRO no Neon SQL Editor
-- ANTARES 15B | Reserva simples: lotacao por sessao, nao por evento.
-- Aplicar APENAS apos homologacao. Nao altera as reservas existentes.
-- Atualiza somente funcoes de reserva, sem modificar tabelas financeiras,
-- horarios das apresentacoes, agendas ja registradas nem dados de propostas.
BEGIN;

DO $guard$
BEGIN
 IF to_regprocedure('public.antares_book_and_link_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)') IS NULL
 OR to_regprocedure('public.antares_prepare_proposal_client(text,uuid,uuid)') IS NULL
 OR to_regprocedure('public.antares_manage_proposal_reservation(text,uuid,uuid,text,uuid,timestamptz,timestamptz,text)') IS NULL
 THEN RAISE EXCEPTION 'Versoes 14F e 15A requeridas'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.antares_book_proposal(
 p_subject text,p_org uuid,p_proposal uuid,p_dome uuid,p_start timestamptz,p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_client uuid;v_legacy uuid;v_equipment uuid;v_presentation uuid;v_title text;v_students integer;v_capacity integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject AND organization_id=p_org AND active AND role='owner')
 THEN RAISE EXCEPTION 'Acesso negado';END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_start<=now() OR p_end<=p_start OR p_end>p_start+interval '24 hours'
 THEN RAISE EXCEPTION 'Periodo invalido';END IF;
 SELECT client_id,title,expected_attendees INTO v_client,v_title,v_students
 FROM public.business_proposals WHERE organization_id=p_org AND id=p_proposal AND status='accepted';
 IF v_client IS NULL THEN RAISE EXCEPTION 'Proposta nao aprovada';END IF;
 SELECT operational_client_id INTO v_legacy FROM public.antares_client_links
 WHERE organization_id=p_org AND crm_client_id=v_client;
 IF v_legacy IS NULL THEN RAISE EXCEPTION 'Cliente sem vinculo operacional';END IF;
 SELECT l.equipment_id,d.capacity INTO v_equipment,v_capacity
 FROM public.antares_dome_links l JOIN public.antares_domes d
 ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
 JOIN public.equipment e ON e.id=l.equipment_id AND e.organization_id=l.organization_id
 WHERE l.organization_id=p_org AND l.antares_dome_id=p_dome AND d.active AND e.active AND e.category='dome';
 IF v_equipment IS NULL THEN RAISE EXCEPTION 'Cupula nao vinculada ou inativa';END IF;
 -- O total contratado pode envolver varias sessoes; lotacao pertence a cada sessao.
 -- Preserva o total em business_proposals e registra na apresentacao
 -- o maximo previsto para uma sessao, sem exceder a capacidade da cupula.
 IF EXISTS(SELECT 1 FROM public.antares_proposal_reservations
 WHERE organization_id=p_org AND proposal_id=p_proposal)
 THEN RAISE EXCEPTION 'Proposta ja possui reserva';END IF;
 INSERT INTO public.presentations(organization_id,client_id,dome_id,dome_category,title,starts_at,ends_at,status,expected_students)
 VALUES(p_org,v_legacy,v_equipment,'dome',v_title,p_start,p_end,'reserved',
 CASE WHEN v_students IS NOT NULL AND v_students>0 THEN LEAST(v_students,COALESCE(v_capacity,v_students)) ELSE NULL END)
 RETURNING id INTO v_presentation;
 INSERT INTO public.antares_proposal_reservations(organization_id,proposal_id,presentation_id)
 VALUES(p_org,p_proposal,v_presentation);
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'proposal_presentation_reserved','presentation',v_presentation);
 RETURN v_presentation;
END $$;

CREATE OR REPLACE FUNCTION public.antares_manage_proposal_reservation(
 p_subject text,p_org uuid,p_presentation uuid,p_action text,
 p_dome uuid,p_start timestamptz,p_end timestamptz,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE
 v_status text;v_event uuid;v_event_status text;v_old_start timestamptz;
 v_old_end timestamptz;v_old_equipment uuid;v_old_dome uuid;
 v_new_equipment uuid;v_capacity integer;v_expected integer;
 BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject
      AND organization_id=p_org AND active AND role='owner')
 THEN RAISE EXCEPTION 'Proprietario nao autorizado';END IF;
 IF p_action IS NULL OR p_action NOT IN ('cancel','edit') OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500
 THEN RAISE EXCEPTION 'Acao ou motivo invalido';END IF;

 SELECT p.status,p.starts_at,p.ends_at,p.dome_id,b.expected_attendees
 INTO v_status,v_old_start,v_old_end,v_old_equipment,v_expected
 FROM public.antares_proposal_reservations r
 JOIN public.presentations p ON p.id=r.presentation_id AND p.organization_id=r.organization_id
 JOIN public.business_proposals b ON b.id=r.proposal_id AND b.organization_id=r.organization_id
 WHERE r.organization_id=p_org AND r.presentation_id=p_presentation
 FOR UPDATE OF r,p,b;
 IF v_status IS NULL THEN RAISE EXCEPTION 'Reserva nao encontrada';END IF;
 IF v_status IN ('cancelled','canceled','completed') THEN
  RAISE EXCEPTION 'Reserva ja encerrada';END IF;
 SELECT l.antares_dome_id INTO v_old_dome FROM public.antares_dome_links l
 WHERE l.organization_id=p_org AND l.equipment_id=v_old_equipment;
 SELECT event_id INTO v_event FROM public.antares_presentation_event_links
 WHERE organization_id=p_org AND presentation_id=p_presentation;
 -- Antes de alterar a reserva, garante a existencia do evento operacional.
 -- Se algo falhar, cancela/reagenda NADA: a transacao inteira e revertida.
 IF v_event IS NULL THEN
  v_event:=public.antares_link_reservation_event(p_subject,p_org,p_presentation);
 END IF;
 IF v_event IS NOT NULL THEN
  SELECT status INTO v_event_status FROM public.crm_events
  WHERE organization_id=p_org AND id=v_event FOR UPDATE;
  IF v_event_status IS NULL OR v_event_status IN ('completed','cancelled','canceled')
  THEN RAISE EXCEPTION 'Evento ja encerrado ou inconsistente';END IF;
 END IF;

 IF p_action='cancel' THEN
  UPDATE public.presentations SET status='cancelled'
    WHERE id=p_presentation AND organization_id=p_org;
  IF v_event IS NOT NULL THEN
   UPDATE public.crm_events SET status='cancelled',archived_at=now(),cancellation_reason=btrim(p_reason)
    WHERE id=v_event AND organization_id=p_org;
  END IF;
  INSERT INTO public.antares_reservation_changes
   (organization_id,presentation_id,actor_subject,action,reason,
    old_start,old_end,old_dome_id)
  VALUES(p_org,p_presentation,p_subject,'cancelled',btrim(p_reason),
   v_old_start,v_old_end,v_old_dome);
  INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
  VALUES(p_org,p_subject,'proposal_presentation_cancelled','presentation',p_presentation);
  RETURN p_presentation;
 END IF;

 IF p_start IS NULL OR p_end IS NULL OR p_start<=now() OR
    p_end<=p_start OR p_end>p_start+interval '24 hours' THEN
  RAISE EXCEPTION 'Nova data invalida';END IF;
 SELECT l.equipment_id,d.capacity INTO v_new_equipment,v_capacity
 FROM public.antares_dome_links l JOIN public.antares_domes d
   ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
 JOIN public.equipment e ON e.id=l.equipment_id AND e.organization_id=l.organization_id
 WHERE l.organization_id=p_org AND l.antares_dome_id=p_dome
   AND d.active AND e.active AND e.category='dome';
 IF v_new_equipment IS NULL THEN RAISE EXCEPTION 'Cupula indisponivel';END IF;
 -- Publico total da proposta nao e lotacao de sessao.
 -- Continua obrigatorio selecionar cupula ativa e sem conflito de horarios.
 -- Serializa concorrentes na mesma cupula. Exclusion constraint 08 e a protecao final.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||v_new_equipment::text,0));
 IF EXISTS(SELECT 1 FROM public.presentations p
   WHERE p.organization_id=p_org AND p.dome_id=v_new_equipment AND p.id<>p_presentation
   AND p.status NOT IN ('cancelled','canceled','completed')
   AND p.starts_at<p_end AND p.ends_at>p_start)
 THEN RAISE EXCEPTION 'Horario indisponivel';END IF;

 UPDATE public.presentations SET dome_id=v_new_equipment,starts_at=p_start,ends_at=p_end,
   expected_students=CASE WHEN v_expected IS NOT NULL AND v_expected>0
    THEN LEAST(v_expected,COALESCE(v_capacity,v_expected)) ELSE NULL END
 WHERE id=p_presentation AND organization_id=p_org;
 IF v_event IS NOT NULL THEN
  UPDATE public.crm_events SET
   event_date=(p_start AT TIME ZONE 'America/Sao_Paulo')::date,
   start_time=(p_start AT TIME ZONE 'America/Sao_Paulo')::time,
   end_time=(p_end AT TIME ZONE 'America/Sao_Paulo')::time,
   dome_id=p_dome
  WHERE id=v_event AND organization_id=p_org;
 END IF;
 INSERT INTO public.antares_reservation_changes
  (organization_id,presentation_id,actor_subject,action,reason,
   old_start,old_end,new_start,new_end,old_dome_id,new_dome_id)
 VALUES(p_org,p_presentation,p_subject,'rescheduled',btrim(p_reason),
  v_old_start,v_old_end,p_start,p_end,v_old_dome,p_dome);
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'proposal_presentation_rescheduled','presentation',p_presentation);
 RETURN p_presentation;
END $fn$;


-- Uma unica acao: prepara cliente operacional, reserva e vincula evento.
-- O PostgreSQL reverte tudo se alguma etapa falhar.
CREATE OR REPLACE FUNCTION public.antares_book_ready_proposal(
 p_subject text,p_org uuid,p_proposal uuid,p_dome uuid,p_start timestamptz,p_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $fn$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members m WHERE m.organization_id=p_org
  AND m.auth_subject=p_subject AND m.active AND m.role='owner')
 THEN RAISE EXCEPTION 'Nao autorizado';END IF;
 PERFORM public.antares_prepare_proposal_client(p_subject,p_org,p_proposal);
 RETURN public.antares_book_and_link_proposal(p_subject,p_org,p_proposal,p_dome,p_start,p_end);
END $fn$;

REVOKE ALL ON FUNCTION public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz) TO antares_team_runtime;
DO $verify$
BEGIN
 IF current_user<>'neondb_owner' THEN RAISE EXCEPTION 'Conexao nao e de neondb_owner';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)')
   AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
   AND has_function_privilege('antares_team_runtime',p.oid,'EXECUTE')
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
    WHERE x.grantee=0 AND x.privilege_type='EXECUTE'))
 THEN RAISE EXCEPTION 'Permissoes da nova funcao incorretas';END IF;
END $verify$;
SELECT 'FUNCOES SIMULADAS; DESFAZENDO' AS etapa,
 count(*)::integer AS reservas FROM public.antares_proposal_reservations;
ROLLBACK;
SELECT CASE WHEN to_regprocedure('public.antares_book_ready_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)') IS NULL
 THEN 'ROLLBACK CONFIRMADO' ELSE 'VERIFICAR: funcao 15B ja existente' END AS resultado,
 (SELECT count(*) FROM public.antares_proposal_reservations) AS reservas;

