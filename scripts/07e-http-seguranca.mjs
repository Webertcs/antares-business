// ANTARES 07E — verificações HTTP sem cookies e sem movimentação financeira.
// Requer npm run dev e ANTARES_FINANCE_WRITES_ENABLED=false.
const base='http://localhost:3000';
const body=JSON.stringify({action:'create',id:'00000000-0000-4000-8000-000000000099',
 client_id:'00000000-0000-4000-8000-000000000098',description:'Nao gravar',total:1,due_on:'2026-11-02'});
const checks=[
 ['Extrato anônimo', '/api/financeiro','GET',undefined,403],
 ['Títulos anônimos', '/api/financeiro/receber','GET',undefined,403],
 ['Criar título anônimo', '/api/financeiro/receber','POST',body,403],
 ['Estorno anônimo', '/api/financeiro/estornar','POST',JSON.stringify({original_id:'00000000-0000-4000-8000-000000000099',reason:'Negado no teste'}),403]
];
let failed=0;
for(const [name,url,method,payload,expected] of checks){
 try{
 const res=await fetch(base+url,{method,headers:payload?{'Content-Type':'application/json',Origin:base}:undefined,body:payload,redirect:'manual'});
 const passed=res.status===expected;
 console.log((passed?'APROVADO':'FALHOU')+' | '+name+' | HTTP '+res.status);
 if(!passed)failed++;
 }catch(e){console.log('FALHOU | '+name+' | servidor indisponível');failed++;}
}
if(failed){process.exitCode=1;console.error('NÃO LIBERAR O FINANCEIRO.');}
else console.log('APROVADO: bloqueios anônimos. NÃO comprova autorização do proprietário.');
