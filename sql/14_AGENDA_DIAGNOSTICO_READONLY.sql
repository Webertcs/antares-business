-- ANTARES | Diagnostico da agenda real; SOMENTE LEITURA.
-- Executar antes de desenhar a funcao segura de reserva.
SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('presentations','antares_domes','crm_events','business_proposals')
ORDER BY table_name,ordinal_position;
SELECT c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid IN ('public.presentations'::regclass,'public.antares_domes'::regclass)
ORDER BY c.conrelid::regclass::text,c.conname;
SELECT count(*)::int AS propostas_aceitas_sem_evento
FROM public.business_proposals
WHERE status='accepted' AND event_id IS NULL;
