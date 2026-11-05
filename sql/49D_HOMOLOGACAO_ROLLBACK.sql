-- ANTARES 49D | Homologacao reversivel: nenhum registro permanente.
-- EXECUTAR APENAS APOS instalar 49D e confirmar snapshot da branch production.
-- BEGIN + ROLLBACK obrigatorios: nao retirar o ROLLBACK.
BEGIN;
DO $test$
DECLARE
  v_subject text; v_org uuid; v_dome uuid; v_equipment uuid; v_result text;
  v_client uuid; v_presentation uuid; v_blocked boolean:=false;
BEGIN
 SELECT auth_subject,organization_id INTO v_subject,v_org
 FROM public.team_members tm WHERE tm.active=true AND tm.role='owner'
  AND EXISTS(SELECT 1 FROM public.crm_clients c WHERE c.organization_id=tm.organization_id)
 LIMIT 1;
 IF v_subject IS NULL THEN RAISE EXCEPTION 'PENDENTE: proprietario autenticado nao encontrado'; END IF;

 v_dome:=public.antares_create_linked_dome(v_subject,v_org,'Cupula teste 49D','TMP-49D',30);
 SELECT equipment_id INTO v_equipment FROM public.antares_dome_links
 WHERE organization_id=v_org AND antares_dome_id=v_dome;
 IF v_dome IS NULL OR v_equipment IS NULL THEN RAISE EXCEPTION 'FALHOU: cupula nao vinculada'; END IF;
 RAISE NOTICE 'APROVADO: cúpula e equipamento criados na transacao';

 v_result:=public.antares_manage_linked_dome(v_subject,v_org,v_dome,'update','Cupula teste ajustada','TMP-49D-X',40);
 IF v_result<>'updated' OR NOT EXISTS(
  SELECT 1 FROM public.antares_domes WHERE id=v_dome AND organization_id=v_org
   AND name='Cupula teste ajustada' AND code='TMP-49D-X' AND capacity=40)
 THEN RAISE EXCEPTION 'FALHOU: edicao'; END IF;
 RAISE NOTICE 'APROVADO: edicao sincronizada';

 v_result:=public.antares_manage_linked_dome(v_subject,v_org,v_dome,'deactivate');
 IF v_result<>'deactivated' OR EXISTS(
   SELECT 1 FROM public.antares_domes WHERE id=v_dome AND organization_id=v_org AND active=true)
 THEN RAISE EXCEPTION 'FALHOU: desativacao'; END IF;
 RAISE NOTICE 'APROVADO: desativacao';

 v_result:=public.antares_manage_linked_dome(v_subject,v_org,v_dome,'activate');
 IF v_result<>'activated' OR NOT EXISTS(
   SELECT 1 FROM public.antares_domes WHERE id=v_dome AND organization_id=v_org AND active=true)
 THEN RAISE EXCEPTION 'FALHOU: reativacao'; END IF;
 RAISE NOTICE 'APROVADO: reativacao';

 -- Testa de verdade o bloqueio de exclusao com apresentacao vinculada.
 -- Todos os registros aqui existem somente dentro desta transacao com ROLLBACK.
 INSERT INTO public.clients(organization_id,name,kind)
 SELECT v_org,'Cliente temporario 49D',c.kind FROM public.crm_clients c
 WHERE c.organization_id=v_org LIMIT 1 RETURNING id INTO v_client;
 INSERT INTO public.presentations(organization_id,client_id,dome_id,title,starts_at,ends_at,status)
 VALUES(v_org,v_client,v_equipment,'Apresentacao temporaria 49D',
  '2031-05-12 10:00-03'::timestamptz,'2031-05-12 11:00-03'::timestamptz,'reserved')
 RETURNING id INTO v_presentation;
 BEGIN
  PERFORM public.antares_manage_linked_dome(v_subject,v_org,v_dome,'delete');
 EXCEPTION WHEN OTHERS THEN v_blocked:=true;
 END;
 IF NOT v_blocked OR NOT EXISTS(
  SELECT 1 FROM public.antares_domes WHERE id=v_dome AND organization_id=v_org)
 THEN RAISE EXCEPTION 'FALHOU: exclusao de cupula com apresentacao foi permitida'; END IF;
 RAISE NOTICE 'APROVADO: exclusao bloqueada quando existe apresentacao';
 DELETE FROM public.presentations WHERE organization_id=v_org AND id=v_presentation;
 DELETE FROM public.clients WHERE organization_id=v_org AND id=v_client;
 v_result:=public.antares_manage_linked_dome(v_subject,v_org,v_dome,'delete');
 IF v_result<>'deleted' OR EXISTS(
   SELECT 1 FROM public.antares_domes WHERE id=v_dome AND organization_id=v_org)
 OR EXISTS(
   SELECT 1 FROM public.equipment WHERE id=v_equipment AND organization_id=v_org)
 OR EXISTS(
   SELECT 1 FROM public.antares_dome_links WHERE organization_id=v_org AND antares_dome_id=v_dome)
 THEN RAISE EXCEPTION 'FALHOU: exclusao atomica'; END IF;
 RAISE NOTICE 'APROVADO: exclusao de cupula sem uso';
 RAISE NOTICE 'APROVADO 49D: todas as operacoes da transacao serao revertidas';
END $test$;
ROLLBACK;
