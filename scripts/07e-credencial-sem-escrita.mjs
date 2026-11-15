// ANTARES 07E: checagem de credencial sem gravar dados e sem imprimir segredos.
// A função valida a capacidade antes do proprietário. Usamos sujeito inexistente
// para impedir a criação de lançamentos até mesmo com credencial correta.
import {neon} from '@neondatabase/serverless';
const url=process.env.DATABASE_URL_TEAM_RUNTIME;
const secret=process.env.ANTARES_FINANCE_CAPABILITY;
if(process.env.ANTARES_FINANCE_WRITES_ENABLED!=='false'||!url||!/^[a-f0-9]{64}$/i.test(secret||'')){
 console.error('ABORTADO: flag deve ser false, runtime e segredo devem estar configurados.');process.exit(1);
}
const db=neon(url);
const org='00000000-0000-4000-8000-000000000001';
const entry='00000000-0000-4000-8000-000000000002';
const subject='antares-07e-probe-inexistente';
const call=async(token)=>{try{
 await db`SELECT * FROM public.antares_post_ledger_entry(
 ${token},${subject},${org},${entry},'income',1.00,
 'SONDA SEM INSERCAO',CURRENT_DATE,NULL)`;
 return 'RETORNOU_SEM_ERRO';
}catch(err){return String(err?.message||'ERRO_DESCONHECIDO');}};
const good=await call(secret);
const bad=await call('0'.repeat(64)===secret?'1'.repeat(64):'0'.repeat(64));
const okGood=good.includes('Proprietário não autorizado');
const okBad=bad.includes('Capacidade financeira inválida');
console.log((okGood?'APROVADO':'FALHOU')+' | Credencial nova reconhecida; sujeito fictício bloqueado');
console.log((okBad?'APROVADO':'FALHOU')+' | Credencial inválida rejeitada');
if(!okGood||!okBad){console.error('NÃO habilite as gravações.');process.exitCode=1;}
else console.log('Verificação concluída sem inserções. Testes do proprietário real continuam pendentes.');
