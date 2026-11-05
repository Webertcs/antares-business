-- ANTARES 07A: regras e integridade financeira
-- Somente leitura. Não altera dados.
SELECT c.relname AS objeto,c.relkind,
       pg_get_viewdef(c.oid,true) AS definicao_view
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='financial_balances';

SELECT con.conrelid::regclass AS tabela,
       con.conname AS restricao,
       pg_get_constraintdef(con.oid,true) AS definicao
FROM pg_constraint con
WHERE con.conrelid IN ('public.ledger_entries'::regclass,
                      'public.presentations'::regclass,
                      'public.antares_domes'::regclass,
                      'public.business_proposals'::regclass)
ORDER BY con.conrelid::regclass::text,con.contype,con.conname;

SELECT entry_type, count(*) AS total
FROM public.ledger_entries GROUP BY entry_type ORDER BY entry_type;

SELECT status,count(*) AS total
FROM public.presentations GROUP BY status ORDER BY status;

SELECT status,count(*) AS total
FROM public.business_proposals GROUP BY status ORDER BY status;
