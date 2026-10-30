// ANTARES V1 — preflight somente leitura; não executa migrações nem INSERT.
import {neon} from '@neondatabase/serverless';
const url=process.env.DATABASE_URL_TEAM_RUNTIME;
if(!url){console.error('FALHOU — Conexão restrita ausente');process.exitCode=1;}
else{
 try{
  const sql=neon(url);
  const [r]=await sql`SELECT
    current_user='antares_team_runtime' AS role_ok,
    (SELECT count(*)=6 FROM pg_class c
     WHERE c.oid IN (to_regclass('public.business_proposals'),to_regclass('public.business_contracts'),
       to_regclass('public.business_domes'),to_regclass('public.business_bookings'),
       to_regclass('public.business_ledger'),to_regclass('public.business_audit'))
       AND c.relrowsecurity
       AND NOT has_table_privilege(current_user,c.oid,'SELECT')
       AND NOT has_table_privilege(current_user,c.oid,'INSERT')
       AND NOT has_table_privilege(current_user,c.oid,'UPDATE')
       AND NOT has_table_privilege(current_user,c.oid,'DELETE')) AS tables_ok,
    (SELECT count(*)=5 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
     AND p.proname IN ('business_create_proposal','business_create_contract',
       'business_create_dome','business_create_booking','business_create_ledger_entry')
     AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
     AND has_function_privilege(current_user,p.oid,'EXECUTE')
     AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
       WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS funcs_ok,
    (SELECT count(*)=1 FROM pg_constraint
     WHERE conname='business_booking_no_overlap'
       AND conrelid=to_regclass('public.business_bookings')) AS no_overlap`;
  const checks=[['Papel restrito',r.role_ok],['Seis tabelas com RLS',r.tables_ok],
   ['Cinco funcoes protegidas',r.funcs_ok],['Agenda sem dupla reserva',r.no_overlap]];
  checks.forEach(([label,ok])=>console.log((ok?'OK':'PENDENTE')+' — '+label));
  if(checks.some(([,ok])=>!ok)){process.exitCode=1;console.error('V1 NAO HOMOLOGADA — nao liberar gravação.');}
  else console.log('Infraestrutura comercial V1 verificada; testes funcionais ainda necessários.');
 }catch{console.error('PENDENTE — Estrutura comercial ainda não implantada ou conexão indisponível.');process.exitCode=1;}
}
