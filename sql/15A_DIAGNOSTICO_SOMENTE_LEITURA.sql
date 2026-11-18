-- ANTARES 15A | Precheck estritamente SOMENTE LEITURA.
-- Executar no Neon SQL Editor, antes de avaliar a migracao 15A.
-- Nao publica dados pessoais; devolve estrutura, permissoes e contagens.
SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN (
 'crm_events','presentations','business_proposals',
 'antares_proposal_reservations','antares_presentation_event_links',
 'antares_reservation_changes','antares_dome_links')
AND column_name IN (
 'id','organization_id','client_id','event_id','presentation_id','proposal_id',
 'status','start_time','end_time','event_date','starts_at','ends_at',
 'dome_id','archived_at','expected_attendees','unit_price','fixed_price','pricing_model')
ORDER BY table_name,ordinal_position;

SELECT to_regclass('public.antares_presentation_event_links') AS ponte_eventos,
       to_regclass('public.antares_reservation_changes') AS historico_15a,
       to_regprocedure('public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)') AS reserva_atual,
       to_regprocedure('public.antares_close_event(text,uuid,integer)') AS encerramento_atual;

SELECT p.status,COUNT(*)::integer AS quantidade
FROM public.presentations p
JOIN public.antares_proposal_reservations r
 ON r.organization_id=p.organization_id AND r.presentation_id=p.id
GROUP BY p.status ORDER BY p.status;

SELECT COUNT(*)::integer AS reservas_sem_evento_operacional
FROM public.antares_proposal_reservations r
LEFT JOIN public.antares_presentation_event_links l
 ON l.organization_id=r.organization_id AND l.presentation_id=r.presentation_id
WHERE l.event_id IS NULL;
