// ANTARES — verificação de pré-entrega sem acessar dados pessoais ou gravar.
 // node --env-file=.env.local scripts/29-pre-entrega.mjs
import {neon} from '@neondatabase/serverless';
const check=(name,ok)=>{console.log((ok?'OK':'PENDENTE')+' | '+name);if(!ok)pending++;};
let pending=0;
const flags=['ANTARES_PROVIDER_WRITES_ENABLED','ANTARES_AGENDA_WRITES_ENABLED','ANTARES_CONTRACT_WRITES_ENABLED','ANTARES_EDUCATION_WRITES_ENABLED','ANTARES_FINANCE_WRITES_ENABLED'];
for(const k of flags)check(k+' fechada antes da entrega',process.env[k]!=='true');
for(const k of ['DATABASE_URL','DATABASE_URL_TEAM_RUNTIME','ANTARES_APP_ORIGIN'])check(k+' configurada',!!process.env[k]);
const origin=process.env.ANTARES_APP_ORIGIN;
if(origin){try{const u=new URL(origin);check('Origem HTTP(S) válida',u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)));check('HTTPS obrigatório fora do localhost',u.hostname==='localhost'||u.hostname==='127.0.0.1'||u.protocol==='https:');}catch{check('Origem válida',false)}}
const developer=process.env.ANTARES_DEVELOPER_SUBJECT;
check('Identificador de desenvolvedor definido',!!developer);
if(process.env.DATABASE_URL&&developer){
 try{const db=neon(process.env.DATABASE_URL);
 const q=await db`SELECT count(*)::int AS total FROM public.team_members WHERE auth_subject=${developer} AND active=true AND role='owner'`;
 check('Conta de desenvolvedor é owner ativo',q[0]?.total===1);
 }catch{check('Consulta de proprietário disponível',false);}
}
console.log('INFO | PWA validado anteriormente pelo desenvolvedor; não repetido neste script.');
console.log('INFO | Snapshot, rotação de segredos expostos, ambiente HTTPS e consentimento do cliente exigem confirmação externa.');
console.log('RESUMO | '+pending+' pendência(s) da pré-entrega automática; nenhuma alteração realizada.');
if(pending)process.exitCode=1;
