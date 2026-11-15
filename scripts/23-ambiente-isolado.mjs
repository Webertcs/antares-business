// ANTARES 23 — inspeção de ambiente de homologação, apenas leitura.
// node --env-file=.env.local scripts/23-ambiente-isolado.mjs
// Nunca altera .env.local nem escreve no Neon.
import {neon} from '@neondatabase/serverless';
const prod=process.env.DATABASE_URL,prodWrite=process.env.DATABASE_URL_TEAM_RUNTIME;
const stage=process.env.DATABASE_URL_HOMOLOG,stageWrite=process.env.DATABASE_URL_TEAM_RUNTIME_HOMOLOG;
const fail=(msg)=>{console.error('PENDENTE | '+msg);process.exitCode=1};
const parse=(raw,label)=>{try{const u=new URL(raw);if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname)throw Error();return u;}catch{fail(label+' inválida');return null;}};
if(!prod||!prodWrite||!stage||!stageWrite){fail('Configure DATABASE_URL_HOMOLOG e DATABASE_URL_TEAM_RUNTIME_HOMOLOG apontando para uma BRANCH ISOLADA no Neon. Não copie a produção.');process.exit(1);}
const p=parse(prod,'URL principal'),pw=parse(prodWrite,'URL operacional'),s=parse(stage,'URL da homologação'),sw=parse(stageWrite,'URL operacional de homologação');
if(!p||!pw||!s||!sw)process.exit(1);
const identity=(u)=>u.hostname.toLowerCase()+'|'+decodeURIComponent(u.pathname);
if(identity(s)===identity(p)||identity(s)===identity(pw)||identity(sw)===identity(p)||identity(sw)===identity(pw))fail('Homologação parece apontar para a produção; recusado');
if(identity(s)!==identity(sw))fail('URL de leitura e operacional de homologação apontam para hosts/bancos diferentes');
if(process.exitCode)process.exit(1);
try{
 const [a,b]=await Promise.all([neon(stage)`SELECT current_database() AS db, current_user AS role`,neon(stageWrite)`SELECT current_database() AS db, current_user AS role,
 has_table_privilege(current_user,'public.clients','INSERT') AS can_insert_client,
 has_function_privilege(current_user,'public.antares_prepare_proposal_client(text,uuid,uuid)','EXECUTE') AS can_prepare`]);
 console.log('APROVADO | Credenciais distintas das conexões de produção (verificação por hostname e banco)');
 console.log('APROVADO | Conexões à branch isolada: leitura e runtime');
 console.log('INFO | Roles conectadas: '+a[0].role+' / '+b[0].role);
 if(b[0].can_insert_client!==false||b[0].can_prepare!==true)fail('Permissões do runtime de homologação inconsistentes');
 else console.log('APROVADO | Runtime sem INSERT direto e com função protegida');
 console.log('Nenhuma gravação executada. Só habilite flags em ambiente isolado após confirmar a branch no painel Neon.');
}catch(e){fail('Não foi possível verificar a branch isolada: '+(e instanceof Error?e.message:'erro'));}
