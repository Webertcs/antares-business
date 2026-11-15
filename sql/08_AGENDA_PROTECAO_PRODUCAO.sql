-- ANTARES 08 | Protecao de conflitos na tabela REAL presentations.
-- Executar na production SOMENTE apos snapshot. Uma transacao: falha reverte tudo.
-- Nunca executar o legado 04A (business_bookings nao existe neste banco).
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$
DECLARE v_invalid bigint; v_collisions bigint;
BEGIN
 IF to_regclass('public.presentations') IS NULL OR to_regclass('public.antares_domes') IS NULL THEN
  RAISE EXCEPTION 'Estrutura atual da Agenda ausente'; END IF;
 SELECT count(*) INTO v_invalid FROM public.presentations
 WHERE ends_at<=starts_at OR starts_at IS NULL OR ends_at IS NULL;
 IF v_invalid>0 THEN RAISE EXCEPTION 'Existem % apresentacoes com datas inconsistentes; corrigir antes da migracao',v_invalid;END IF;
 SELECT count(*) INTO v_collisions
 FROM public.presentations a JOIN public.presentations b
 ON a.organization_id=b.organization_id AND a.dome_id=b.dome_id AND a.id<b.id
 AND a.starts_at<b.ends_at AND b.starts_at<a.ends_at
 WHERE a.dome_id IS NOT NULL AND a.status NOT IN ('cancelled','canceled','completed')
 AND b.status NOT IN ('cancelled','canceled','completed');
 IF v_collisions>0 THEN RAISE EXCEPTION 'Existem % conflitos de agenda; revisar antes da migracao',v_collisions; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.presentations'::regclass AND conname='antares_presentations_no_overlap') THEN
  ALTER TABLE public.presentations ADD CONSTRAINT antares_presentations_no_overlap
  EXCLUDE USING gist(organization_id WITH =, dome_id WITH =,
   tstzrange(starts_at,ends_at,'[)') WITH &&)
  WHERE (dome_id IS NOT NULL AND status NOT IN ('cancelled','canceled','completed'));
 END IF;
END $$;
COMMIT;
-- Leitura de confirmacao, sem escrever dados:
SELECT conname,contype,pg_get_constraintdef(oid) AS regra
FROM pg_constraint WHERE conrelid='public.presentations'::regclass
AND conname='antares_presentations_no_overlap';
