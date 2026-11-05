// ANTARES — fechamento consolidado das permissoes, sem gravacao.
// node --env-file=.env.local scripts/15-fechamento-seguro.mjs
import {neon} from '@neondatabase/serverless';
const flags=['ANTARES_AGENDA_WRITES_ENABLED','ANTARES_FINANCE_WRITES_ENABLED','ANTARES_CONTRACT_WRITES_ENABLED','ANTARES_EDUCATION_WRITES_ENABLED','ANTARES_PROVIDER_WRITES_ENABLED'];
let failures=0;
const report=(ok,label)=>{console.log((ok?'APROVADO':'FALHOU')+' | '+label);if(!ok)failures++;};
for(const flag of flags)report(process.env[flag]!=='true',flag+' desabilitada');
if(!process.env.DATABASE_URL_TEAM_RUNTIME){report(false,'DATABASE_URL_TEAM_RUNTIME configurada');process.exit(1);}
const db=neon(process.env.DATABASE_URL_TEAM_RUNTIME);
try{
 const q=await db`SELECT
 has_function_privilege(current_user,'public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)','EXECUTE') AS reserve,
 has_function_privilege(current_user,'public.antares_prepare_proposal_client(text,uuid,uuid)','EXECUTE') AS clients,
 has_function_privilege(current_user,'public.antares_create_linked_dome(text,uuid,text,text,integer)','EXECUTE') AS dome,
 has_function_privilege(current_user,'public.antares_save_provider_profile(text,uuid,text,text,text,text)','EXECUTE') AS provider,
 has_table_privilege(current_user,'public.presentations','INSERT') AS presentation_insert,
 has_table_privilege(current_user,'public.clients','INSERT') AS client_insert,
 has_table_privilege(current_user,'public.equipment','INSERT') AS equipment_insert`;
 const row=q[0];
 for(const key of ['reserve','clients','dome','provider'])report(row[key]===true,'EXECUTE restrito '+key);
 for(const key of ['presentation_insert','client_insert','equipment_insert'])report(row[key]===false,'INSERT direto negado '+key);
}catch(e){report(false,'Permissoes runtime (migracoes 14E/14F instaladas?)');}
console.log('TOTAL: '+failures+' falhas; sem escrita.');
if(failures)process.exitCode=1;
