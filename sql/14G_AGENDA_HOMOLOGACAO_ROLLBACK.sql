-- ANTARES 14G: homologacao completa da Agenda, SEM registros permanentes.
-- Apenas apos aplicar 14E e 14F, com snapshot em production.
BEGIN;
DO $test$
DECLARE v_subject text;v_org uuid;v_proposal uuid;v_dome uuid;v_presentation uuid;v_client uuid;
 v_duplicate boolean:=false;v_collision boolean:=false;
BEGIN
 SELECT tm.auth_subject,tm.organization_id,p.id INTO v_subject,v_org,v_proposal
 FROM public.team_members tm JOIN public.business_proposals p ON p.organization_id=tm.organization_id
 WHERE tm.active AND tm.role='owner' AND p.status='accepted'
 ORDER BY p.created_at DESC LIMIT 1;
 IF v_proposal IS NULL THEN RAISE EXCEPTION 'PENDENTE: proposta aceita e owner ativo obrigatorios';END IF;
 v_client:=public.antares_prepare_proposal_client(v_subject,v_org,v_proposal);
 IF v_client IS NULL THEN RAISE EXCEPTION 'FALHOU: sincronizacao de cliente';END IF;
 RAISE NOTICE 'APROVADO: cliente operacional preparado na transacao';
 v_dome:=public.antares_create_linked_dome(v_subject,v_org,'Cupula homologacao temporaria','TMP-14G',300);
 IF v_dome IS NULL THEN RAISE EXCEPTION 'FALHOU: cadastro de cupula';END IF;
 RAISE NOTICE 'APROVADO: cupula e equipamento vinculados';
 v_presentation:=public.antares_book_proposal(v_subject,v_org,v_proposal,v_dome,
 '2027-03-10 10:00-03'::timestamptz,'2027-03-10 11:00-03'::timestamptz);
 IF NOT EXISTS(SELECT 1 FROM public.antares_proposal_reservations WHERE organization_id=v_org AND proposal_id=v_proposal AND presentation_id=v_presentation)
 THEN RAISE EXCEPTION 'FALHOU: reserva nao vinculada a proposta';END IF;
 RAISE NOTICE 'APROVADO: proposta aceita reservada e vinculada a apresentacao';
 BEGIN
  PERFORM public.antares_book_proposal(v_subject,v_org,v_proposal,v_dome,
   '2027-03-11 10:00-03'::timestamptz,'2027-03-11 11:00-03'::timestamptz);
 EXCEPTION WHEN OTHERS THEN v_duplicate:=true;END;
 IF NOT v_duplicate THEN RAISE EXCEPTION 'FALHOU: duplicidade nao rejeitada';END IF;
 RAISE NOTICE 'APROVADO: proposta duplicada rejeitada';
 BEGIN
 INSERT INTO public.presentations(organization_id,client_id,dome_id,title,starts_at,ends_at,status)
 VALUES(v_org,v_client,(SELECT equipment_id FROM public.antares_dome_links WHERE organization_id=v_org AND antares_dome_id=v_dome),
 'Teste conflito','2027-03-10 10:30-03','2027-03-10 11:30-03','reserved');
 EXCEPTION WHEN exclusion_violation THEN v_collision:=true;END;
 IF NOT v_collision THEN RAISE EXCEPTION 'FALHOU: conflito de cupula permitido';END IF;
 RAISE NOTICE 'APROVADO: sobreposicao de cupula bloqueada';
 RAISE NOTICE 'APROVADO 14G: teste reversivel completo';
END $test$;
ROLLBACK;
