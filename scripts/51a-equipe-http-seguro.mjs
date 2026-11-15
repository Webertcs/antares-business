// ANTARES 51A — Apenas GET/POST sem autenticação e sem criar colaboradores.
// Uso: node --env-file=.env.local scripts/51a-equipe-http-seguro.mjs
// Execute somente com ANTARES_TEAM_WRITES_ENABLED=false.
// Operações de escrita devem negar acesso com 403 ou 503, jamais 2xx.
if(process.env.ANTARES_TEAM_WRITES_ENABLED!=='false'){
 console.error('BLOQUEADO: mantenha ANTARES_TEAM_WRITES_ENABLED=false para este teste.');
 process.exit(1);
}
const base=process.env.ANTARES_APP_ORIGIN||'http://localhost:3000';
const checks=[
 ['Pré-voo anônimo','/api/equipe/preflight','GET',undefined,403],
 ['Listagem anônima','/api/equipe','GET',undefined,403],
 ['Convites anônimos','/api/equipe/convites','GET',undefined,403],
 ['Gerar convite anônimo','/api/equipe/convites','POST',{name:'Teste sem sessão',email:'sem-sessao@example.invalid'},503],
 ['Revogação anônima','/api/equipe/convites/revogar','POST',{invitationId:'00000000-0000-4000-8000-000000000001'},503],
 ['Suspensão anônima','/api/equipe/suspender','POST',{memberId:'00000000-0000-4000-8000-000000000001'},503],
 ['Aceite anônimo','/api/equipe/convites/aceitar','POST',{token:'0'.repeat(64)},503]
];
let failures=0;
for(const [label,path,method,body,expected] of checks){
 try{
  const response=await fetch(base+path,{method,headers:body?{'Content-Type':'application/json',Origin:base}:undefined,
   body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(9000)});
  const passed=method==='POST'?[403,503].includes(response.status):response.status===expected;
  console.log((passed?'APROVADO':'FALHOU')+' | '+label+' | HTTP '+response.status);
  if(!passed)failures++;
 }catch{console.log('FALHOU | '+label+' | servidor indisponível');failures++;}
}
console.log(failures?'BLOQUEADO: '+failures+' verificação(ões) falharam.':'APROVADO: acesso anônimo bloqueado. Fluxo real de convite permanece pendente.');
if(failures)process.exitCode=1;
