// ANTARES — diagnóstico SOMENTE LEITURA do encerramento de eventos.
// Não imprime URLs, credenciais, dados pessoais nem altera o banco.
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL){console.error('DATABASE_URL ausente');process.exit(1)}
const db=neon(process.env.DATABASE_URL);
const tables=['crm_events','crm_clients','team_members','business_audit','antares_event_attendance'];
try{
 const cols=await db`SELECT table_name,column_name,data_type,is_nullable,column_default
 FROM information_schema.columns WHERE table_schema='public'
 AND table_name=ANY(${tables}) ORDER BY table_name,ordinal_position`;
 for(const name of tables){
  console.log('\nTABELA '+name);
  const subset=cols.filter(c=>c.table_name===name);
  if(!subset.length){console.log('AUSENTE');continue}
  for(const c of subset)console.log(' - '+c.column_name+' | '+c.data_type+' | '+(c.is_nullable==='YES'?'nullable':'required')+(c.column_default?' | default':''));
 }
 const constraints=await db`SELECT t.relname AS table_name,c.contype,pg_get_constraintdef(c.oid) AS definition
 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 WHERE n.nspname='public' AND t.relname=ANY(${tables}) ORDER BY t.relname,c.contype`;
 console.log('\nRESTRICOES');for(const c of constraints)console.log(c.table_name+' | '+c.contype+' | '+c.definition);
 const funcs=await db`SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,p.prosecdef AS security_definer,
 pg_get_userbyid(p.proowner) AS owner
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND (p.proname LIKE 'antares_%event%' OR p.proname LIKE 'crm_save_event%')
 ORDER BY p.proname`;
 console.log('\nFUNCOES');for(const f of funcs)console.log(f.proname+'('+f.arguments+') | definer='+f.security_definer+' | owner='+f.owner);
 const roles=await db`SELECT rolname,rolcanlogin,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('antares_team_runtime','neondb_owner')`;
 console.log('\nROLES');for(const r of roles)console.log(r.rolname+' | login='+r.rolcanlogin+' | super='+r.rolsuper+' | bypassrls='+r.rolbypassrls);
 console.log('\nDIAGNOSTICO CONCLUIDO — SEM ESCRITAS');
}catch(e){console.error('Falha no diagnóstico: '+(e instanceof Error?e.message:'erro desconhecido'));process.exitCode=1}
