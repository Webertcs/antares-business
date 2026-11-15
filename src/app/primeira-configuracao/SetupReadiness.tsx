'use client';
import {useEffect,useState} from 'react';

type State={provider:boolean;domes:number|null;linkedDomes:number|null;accepted:number|null;linkedClients:number|null;booked:number|null;error:string[]};
export default function SetupReadiness(){
 const [state,setState]=useState<State|null>(null);
 const [loading,setLoading]=useState(false);
 async function refresh(){
  setLoading(true);
  try{
   const errors:string[]=[];
   const [p,a]=await Promise.allSettled([
    fetch('/api/configuracoes/prestador',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Dados da empresa indisponíveis');return r.json()}),
    fetch('/api/agenda/reservas',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Dados de reservas indisponíveis');return r.json()})
   ]);
   if(p.status==='rejected')errors.push(p.reason instanceof Error?p.reason.message:'Não foi possível consultar a empresa');
   if(a.status==='rejected')errors.push(a.reason instanceof Error?a.reason.message:'Não foi possível consultar as reservas');
   const data=a.status==='fulfilled'?a.value:null;
   setState({
    provider:p.status==='fulfilled'&&!!p.value?.profile,
    domes:Array.isArray(data?.domes)?data.domes.length:null,
    linkedDomes:Array.isArray(data?.domes)?data.domes.filter((d:{mapped:boolean})=>d.mapped).length:null,
    accepted:Array.isArray(data?.proposals)?data.proposals.length:null,
    linkedClients:Array.isArray(data?.proposals)?data.proposals.filter((x:{mapped:boolean})=>x.mapped).length:null,
    booked:Array.isArray(data?.links)?data.links.length:null,
    error:errors
   });
  }finally{setLoading(false)}
 }
 useEffect(()=>{void refresh()},[]);
 return <section className="antares-setup__readiness">
  <div className="antares-setup__sectiontop">
   <h2>Situação atual</h2>
   <button type="button" className="antares-setup__refresh" disabled={loading} onClick={()=>void refresh()}>{loading?'Atualizando...':'↻ Atualizar'}</button>
  </div>
  {!state?<p className="antares-setup__loading">Consultando informações...</p>:<>
   <div className="antares-setup__metrics">
    <div className="antares-setup__metric">
     <span className="antares-setup__metric-label">Minha Empresa</span>
     <strong className="antares-setup__metric-value antares-setup__metric-value--text">{state.error.some(e=>e.includes('empresa'))?'Indisponível':state.provider?'Cadastrada':'Pendente'}</strong>
    </div>
    <div className="antares-setup__metric">
     <span className="antares-setup__metric-label">Cúpulas cadastradas</span>
     <strong className="antares-setup__metric-value">{state.domes??'—'}</strong>
     <p className="antares-setup__metric-hint">{state.linkedDomes===null?'Sem dados':state.linkedDomes+' vinculada(s)'}</p>
    </div>
    <div className="antares-setup__metric">
     <span className="antares-setup__metric-label">Reservas registradas</span>
     <strong className="antares-setup__metric-value">{state.booked??'—'}</strong>
     <p className="antares-setup__metric-hint">{state.accepted===null?'Sem dados':state.accepted+' proposta(s) aceita(s)'}</p>
    </div>
   </div>
   {state.error.map(error=><p className="antares-setup__error" role="alert" key={error}>{error}</p>)}
  </>}
 </section>;
}
