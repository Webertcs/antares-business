'use client';
import {useState} from 'react';
type Check={name:string;path:string;verify:(x:Record<string,unknown>)=>boolean};
const checks:Check[]=[
 {name:'Agenda e vínculos',path:'/api/agenda/reservas',verify:x=>Array.isArray(x.proposals)&&Array.isArray(x.domes)&&Array.isArray(x.links)},
 {name:'Minha Empresa',path:'/api/configuracoes/prestador',verify:x=>Object.hasOwn(x,'profile')},
 {name:'Clientes',path:'/api/crm/clientes',verify:x=>Array.isArray(x.clients)||Array.isArray(x.clientes)},
 {name:'Educacional',path:'/api/educacional',verify:x=>Array.isArray(x.schools)&&Array.isArray(x.groups)},
 {name:'Financeiro — títulos',path:'/api/financeiro/receber',verify:x=>Array.isArray(x.titles)&&Array.isArray(x.clients)},
 {name:'Financeiro — relatórios',path:'/api/financeiro/relatorios',verify:x=>Array.isArray(x.months)&&Array.isArray(x.years)&&Array.isArray(x.domes)},
 {name:'Agenda — calendário',path:'/api/agenda',verify:x=>Array.isArray(x.bookings)&&Array.isArray(x.domes)}
];
export default function AceiteReadOnly(){
 const [running,setRunning]=useState(false);
 const [result,setResult]=useState<{name:string;status:number;ok:boolean}[]>([]);
 async function run(){
 if(running)return;setRunning(true);setResult([]);
 const out:{name:string;status:number;ok:boolean}[]=[];
 for(const c of checks){
 try{const r=await fetch(c.path,{cache:'no-store'});const x=await r.json();out.push({name:c.name,status:r.status,ok:r.ok&&x&&typeof x==='object'&&c.verify(x)});}
 catch{out.push({name:c.name,status:0,ok:false});}
 setResult([...out]);}
 setRunning(false);
 }
 return <section style={{border:'1px solid #b8cce6',borderRadius:12,padding:18,marginTop:22}}>
 <h2>Homologação final — consultas autenticadas</h2>
 <p>Sete consultas GET com sua sessão de proprietário; não cadastram, alteram nem removem informações. Verificam resposta HTTP e formato mínimo esperado.</p>
 <button type="button" disabled={running} onClick={run} style={{background:'#1e4dc6',color:'white',padding:'12px 16px',border:0,borderRadius:8}}>{running?'Conferindo...':'Executar homologação de leitura'}</button>
 {result.length>0&&<div style={{marginTop:16}}>
 <strong>{result.filter(x=>x.ok).length}/{checks.length} consultas aprovadas</strong>
 {result.map((x,i)=><p key={i} style={{borderBottom:'1px solid #dae3ef',paddingBottom:7}}>{x.ok?'✓':'⚠'} {x.name} — HTTP {x.status||'erro de rede'} — {x.ok?'Aprovado':'Revisar resposta ou formato'}</p>)}
 <p style={{fontSize:13}}>Este teste NÃO aprova gravações positivas. Elas ficam pendentes até existir operação real autorizada e confirmada após releitura.</p>
 </div>}
 </section>;
}
