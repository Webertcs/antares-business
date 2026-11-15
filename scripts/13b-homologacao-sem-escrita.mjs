// ANTARES 13B — homologacao negativa, sem insercoes ou alteracoes.
// Execucao: node --env-file=.env.local scripts/13b-homologacao-sem-escrita.mjs
import {neon} from '@neondatabase/serverless';
const readUrl=process.env.DATABASE_URL;
const runtimeUrl=process.env.DATABASE_URL_TEAM_RUNTIME;
if(!readUrl||!runtimeUrl){console.error('FALHOU | DATABASE_URL ou DATABASE_URL_TEAM_RUNTIME nao configurada');process.exit(1);}
const read=neon(readUrl),limited=neon(runtimeUrl);
let failures=0,passed=0;
function check(label,ok){console.log((ok?'APROVADO':'FALHOU')+' | '+label);ok?passed++:failures++;}
const flags=['ANTARES_FINANCE_WRITES_ENABLED','ANTARES_CONTRACT_WRITES_ENABLED','ANTARES_EDUCATION_WRITES_ENABLED'];
for(const flag of flags)check('Flag segura '+flag,process.env[flag]!=='true');
try{
 const q=await limited`SELECT current_user AS actor,
 has_table_privilege(current_user,'public.business_contracts','INSERT') AS contract_insert,
 has_table_privilege(current_user,'public.antares_education_groups','INSERT') AS education_insert,
 has_table_privilege(current_user,'public.ledger_entries','INSERT') AS finance_insert,
 has_function_privilege(current_user,'public.antares_register_contract(text,uuid,uuid,text,text,boolean)','EXECUTE') AS contract_function,
 has_function_privilege(current_user,'public.antares_education_create_group(text,uuid,uuid,text,text,integer,text,text,text)','EXECUTE') AS education_function`;
 const v=q[0];check('Runtime sem INSERT direto em contratos',v.contract_insert===false);
 check('Runtime sem INSERT direto em turmas',v.education_insert===false);
 check('Runtime sem INSERT direto em ledger',v.finance_insert===false);
 check('Runtime com EXECUTE controlado em contratos',v.contract_function===true);
 check('Runtime com EXECUTE controlado em turmas',v.education_function===true);
}catch(e){check('Inspecao de privilegios do runtime',false);}
const fakeSubject='homologacao-13b-sem-usuario-real';
const fakeUuid='00000000-0000-4000-8000-000000000013';
try{
 const orgs=await read`SELECT organization_id FROM public.business_proposals LIMIT 1`;
 if(!orgs.length){console.log('PENDENTE | Sem proposta para validar rejeicao com contexto real');}
 else{
 const org=String(orgs[0].organization_id);
 try{
 await limited`SELECT public.antares_register_contract(${fakeSubject},${org}::uuid,
 ${fakeUuid}::uuid,'written','Teste de bloqueio sem assinatura',false)`;
 check('Contrato rejeita sujeito ficticio',false);
 }catch{check('Contrato rejeita sujeito ficticio',true);}
 try{
 await limited`SELECT public.antares_education_create_group(${fakeSubject},${org}::uuid,
 ${fakeUuid}::uuid,'Teste sem gravacao','6 ano',0,'','','')`;
 check('Turma rejeita sujeito ficticio',false);
 }catch{check('Turma rejeita sujeito ficticio',true);}
 }
}catch{check('Consulta de organizacao para teste negativo',false);}
try{
 const rows=await read`SELECT
 (SELECT count(*)::int FROM public.business_contracts) AS contracts,
 (SELECT count(*)::int FROM public.antares_education_groups) AS groups`;
 console.log('INFO | Quantidades atuais (nao devem mudar em decorrencia deste teste): contratos='+rows[0].contracts+', turmas='+rows[0].groups);
}catch{check('Consulta de contagens',false);}
console.log('\nRESUMO | '+passed+' aprovados; '+failures+' falhas.');
console.log('Este roteiro nao cadastra contratos ou turmas e NAO homologa gravacao por proprietario real.');
if(failures){console.error('NAO LIBERAR GRAVACOES.');process.exitCode=1;}
