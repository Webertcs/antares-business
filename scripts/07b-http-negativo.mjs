// ANTARES 07B — testes HTTP NEGATIVOS. Sem autenticação e sem gravar registros.
// Execute com npm run dev ativo. NÃO enviar cookies nem segredos a este script.
const root='http://localhost:3000';
const body={id:'00000000-0000-4000-8000-000000000021',entry_type:'income',
 amount:1,description:'TESTE SEM AUTORIZACAO',occurred_on:'2026-10-31'};
const cases=[
 {name:'Leitura financeira anônima bloqueada',method:'GET',url:'/api/financeiro',status:403},
 {name:'Gravação financeira anônima bloqueada',method:'POST',url:'/api/financeiro',
   headers:{'Content-Type':'application/json',Origin:root},body:JSON.stringify(body),status:403},
 {name:'Origem externa não habilita gravação anônima',method:'POST',url:'/api/financeiro',
   headers:{'Content-Type':'application/json',Origin:'https://example.invalid'},body:JSON.stringify(body),status:403}
];
let fail=0;
for(const c of cases){
 try{
  const res=await fetch(root+c.url,{method:c.method,headers:c.headers,body:c.body,redirect:'manual',cache:'no-store'});
  const ok=res.status===c.status;
  console.log((ok?'APROVADO':'FALHOU')+' | '+c.name+' | HTTP '+res.status);
  if(!ok)fail++;
 }catch(err){console.log('FALHOU | '+c.name+' | servidor não disponível');fail++;}
}
if(fail){process.exitCode=1;console.error('NÃO habilite gravações.');}
else console.log('APROVADO: controle HTTP de sessão anônima. Ainda faltam testes de proprietário e duplicidade em banco isolado.');
