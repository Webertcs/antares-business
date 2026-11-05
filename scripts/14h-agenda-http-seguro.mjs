// ANTARES 14H: verificacoes HTTP de reservas SEM cookies ou gravacoes.
// Com o servidor na porta 3000: node scripts/14h-agenda-http-seguro.mjs
const base=process.env.ANTARES_APP_ORIGIN||'http://localhost:3000';
const empty='00000000-0000-4000-8000-000000000014';
const checks=[
 ['Consulta anonima','/api/agenda/reservas','GET',undefined,403],
 ['Preparacao anonima','/api/agenda/preparar','POST',{action:'link-client',proposalId:empty},403],
 ['Reserva anonima','/api/agenda/reservas','POST',{proposalId:empty,domeId:empty,start:'2027-03-10T13:00:00.000Z',end:'2027-03-10T14:00:00.000Z'},403]
];
let failures=0;
for(const [label,path,method,payload,expected] of checks){
 try{
 const response=await fetch(base+path,{method,redirect:'manual',headers:payload?{'Content-Type':'application/json',Origin:base}:undefined,body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(7000)});
 const ok=response.status===expected;
 console.log((ok?'APROVADO':'FALHOU')+' | '+label+' | HTTP '+response.status);
 if(!ok)failures++;
 }catch(e){console.log('FALHOU | '+label+' | servidor inacessivel');failures++;}
}
console.log(failures?'NÃO LIBERAR AGENDA: '+failures+' falha(s)':'APROVADO: acessos anonimos bloqueados. Escritas do proprietario nao testadas.');
if(failures)process.exitCode=1;
