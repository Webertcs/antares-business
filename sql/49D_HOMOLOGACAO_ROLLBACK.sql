-- ANTARES 49D | Homologacao reversivel: nenhum registro permanente.
-- EXECUTAR APENAS APOS instalar 49D e confirmar snapshot da branch production.
-- BEGIN + ROLLBACK obrigatorios: nao retirar o ROLLBACK.
BEGIN;
DO $test$
DECLARE
  v_subject text; v_org uuid; v_dome uuid; v_equipment uuid; v_result text;
  v_blocked boolean:=false;
BEGIN
 SELECT auth_subject,organization_id INTO v_subject,v_org
 FROM public.team_members WHERE active=true AND role='owner'
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

 -- A exclusao de cupulas usadas deve falhar; nao criamos apresentacoes
 -- nesta homologacao. A protecao contra uso e checada na funcao e na revisao de codigo.
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
