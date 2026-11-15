// ANTARES 07E - auditoria somente-leitura do papel de escrita e das funções.
// Não exibe URLs, segredos ou dados de clientes. Não grava no banco.
import { neon } from '@neondatabase/serverless';
const url=process.env.DATABASE_URL_TEAM_RUNTIME;
if(!url){console.error('FALHOU: DATABASE_URL_TEAM_RUNTIME ausente');process.exit(1);}
const sql=neon(url);
const tests=await sql`SELECT current_user='antares_team_runtime' AS role_ok,
 (SELECT NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS role_limited,
 (SELECT bool_and(NOT has_table_privilege(current_user, x.tbl,'SELECT') AND
                        NOT has_table_privilege(current_user, x.tbl,'INSERT') AND
                        NOT has_table_privilege(current_user, x.tbl,'UPDATE') AND
                        NOT has_table_privilege(current_user, x.tbl,'DELETE'))
  FROM (VALUES ('public.ledger_entries'),('public.antares_finance_capability'),
               ('public.antares_receivables'),('public.antares_receivable_payments')) AS x(tbl)
 ) AS tables_locked,
 (SELECT bool_and(has_function_privilege(current_user,x.fn,'EXECUTE'))
  FROM (VALUES
   ('public.antares_post_ledger_entry(text,text,uuid,uuid,text,numeric,text,date,uuid)'),
   ('public.antares_reverse_ledger_entry(text,text,uuid,uuid,text)'),
   ('public.antares_create_receivable(text,text,uuid,uuid,uuid,uuid,text,numeric,date)'),
   ('public.antares_pay_receivable(text,text,uuid,uuid,uuid,numeric,date)')
  ) AS x(fn)) AS functions_granted`;
let fail=false;for(const [k,v] of Object.entries(tests[0])){
 const ok=v===true;console.log((ok?'APROVADO':'FALHOU')+' | '+k);if(!ok)fail=true;
}
if(fail){console.error('NÃO habilitar gravações.');process.exitCode=1;}
else console.log('Permissões básicas aprovadas; ainda falta homologação autenticada e rotação de credencial.');
