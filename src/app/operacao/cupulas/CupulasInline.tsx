'use client';
import {useCallback,useEffect,useState} from 'react';
import NovaCupula from './NovaCupula';
import GerenciarCupula from './GerenciarCupula';

type Dome={id:string;name:string;code:string|null;capacity:number|null;active:boolean;mapped:boolean};
export default function CupulasInline(){
 const [domes,setDomes]=useState<Dome[]>([]);
 const [enabled,setEnabled]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const response=await fetch('/api/operacao/cupulas',{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Não foi possível consultar as cúpulas.');
   setDomes(data.domes);setEnabled(data.writesEnabled===true);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar as cúpulas.')}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const onUpdate=()=>{void load()};window.addEventListener('antares:cupulas-atualizadas',onUpdate);return()=>window.removeEventListener('antares:cupulas-atualizadas',onUpdate)},[load]);
 const active=domes.filter(d=>d.active);
 const mapped=domes.filter(d=>d.mapped);
 const names=(items:Dome[])=>items.slice(0,3).map(d=>d.name).join(' · ')||'Nenhuma';
 return <div className="operation-detail" style={{margin:0,maxWidth:'100%'}}>
 <style>{`
 .inline-domes .operation-detail-metrics>div{background:linear-gradient(145deg,#f8fbff,#dcecff);border:1px solid #b8d2f6;border-radius:14px;box-shadow:0 7px 20px rgba(25,83,161,.12);padding:18px}
 .inline-domes .operation-dome-unified{background:linear-gradient(145deg,#f1f7ff,#e2eeff);border:1px solid #b9d3f6;border-radius:16px;box-shadow:0 12px 28px rgba(25,83,161,.12)}
 .inline-domes .operation-dome-card{background:linear-gradient(150deg,#fff,#eaf3ff);border:1px solid #c4d9f5;border-radius:14px;box-shadow:0 6px 16px rgba(20,72,145,.11)}
 .inline-domes .operation-domes-heading{border-bottom:2px solid #c9ddf9;padding-bottom:12px}
 `}</style>
 <div className="inline-domes">
 {loading?<p role="status">Carregando cúpulas...</p>:error?<p role="alert" className="operation-detail-warning">{error} <button type="button" onClick={()=>void load()}>Tentar novamente</button></p>:<>
 <div className="operation-detail-metrics">
  <div><span>Cúpulas cadastradas</span><strong>{domes.length}</strong><p className="operation-metric-names">{names(domes)}</p></div>
  <div><span>Ativas</span><strong>{active.length}</strong><p className="operation-metric-names">{names(active)}</p></div>
  <div><span>Vinculadas à operação</span><strong>{mapped.length}</strong><p className="operation-metric-names">{names(mapped)}</p></div>
 </div>
 <section className="operation-detail-panel operation-dome-unified">
  <div className="operation-domes-heading"><h2>Suas cúpulas</h2><NovaCupula enabled={enabled}/></div>
  {domes.length===0?<div className="operation-detail-empty"><p>Nenhuma cúpula cadastrada.</p></div>:
  <div className="operation-dome-grid">{domes.map(d=><article className="operation-dome-card" key={d.id}>
   <div className="operation-dome-top"><h3>{d.name}</h3><span className={d.active?'operation-status-active':'operation-status-inactive'}>{d.active?'Ativa':'Inativa'}</span></div>
   <dl><div><dt>Código</dt><dd>{d.code||'Não informado'}</dd></div><div><dt>Capacidade</dt><dd>{d.capacity?d.capacity+' pessoas':'Não informada'}</dd></div><div><dt>Vínculo operacional</dt><dd>{d.mapped?'Vinculada':'Sem vínculo'}</dd></div></dl>
   <GerenciarCupula dome={d} enabled={enabled}/>
  </article>)}</div>}
 </section>
 <div style={{textAlign:'right',marginTop:12}}><button className="operation-premium-refresh-button" type="button" onClick={()=>void load()} style={{background:'#e5f0ff',color:'#174e91',border:'1px solid #bad3f5',padding:'8px 14px',borderRadius:9,cursor:'pointer'}}>Atualizar cúpulas</button></div>
 </>}
 </div></div>;
}
