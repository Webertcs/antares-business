-- ANTARES 07A | Inventário financeiro (somente leitura)
-- Não cria, altera nem exclui dados. Executar no Neon SQL Editor.
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
AND (table_name LIKE '%ledger%' OR table_name LIKE '%financial%'
 OR table_name LIKE '%payment%' OR table_name LIKE '%receiv%'
 OR table_name LIKE '%expense%' OR table_name LIKE '%booking%'
 OR table_name LIKE '%business%' OR table_name LIKE '%dome%')
ORDER BY table_name;

SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='public'
AND table_name IN ('ledger_entries','financial_balances','business_ledger',
 'business_proposals','business_bookings','antares_domes',
 'presentations','quotes','crm_events')
ORDER BY table_name,ordinal_position;

SELECT tc.table_name,tc.constraint_name,tc.constraint_type,
       string_agg(kcu.column_name,', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
 ON kcu.constraint_name=tc.constraint_name AND kcu.table_schema=tc.table_schema
WHERE tc.table_schema='public'
AND tc.table_name IN ('ledger_entries','financial_balances',
 'business_ledger','business_proposals','business_bookings','antares_domes')
GROUP BY tc.table_name,tc.constraint_name,tc.constraint_type
ORDER BY tc.table_name,tc.constraint_type;
