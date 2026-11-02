// ANTARES 17 — pré-liberação consolidada (somente leitura).
// node --env-file=.env.local scripts/17-preliberacao.mjs
import {neon} from '@neondatabase/serverless';
const flags=['ANTARES_AGENDA_WRITES_ENABLED','ANTARES_CONTRACT_WRITES_ENABLED','ANTARES_EDUCATION_WRITES_ENABLED','ANTARES_PROVIDER_WRITES_ENABLED','ANTARES_FINANCE_WRITES_ENABLED'];
let failed=0;
function check(name,ok,detail=''){console.log((ok?'APROVADO':'PENDENTE')+' | '+name+(detail?' | '+detail:''));if(!ok)failed++;}
for(const key of flags)check(key+' fechada',process.env[key]!=='true');
if(!process.env.DATABASE_URL||!process.env.DATABASE_URL_TEAM_RUNTIME){console.error('PENDENTE | URLs de conexão incompletas');process.exit(1);}
const db=neon(process.env.DATABASE_URL);
const runtime=neon(process.env.DATABASE_URL_TEAM_RUNTIME);
const functions=[
 'antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)',
 'antares_prepare_proposal_client(text,uuid,uuid)',
 'antares_create_linked_dome(text,uuid,text,text,integer)',
 'antares_register_contract(text,uuid,uuid,text,text,boolean)',
 'antares_education_create_group(text,uuid,uuid,text,text,integer,text,text,text)',
 'antares_save_provider_profile(text,uuid,text,text,text,text)'
];
try{
 const grants=await db`SELECT p.proname,p.oid::regprocedure::text AS signature,
 (SELECT bool_or(r.rolname='antares_team_runtime') FROM pg_roles r
 WHERE has_function_privilege(r.oid,p.oid,'EXECUTE') AND r.rolname IN ('antares_team_runtime')) AS runtime_execute,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute,
 has_function_privilege('antares_public_inbox_login',p.oid,'EXECUTE') AS inbox_execute
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 AND p.proname IN ('antares_book_proposal','antares_prepare_proposal_client','antares_create_linked_dome',
 'antares_register_contract','antares_education_create_group','antares_save_provider_profile')`;
 for(const name of functions){
 const g=grants.find(x=>x.signature===''+name);
 check('Funcao '+name,Boolean(g&&g.runtime_execute===true&&g.public_execute===false&&g.inbox_execute===false),
 g?'runtime / publico / inbox: '+[g.runtime_execute,g.public_execute,g.inbox_execute].join(' / '):'ausente');
 }
 const counts=await db`SELECT
 (SELECT count(*)::int FROM public.antares_domes WHERE active) AS domes,
 (SELECT count(*)::int FROM public.antares_client_links) AS client_links,
 (SELECT count(*)::int FROM public.antares_dome_links) AS dome_links,
 (SELECT count(*)::int FROM public.antares_proposal_reservations) AS booked,
 (SELECT count(*)::int FROM public.antares_provider_profiles) AS profiles`;
 const v=counts[0];console.log('INFO | Cadastro real (quantidades): '+JSON.stringify(v));
 check('Cupulas reais cadastradas',v.domes>0,'quantidade: '+v.domes);
 check('Cupulas operacionais vinculadas',v.dome_links>0,'quantidade: '+v.dome_links);
 check('Prestador cadastrado',v.profiles>0,'quantidade: '+v.profiles);
 const restricted=await runtime`SELECT
 has_table_privilege(current_user,'public.presentations','INSERT') AS presentations,
 has_table_privilege(current_user,'public.clients','INSERT') AS clients,
 has_table_privilege(current_user,'public.equipment','INSERT') AS equipment`;
 check('Sem insercoes diretas pelo runtime',Object.values(restricted[0]).every(x=>x===false));
}catch(e){check('Auditoria SQL',false,e instanceof Error?e.message:'erro desconhecido');}
console.log('\nRESUMO: '+failed+' pendencia(s). Nenhuma escrita executada.');
if(failed)process.exitCode=1;
