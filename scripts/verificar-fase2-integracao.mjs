// ANTARES V1 — diagnóstico consolidado SOMENTE LEITURA.
// Não aplica migrações nem modifica registros.
import {neon} from '@neondatabase/serverless';
const admin=process.env.DATABASE_URL;
const runtime=process.env.DATABASE_URL_TEAM_RUNTIME;
if(!admin||!runtime){console.error('PENDENTE: conexões admin e runtime não configuradas.');process.exitCode=1;}
else{
 const db=neon(admin),restricted=neon(runtime);
 const checks=[];
 const check=(label,ok)=>checks.push({label,ok:Boolean(ok)});
 try{
  const [s]=await db`SELECT
   (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
    ('crm_clients','crm_contacts','crm_events')) AS crm,
   (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
    ('business_proposals','business_contracts','business_domes','business_bookings','business_ledger','business_audit')) AS commercial,
   (SELECT count(*) FROM pg_constraint WHERE conname='business_booking_no_overlap' AND conrelid=to_regclass('public.business_bookings')) AS overlap,
   (SELECT count(*) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosecdef AND
    p.proname IN ('business_create_proposal','business_create_contract','business_create_dome','business_create_booking','business_create_ledger_entry')) AS functions`;
  check('CRM 03: três tabelas',Number(s.crm)===3);
  check('Comercial 04: seis tabelas',Number(s.commercial)===6);
  check('Agenda: exclusão contra conflito',Number(s.overlap)===1);
  check('Comercial: cinco funções de gravação',Number(s.functions)===5);
  const [role]=await restricted`SELECT current_user AS name,
   (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user) AS privileged,
   (SELECT count(*) FROM pg_class c WHERE c.oid IN
    (to_regclass('public.business_proposals'),to_regclass('public.business_contracts'),
    to_regclass('public.business_domes'),to_regclass('public.business_bookings'),
    to_regclass('public.business_ledger'),to_regclass('public.business_audit'))
    AND (has_table_privilege(current_user,c.oid,'INSERT') OR has_table_privilege(current_user,c.oid,'UPDATE')
    OR has_table_privilege(current_user,c.oid,'DELETE'))) AS writable_tables`;
  check('Papel operacional restrito',role.name==='antares_team_runtime'&&!role.privileged);
  check('Sem gravação direta nas seis tabelas',Number(role.writable_tables)===0);
 }catch(e){console.error('Diagnóstico indisponível:',e instanceof Error?e.message:'erro desconhecido');process.exitCode=1;}
 for(const c of checks)console.log((c.ok?'OK':'PENDENTE')+' — '+c.label);
 if(checks.some(c=>!c.ok)){process.exitCode=1;console.error('FASE 2 NÃO CONCLUÍDA: migração ou controles pendentes.');}
 else console.log('Verificações de estrutura aprovadas; testes de fluxo e segurança ainda necessários.');
}
