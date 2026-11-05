// ANTARES Bloco 13 — auditoria consolidada, somente leitura.
// Execute: node --env-file=.env.local scripts/13-auditoria-geral.mjs
import {neon} from '@neondatabase/serverless';
const base=(process.env.ANTARES_APP_ORIGIN||'http://localhost:3000').replace(/\/$/,'');
let failed=0,warned=0;
function result(ok,label,detail=''){console.log((ok?'APROVADO':'FALHOU')+' | '+label+(detail?' | '+detail:''));if(!ok)failed++;}
function warning(label,detail){warned++;console.log('PENDENTE | '+label+' | '+detail);}
for(const [name,flag] of [['Financeiro','ANTARES_FINANCE_WRITES_ENABLED'],['Contratos','ANTARES_CONTRACT_WRITES_ENABLED'],['Educacional','ANTARES_EDUCATION_WRITES_ENABLED']]){
 result(process.env[flag]!=='true',name+' bloqueado');
}
const database=process.env.DATABASE_URL;
if(!database){result(false,'DATABASE_URL configurada');}
else{
 try{
 const db=neon(database);
 const rows=await db`SELECT
 to_regclass('public.crm_clients') IS NOT NULL AS clients,
 to_regclass('public.business_proposals') IS NOT NULL AS proposals,
 to_regclass('public.presentations') IS NOT NULL AS presentations,
 to_regclass('public.antares_domes') IS NOT NULL AS domes,
 to_regclass('public.business_contracts') IS NOT NULL AS contracts,
 to_regclass('public.antares_education_groups') IS NOT NULL AS education,
 to_regclass('public.antares_receivables') IS NOT NULL AS receivables,
 to_regclass('public.ledger_entries') IS NOT NULL AS ledger,
 to_regprocedure('public.antares_register_contract(text,uuid,uuid,text,text,boolean)') IS NOT NULL AS contract_function,
 EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.presentations'::regclass
 AND conname='antares_presentations_no_overlap' AND contype='x') AS overlap`;
 for(const [name,value] of Object.entries(rows[0]||{}))result(value===true,'Neon '+name);
 }catch(e){result(false,'Consulta Neon',e instanceof Error?e.message:'erro desconhecido');}
}
const endpoints=[
 ['Agenda','/api/agenda','GET'],
 ['Comercial','/api/business','GET'],
 ['Clientes','/api/crm/clientes','GET'],
 ['Contratos','/api/comercial/contratos','POST'],
 ['Educacional','/api/educacional','GET'],
 ['Intelligence','/api/intelligence','GET'],
 ['Financeiro','/api/financeiro','GET'],
 ['Contas a receber','/api/financeiro/receber','GET']
];
for(const [name,path,method] of endpoints){
 try{
 const response=await fetch(base+path,{method,redirect:'manual',headers:method==='POST'?{'Content-Type':'application/json',Origin:base}:undefined,body:method==='POST'?'{}':undefined,signal:AbortSignal.timeout(6000)});
 result(response.status===403,'Acesso anônimo '+name,'HTTP '+response.status);
 }catch{warning('HTTP '+name,'Servidor local indisponível; iniciar npm.cmd run dev');}
}
console.log('\nResultado: '+failed+' falha(s), '+warned+' pendência(s).');
if(failed){console.error('NÃO LIBERAR GRAVAÇÕES.');process.exitCode=1;}
else console.log('Verificações de leitura aprovadas. Gravações autenticadas ainda exigem homologação separada.');
