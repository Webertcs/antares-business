'use client';
import {useEffect,useState} from 'react';
type State={provider:boolean;domes:number;linkedDomes:number;accepted:number;linkedClients:number;booked:number;error:string[]};
export default function SetupReadiness(){
 const [state,setState]=useState<State|null>(null);
 async function refresh(){
 const errs:string[]=[];
 const [p,a]=await Promise.allSettled([
  fetch('/api/configuracoes/prestador',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Minha Empresa: HTTP '+r.status);return r.json()}),
  fetch('/api/agenda/reservas',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Agenda: HTTP '+r.status);return r.json()})
 ]);
 if(p.status==='rejected')errs.push(p.reason instanceof Error?p.reason.message:'Minha Empresa indisponível');
 if(a.status==='rejected')errs.push(a.reason instanceof Error?a.reason.message:'Agenda indisponível');
 const v=a.status==='fulfilled'?a.value:null,profile=p.status==='fulfilled'?p.value.profile:null;
 setState({provider:!!profile,domes:Array.isArray(v?.domes)?v.domes.length:0,
 linkedDomes:Array.isArray(v?.domes)?v.domes.filter((d:{mapped:boolean})=>d.mapped).length:0,
 accepted:Array.isArray(v?.proposals)?v.proposals.length:0,
 linkedClients:Array.isArray(v?.proposals)?v.proposals.filter((x:{mapped:boolean})=>x.mapped).length:0,
 booked:Array.isArray(v?.links)?v.links.length:0,error:errs});
 }
 useEffect(()=>{void refresh();},[]);
 return <section style={{border:'1px solid #a8c3e3',padding:18,borderRadius:12,marginBottom:20}}>
 <h2>Estado atual do planetário</h2>
 {!state?<p>Consultando cadastros...</p>:<>
 <p>Minha Empresa: <strong>{state.provider?'Cadastrado':'Pendente'}</strong></p>
 <p>Cúpulas ativas: <strong>{state.domes}</strong> · Vinculadas: <strong>{state.linkedDomes}</strong></p>
 <p>Propostas aceitas: <strong>{state.accepted}</strong> · Clientes vinculados: <strong>{state.linkedClients}</strong> · Reservas: <strong>{state.booked}</strong></p>
 {state.error.map(e=><p role="alert" key={e}>{e}</p>)}
 <p style={{fontSize:13}}>Leitura em tempo real, sem gravar dados. Zero não significa falha quando o cadastro ainda não foi feito.</p></>}
 <button type="button" onClick={()=>void refresh()} style={{padding:'10px 14px',background:'#1d4ed8',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>Atualizar situação</button>
 </section>;
}
