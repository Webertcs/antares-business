'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
type Lead={id:string;responsible_name:string;institution:string;city:string;phone:string;
 audience:string;attendees:number|null;desired_date:string|null;notes:string;status:string;created_at:string};
const label:Record<string,string>={pending:'Pendente',reviewing:'Em análise',converted:'Convertido',archived:'Arquivado'};
const date=(value:string|null)=>value?new Date(value.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'A combinar';
export default function Inbox(){
 const [leads,setLeads]=useState<Lead[]>([]);
 const [error,setError]=useState('');const [busy,setBusy]=useState('');const [filter,setFilter]=useState('all');
 const [loading,setLoading]=useState(true);const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);
  try{const r=await fetch('/api/vitrine/inbox',{cache:'no-store'});const data=await r.json();
   if(!r.ok)throw Error(data.error||'Não foi possível carregar.');
   setLeads(data.leads||[]);setError('');
  }catch(e){setError(e instanceof Error?e.message:'Erro ao consultar');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const shown=useMemo(()=>leads.filter(x=>filter==='all'||x.status===filter),[leads,filter]);
 async function review(id:string,status:string){
  setBusy(id);setNotice('');
  try{const r=await fetch('/api/vitrine/inbox',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({id,status})});const data=await r.json();if(!r.ok)throw Error(data.error||'Falha ao salvar');
   setNotice('Situação atualizada.');await load();
  }catch(e){setNotice(e instanceof Error?e.message:'Falha ao salvar');}
  finally{setBusy('');}
 }
 return <main style={{maxWidth:1180,margin:'0 auto',padding:'28px 18px',fontFamily:'system-ui'}}>
  <Link href="/clientes">← Clientes e eventos</Link>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center',margin:'20px 0'}}>
   <div><small>ANTARES BUSINESS · VITRINE</small><h1 style={{fontSize:30,fontWeight:750}}>Solicitações de orçamento</h1>
    <p>Pedidos enviados por responsáveis de escolas e instituições. Nenhum contrato é criado automaticamente.</p></div>
   <button onClick={()=>void load()} disabled={loading} style={{padding:12,borderRadius:10,border:'1px solid #64748b'}}>Atualizar lista</button>
  </div>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20}}>
   {Object.entries({all:'Todas',pending:'Pendentes',reviewing:'Em análise',archived:'Arquivadas',converted:'Convertidas'})
    .map(([k,v])=><button key={k} onClick={()=>setFilter(k)} aria-pressed={filter===k}
     style={{padding:'10px 14px',borderRadius:10,border:'1px solid #64748b',background:filter===k?'#1d4ed8':'transparent',color:filter===k?'white':'inherit'}}>{v} ({k==='all'?leads.length:leads.filter(l=>l.status===k).length})</button>)}
  </div>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {loading?<p>Carregando solicitações...</p>:!error&&shown.length===0?<p>Nenhuma solicitação nesta categoria.</p>:null}
  <div style={{display:'grid',gap:14}}>
   {shown.map(lead=><article key={lead.id} style={{border:'1px solid #64748b',borderRadius:15,padding:18}}>
    <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
     <h2 style={{fontSize:21,fontWeight:700}}>{lead.institution}</h2>
     <strong>{label[lead.status]||lead.status}</strong>
    </div>
    <p><b>Responsável:</b> {lead.responsible_name} · <b>Cidade:</b> {lead.city}</p>
    <p><b>Público:</b> {lead.audience} · <b>Participantes:</b> {lead.attendees??'A combinar'} · <b>Data desejada:</b> {date(lead.desired_date)}</p>
    <p><b>WhatsApp:</b> {lead.phone} · <b>Recebido:</b> {new Date(lead.created_at).toLocaleString('pt-BR')}</p>
    {lead.notes&&<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><b>Observações:</b> {lead.notes}</p>}
    <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:14}}>
     <a href={'https://wa.me/'+lead.phone.replace(/\D/g,'')+'?text='+encodeURIComponent('Olá, '+lead.responsible_name+'! Recebemos seu pedido de orçamento do planetário para '+lead.institution+'. Podemos conversar?')}
      target="_blank" rel="noopener noreferrer" style={{padding:10,border:'1px solid #64748b',borderRadius:8}}>Conversar no WhatsApp</a>
     {lead.status!=='converted'&&(['pending','reviewing','archived'] as const).filter(s=>s!==lead.status).map(s=>
      <button key={s} disabled={busy===lead.id} onClick={()=>void review(lead.id,s)}
       style={{padding:10,border:'1px solid #64748b',borderRadius:8}}>{s==='reviewing'?'Iniciar análise':s==='pending'?'Reabrir':'Arquivar'}</button>)}
     <Link href="/clientes" style={{padding:10,border:'1px solid #64748b',borderRadius:8}}>Abrir cadastro de clientes</Link>
    </div>
   </article>)}
  </div>
  <p style={{marginTop:24,opacity:.8}}>A conversão vinculada em cliente/proposta será liberada somente após validação da migração, permissões e auditoria. Esta tela não envia mensagens automaticamente.</p>
 </main>;
}
