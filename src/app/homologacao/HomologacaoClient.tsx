'use client';
import {useState} from 'react';
import Link from 'next/link';
type Key='agenda'|'contrato'|'educacional'|'prestador'|'financeiro';
type FlagMap=Record<Key,boolean>;
type Result={name:string;code:number|null;ok:boolean;message:string};
const checks:{key:Key;name:string;url:string;payload:Record<string,unknown>}[]=[
 {key:'agenda',name:'Reserva',url:'/api/agenda/reservas',payload:{}},
 {key:'agenda',name:'Preparação de cliente/cúpula',url:'/api/agenda/preparar',payload:{}},
 {key:'contrato',name:'Contrato',url:'/api/comercial/contratos',payload:{}},
 {key:'educacional',name:'Turma',url:'/api/educacional',payload:{}},
 {key:'prestador',name:'Prestador',url:'/api/configuracoes/prestador',payload:{}},
 {key:'financeiro',name:'Contas a receber',url:'/api/financeiro/receber',payload:{}}
];
export default function HomologacaoClient({flags}:{flags:FlagMap}){
 const [running,setRunning]=useState(false),[results,setResults]=useState<Result[]>([]);
 const enabled=Object.entries(flags).filter(([,value])=>value).map(([key])=>key);
 async function run(){
 if(running||enabled.length)return;
 setRunning(true);setResults([]);
 const next:Result[]=[];
 for(const check of checks){
 try{
 const response=await fetch(check.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(check.payload),cache:'no-store'});
 const ok=response.status===503;
 next.push({name:check.name,code:response.status,ok,message:ok?'Bloqueio confirmado':'Resposta diferente do bloqueio esperado'});
 }catch{next.push({name:check.name,code:null,ok:false,message:'Erro de comunicação'});}
 setResults([...next]);
 }
 setRunning(false);
 }
 return <main style={{maxWidth:950,margin:'20px auto',padding:24,color:'#16345b',fontFamily:'system-ui'}}>
 <Link href="/">← Painel ANTARES</Link><h1>Homologação operacional</h1>
 <p>Teste autenticado de segurança. Verifica que as APIs de escrita rejeitam operações enquanto as flags estão desligadas. Não executa cadastro real e não comprova o fluxo positivo.</p>
 <section style={{border:'1px solid #c2d4e9',padding:18,borderRadius:10,marginBottom:20}}>
 <h2>Estado atual das gravações</h2>
 {Object.entries(flags).map(([key,on])=><p key={key}><strong>{key}:</strong> {on?'ATIVADA — não executar teste':'Desabilitada'}</p>)}
 </section>
 {enabled.length>0?<p role="alert" style={{padding:15,background:'#ffe6e6'}}>Teste bloqueado: existe gravação ativada. Desative e reinicie o servidor antes de executar testes de bloqueio.</p>:<button disabled={running} onClick={run} style={{background:'#174bb3',color:'white',padding:'13px 18px',border:0,borderRadius:9,cursor:'pointer'}}>{running?'Verificando...':'Verificar seis bloqueios autenticados'}</button>}
 {results.length>0&&<section style={{marginTop:22}}><h2>Resultados ({results.filter(x=>x.ok).length}/{checks.length})</h2>
 {results.map(x=><p key={x.name} style={{padding:9,borderBottom:'1px solid #d5dfea'}}><strong>{x.ok?'APROVADO':'ATENÇÃO'}</strong> · {x.name} · HTTP {x.code??'sem resposta'} — {x.message}</p>)}
 <p>Para homologar gravações autorizadas será necessária uma rodada separada com dados reais controlados e backup.</p></section>}
 <section style={{marginTop:26}}><h2>Acessos para revisão</h2>
 <p><Link href="/agenda/reservas">Agenda e cúpulas</Link> · <Link href="/configuracoes/prestador">Prestador</Link> · <Link href="/operacoes">Contratos</Link> · <Link href="/educacional">Turmas</Link> · <Link href="/financeiro/receber">Financeiro</Link></p></section>
 </main>;
}
