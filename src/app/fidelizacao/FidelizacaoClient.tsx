'use client';
import {useEffect,useMemo,useState} from 'react';

type Client={id:string;name:string;kind:string;status:string;city:string|null};
type Event={id:string;client_id:string;status:string;event_date:string|null;title:string};
type Action={id:string;client_id:string;client_name:string;action_kind:string;due_date:string|null;priority:string;status:string;note:string};
type Item={client:Client;completed:number;last:Date|null;days:number|null;tier:string;alert:string;priority:number};
const DAY=86400000;
function parseDate(value:string|null):Date|null{
 if(!value)return null;
 const date=new Date(value.slice(0,10)+'T12:00:00Z');
 return Number.isNaN(date.getTime())?null:date;
}
export default function FidelizacaoClient(){
 const [clients,setClients]=useState<Client[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('all');
 const [radarPage,setRadarPage]=useState(0);
 const [showHistory,setShowHistory]=useState(false);
 const [threshold,setThreshold]=useState(90);
 const [actions,setActions]=useState<Action[]>([]);
 const [selected,setSelected]=useState('');
 const [due,setDue]=useState('');
 const [kind,setKind]=useState('follow_up');
 const [priority,setPriority]=useState('normal');
 const [note,setNote]=useState('');
 const [saving,setSaving]=useState(false);
 const [feedback,setFeedback]=useState('');
 async function refreshActions(){
  const r=await fetch('/api/fidelizacao/acoes',{cache:'no-store'});const d=await r.json();
  if(!r.ok)throw Error(d.error||'Falha ao carregar lembretes');setActions(d.actions||[]);
 }
 useEffect(()=>{refreshActions().catch(e=>setFeedback(e.message));},[]);
 async function saveAction(command:'create'|'complete'|'dismiss',id?:string){
  setSaving(true);setFeedback('');
  try{
   const r=await fetch('/api/fidelizacao/acoes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,id,clientId:selected,date:due||null,kind,priority,note})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível salvar');
   await refreshActions();setNote('');setDue('');setFeedback('Lembrete atualizado com sucesso.');
  }catch(e){setFeedback(e instanceof Error?e.message:'Erro inesperado');}
  finally{setSaving(false);}
 }
 useEffect(()=>{
  const ctrl=new AbortController();
  fetch('/api/crm/clientes',{cache:'no-store',signal:ctrl.signal}).then(async r=>{
   const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao carregar dados.');
   setClients(d.clients||[]);setEvents(d.events||[]);
  }).catch(e=>{if(e.name!=='AbortError')setError(e.message||'Erro ao carregar');}).finally(()=>setLoading(false));
  return ()=>ctrl.abort();
 },[]);
 const items=useMemo<Item[]>(()=>{
  const now=new Date();const year=now.getUTCFullYear();
  return clients.filter(c=>c.kind==='school'||c.kind==='company'||c.kind==='association').map(client=>{
   const completed=events.filter(e=>e.client_id===client.id&&e.status==='completed');
   const dated=completed.map(e=>parseDate(e.event_date)).filter((d):d is Date=>d!==null).sort((a,b)=>b.getTime()-a.getTime());
   const last=dated[0]||null;
   const days=last?Math.max(0,Math.floor((now.getTime()-last.getTime())/DAY)):null;
   const yearly=dated.filter(d=>d.getUTCFullYear()===year).length;
   const tier=yearly>=4?'Ouro':yearly>=2?'Prata':yearly===1?'Bronze':'Sem categoria';
   const alert=days!==null&&days>=threshold?'Retomar contato':completed.length===0?'Novo / sem visita realizada':days!==null&&days>=60?'Acompanhar':'Relacionamento recente';
   return {client,completed:yearly,last,days,tier,alert,priority:days!==null&&days>=threshold?0:days!==null&&days>=60?2:3};
  }).sort((a,b)=>a.priority-b.priority||((b.days||0)-(a.days||0)));
 },[clients,events,threshold]);
 const radar=useMemo(()=>{
  const withoutVisit=items.filter(i=>i.last===null);
  const inactive=items.filter(i=>i.days!==null&&i.days>=threshold);
  const attention=items.filter(i=>i.days!==null&&i.days>=60&&i.days<threshold);
  const recurring=items.filter(i=>i.completed>=2);
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const overdue=actions.filter(a=>a.status==='open'&&a.due_date&&String(a.due_date).slice(0,10)<today);
  const suggestions=[
   ...inactive.map(i=>({id:i.client.id,name:i.client.name,reason:'Sem visita concluída há '+i.days+' dias',tip:'Avaliar oferta de nova apresentação',rank:0})),
   ...attention.map(i=>({id:i.client.id,name:i.client.name,reason:'Última visita há '+i.days+' dias',tip:'Programar acompanhamento',rank:1})),
   ...recurring.filter(i=>i.priority!==0).map(i=>({id:i.client.id,name:i.client.name,reason:i.completed+' apresentações neste ano',tip:'Avaliar pacote de renovação',rank:2})),
   ...withoutVisit.map(i=>({id:i.client.id,name:i.client.name,reason:'Nenhuma visita concluída',tip:'Verificar negociação da primeira visita',rank:3}))
  ].sort((a,b)=>a.rank-b.rank);
  return {withoutVisit:withoutVisit.length,inactive:inactive.length,attention:attention.length,recurring:recurring.length,overdue:overdue.length,suggestions};
 },[items,actions,threshold]);
 const radarPages=Math.max(1,Math.ceil(radar.suggestions.length/10));
 const currentRadarPage=Math.min(radarPage,radarPages-1);
 const displayed=items.filter(i=>filter==='all'||(filter==='attention'?i.priority<=2:i.tier===filter));
 const count=(tier:string)=>items.filter(i=>i.tier===tier).length;
 const dateLabel=(d:Date|null)=>d?d.toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
 const shortAlert=(i:Item)=>i.last===null?'Primeira visita':i.alert==='Novo / sem visita realizada'?'Primeira visita':i.alert;
 return <><style>{`
 .fidelizacao-section-heading{color:#fff!important;font-size:20px;font-weight:750;background:linear-gradient(105deg,#173f7c,#2477d8);color:white;padding:13px 16px;border-radius:10px;margin:-3px -3px 15px}
 .fidelizacao-opportunity-compact{padding:5px 10px!important;min-height:0!important;gap:8px!important;align-items:center!important}
 .fidelizacao-opportunity-compact strong{font-size:13px}
 .fidelizacao-opportunity-compact .fidelizacao-button{padding:6px 10px!important;font-size:12px;white-space:nowrap}
 .fidelizacao-kpi-compact{padding:9px 13px!important;min-height:0!important;background:#eaf3ff!important;border-color:#c9dcf7!important}
 .fidelizacao-kpi-compact:nth-child(2){background:#e5f1ff!important}
 .fidelizacao-kpi-compact:nth-child(3){background:#edf0ff!important}
 .fidelizacao-kpi-compact:nth-child(4){background:#e5f6fb!important}
 .fidelizacao-kpi-compact:nth-child(5){background:#eaf0fb!important}
 .fidelizacao-kpi-compact small{font-size:11px!important;color:#305c98!important}
 .fidelizacao-kpi-compact>div{line-height:1.2!important;margin-top:3px!important}
 .fidelizacao-attention-table{font-size:12px;line-height:1.25}
 .fidelizacao-attention-table thead{background:#dceafd;color:#17467f}
 .fidelizacao-attention-table tbody tr:nth-child(odd){background:#f0f6ff}
 .fidelizacao-attention-table tbody tr:nth-child(even){background:#fff}
 .fidelizacao-attention-table tbody tr:hover{background:#e1eeff}
 .fidelizacao-attention-table tbody td:first-child strong{color:#1554a0}
 .fidelizacao-attention-table tbody td:last-child{color:#245b9b;font-weight:600}
 .fidelizacao-attention-table + *{margin-top:0}\n .fidelizacao-attention-table td{padding:7px 10px;border-bottom:1px solid #e1e8f1}\n .fidelizacao-attention-table th{font-size:12px}\n .fidelizacao-radar-kpi{padding:8px 10px!important;min-height:0!important}\n .fidelizacao-radar-kpi small{font-size:11px!important}\n .fidelizacao-radar-kpi>div{font-size:20px!important;line-height:1.2!important}\n .fidelizacao-radar-kpi{background:#eaf3ff!important;border:1px solid #c9dcf7!important;border-radius:8px;color:#17467f!important}
 .fidelizacao-radar-kpi small{font-size:12px!important;font-weight:600!important;color:#305c98!important}
 .fidelizacao-radar-kpi>div{font-size:18px!important;font-weight:800!important;color:#17467f!important}
 .fidelizacao-radar-subtitle{font-size:12px;font-weight:750;color:#17467f;margin-bottom:10px}
 .fidelizacao-opportunity-compact{background:#f0f6ff!important;border:1px solid #d4e3f8!important;border-radius:7px!important}
 .fidelizacao-opportunity-compact:nth-child(even){background:#fff!important}
 .fidelizacao-opportunity-compact:hover{background:#e1eeff!important}
 .fidelizacao-opportunity-compact strong{font-size:12px!important;font-weight:750!important;color:#1554a0!important}
 .fidelizacao-opportunity-compact{padding:2px 8px!important;min-height:26px!important;gap:6px!important;border-radius:4px!important}
 .fidelizacao-opportunity-compact strong{font-size:12px!important;line-height:1.2!important}
 .fidelizacao-opportunity-compact .fidelizacao-button{padding:4px 8px!important;font-size:11px!important;line-height:1.15!important;border-radius:5px!important}
 .fidelizacao-radar-list{gap:3px!important}
 .fidelizacao-pagination{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:14px;font-size:13px}
 .fidelizacao-pagination>div{display:flex;gap:8px}
 .fidelizacao-tier-card:nth-child(1){background:#fff5e9!important;border-color:#d4a06a!important}
 .fidelizacao-tier-card:nth-child(2){background:#eff3fa!important;border-color:#9eafc6!important}
 .fidelizacao-tier-card:nth-child(3){background:#fff9e5!important;border-color:#d6b45b!important}
 .fidelizacao-reminder{background:#eef5ff;border:1px solid #c3d8f5;border-radius:10px;padding:12px}
 .fidelizacao-page select,.fidelizacao-page input,.fidelizacao-page textarea{background:#f1f7ff!important;border-color:#a9c9ef!important}
 .fidelizacao-page button:not(:disabled){transition:background .15s,border-color .15s}
 .fidelizacao-pagination button{padding:8px 12px;border:1px solid #a9c2e4;border-radius:8px;background:#eaf2ff;color:#154783;font-weight:650;cursor:pointer}
 .fidelizacao-pagination button:disabled{opacity:.45;cursor:not-allowed}
 `}</style><main className="fidelizacao-page" style={{maxWidth:1180,margin:'0 auto',padding:'16px 18px 32px',fontFamily:'system-ui',color:'#142b4f'}}>

 <header className="fidelizacao-hero"><div className="fidelizacao-eyebrow">ANTARES BUSINESS · RELACIONAMENTO</div><h1>Fidelização e Relacionamento</h1></header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12}}>
 {([['Instituições',items.length],['Ouro',count('Ouro')],['Prata',count('Prata')],['Bronze',count('Bronze')],['Precisam de atenção',items.filter(i=>i.priority<=2).length]] as [string,number][]).map(([k,v])=>
 <div key={k} className="fidelizacao-kpi fidelizacao-kpi-compact"><small>{k}</small><div style={{fontSize:22,fontWeight:800}}>{v}</div></div>)}
 </div>
 <section className="fidelizacao-panel">
 <h2 className="fidelizacao-section-heading">ANTARES Intelligence · Radar comercial</h2>
 
 <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
 {([['Primeira visita pendente',radar.withoutVisit],['Retorno em atenção',radar.inactive],['Acompanhar',radar.attention],['Recorrentes no ano',radar.recurring],['Lembretes vencidos',radar.overdue]] as [string,number][]).map(([label,total])=><div key={label} className="fidelizacao-radar-kpi" style={{flex:'1 1 140px'}}><small>{label}</small><div style={{fontSize:25,fontWeight:800}}>{total}</div></div>)}
 </div>
 <h3 className="fidelizacao-radar-subtitle">Radar de Fidelização</h3>
 {loading?<p>Carregando...</p>:error?<p role="alert">{error}</p>:radar.suggestions.length===0?<p>Sem oportunidades identificadas.</p>:<div className="fidelizacao-radar-list" style={{display:'grid',gap:3}}>{radar.suggestions.slice(currentRadarPage*10,(currentRadarPage+1)*10).map(o=><div key={o.id+o.rank} className="fidelizacao-opportunity fidelizacao-opportunity-compact"><div><strong>{o.name}</strong></div><button type="button" className="fidelizacao-button" onClick={()=>{setSelected(o.id);document.getElementById('agenda-relacionamento')?.scrollIntoView({behavior:'smooth'});}}>Programar contato</button></div>)}</div>}
 {radar.suggestions.length>10&&<nav aria-label="Páginas do radar comercial" className="fidelizacao-pagination"><span>Exibindo {currentRadarPage*10+1}–{Math.min((currentRadarPage+1)*10,radar.suggestions.length)} de {radar.suggestions.length} escolas · Página {currentRadarPage+1} de {radarPages}</span><div><button type="button" disabled={currentRadarPage===0} onClick={()=>setRadarPage(p=>Math.max(0,p-1))}>Anterior</button><button type="button" disabled={currentRadarPage>=radarPages-1} onClick={()=>setRadarPage(p=>Math.min(radarPages-1,p+1))}>Próxima</button></div></nav>}

 </section>
 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 className="fidelizacao-section-heading">Programa de Fidelização</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginTop:14}}>
 {[
 {name:'Ouro',count:'4 ou mais visitas concluídas',ideas:'Parceiros especiais: fortalecer a parceria, antecipar o planejamento anual e propor experiências exclusivas.'},
 {name:'Prata',count:'2 ou 3 visitas concluídas',ideas:'Parcerias em crescimento: apresentar novos temas e incentivar uma programação recorrente.'},
 {name:'Bronze',count:'1 visita concluída',ideas:'Novas parcerias: agradecer a primeira experiência, acompanhar a satisfação e incentivar uma segunda visita.'}
 ].map(t=><div key={t.name} className={'fidelizacao-tier fidelizacao-tier-'+t.name.toLowerCase()}>
 <strong>✦ {t.name}</strong><div style={{fontSize:13,margin:'6px 0'}}>{t.count}</div><p style={{fontSize:13}}>{t.ideas}</p></div>)}
 </div>
 </section>
 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 className="fidelizacao-section-heading">Central de atenção aos clientes</h2>
 
 <div style={{display:'flex',flexWrap:'wrap',gap:12,margin:'15px 0'}}>
 <label>Mostrar <select value={filter} onChange={e=>setFilter(e.target.value)} style={{marginLeft:8,padding:8,border:'1px solid #9db1cd',borderRadius:8,background:'white',color:'#142b4f'}}>
 <option value="all">Todas</option><option value="attention">Precisam de atenção</option><option value="Ouro">Ouro</option><option value="Prata">Prata</option><option value="Bronze">Bronze</option></select></label>
 <label>Alerta após <select value={threshold} onChange={e=>setThreshold(Number(e.target.value))} style={{marginLeft:8,padding:8,border:'1px solid #9db1cd',borderRadius:8,background:'white',color:'#142b4f'}}><option value={90}>90 dias</option><option value={120}>120 dias</option><option value={180}>180 dias</option></select></label>
 </div>
 {loading?<p>Carregando dados da organização...</p>:error?<p role="alert">{error}</p>:displayed.length===0?<p>Nenhuma instituição nesta categoria.</p>:
 <div style={{overflowX:'auto'}}><table className="fidelizacao-attention-table" style={{width:'100%',borderCollapse:'collapse',textAlign:'left',minWidth:680}}>
 <thead><tr>{['Instituição','Categoria','Visitas','Última visita','Atenção'].map(c=><th key={c} style={{padding:'8px 10px',borderBottom:'1px solid #c3d1e6'}}>{c}</th>)}</tr></thead>
 <tbody>{displayed.map(i=><tr key={i.client.id}><td style={{padding:'7px 10px',borderBottom:'1px solid #e1e8f1'}}><strong>{i.client.name}</strong></td>
 <td>{i.tier==='Sem categoria'?'—':i.tier}</td><td>{i.completed}</td><td>{dateLabel(i.last)}</td><td>{shortAlert(i)}</td></tr>)}</tbody>
 </table></div>}
 </section>

 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 id="agenda-relacionamento" className="fidelizacao-section-heading">Agenda interna de relacionamento</h2>
 <div className="fidelizacao-form-grid">
 <label>Instituição<select value={selected} onChange={e=>setSelected(e.target.value)} style={{display:'block',padding:9,maxWidth:230}}><option value="">Selecione</option>{items.map(i=><option key={i.client.id} value={i.client.id}>{i.client.name}</option>)}</select></label>
 <label>Ação<select value={kind} onChange={e=>setKind(e.target.value)} style={{display:'block',padding:9}}><option value="follow_up">Retomar contato</option><option value="renewal">Renovação</option><option value="feedback">Pedir avaliação</option><option value="offer">Nova experiência</option><option value="other">Outra</option></select></label>
 <label>Data prevista<input type="date" value={due} onChange={e=>setDue(e.target.value)} style={{display:'block',padding:8}}/></label>
 <label>Prioridade<select value={priority} onChange={e=>setPriority(e.target.value)} style={{display:'block',padding:9}}><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baixa</option></select></label>
 </div>
 <label>Observação<input value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} placeholder="Ex.: oferecer sessão de galáxias no próximo bimestre" style={{display:'block',padding:10,width:'100%',margin:'6px 0 12px'}}/></label>
 <button disabled={saving||!selected} onClick={()=>saveAction('create')} className="fidelizacao-button">{saving?'Salvando...':'Criar lembrete interno'}</button>
 {feedback&&<p role="status" style={{marginTop:10}}>{feedback}</p>}
 <h3 style={{marginTop:22,fontWeight:700}}>Lembretes registrados ({actions.filter(a=>a.status==='open').length} em aberto)</h3>
 <div style={{display:'grid',gap:10,marginTop:10}}>
 {actions.filter(a=>a.status==='open').length===0?<p>Nenhum lembrete cadastrado.</p>:actions.filter(a=>a.status==='open').map(a=><div key={a.id} className={'fidelizacao-reminder '+(a.status==='open'?'fidelizacao-reminder-open':'fidelizacao-reminder-closed')}>
 <div><strong>{a.client_name}</strong> <span className={'fidelizacao-status '+(a.status==='open'?'is-open':'is-closed')}>{a.status==='open'?'Em aberto':a.status==='done'?'Concluído':'Dispensado'}</span><div style={{fontSize:13}}>Tipo: {a.action_kind} · Prioridade: {a.priority} · {a.status==='open'?'Em aberto':a.status==='done'?'Concluído':'Dispensado'}</div><div style={{fontSize:13}}>Prazo: {a.due_date?String(a.due_date).slice(0,10).split('-').reverse().join('/'):'Sem data'}</div><div>{a.note}</div></div>
 {a.status==='open'&&<div style={{display:'flex',alignItems:'center',gap:8}}><button disabled={saving} onClick={()=>saveAction('complete',a.id)}>Concluir</button><button disabled={saving} onClick={()=>saveAction('dismiss',a.id)}>Dispensar</button></div>}</div>)}
 </div>
 {actions.some(a=>a.status!=='open')&&<div style={{marginTop:14}}><button type="button" onClick={()=>setShowHistory(v=>!v)} aria-expanded={showHistory}>{showHistory?'Ocultar':'Mostrar'} histórico ({actions.filter(a=>a.status!=='open').length})</button>{showHistory&&<div style={{display:'grid',gap:8,marginTop:10}}>{actions.filter(a=>a.status!=='open').map(a=><div key={a.id} className="fidelizacao-reminder fidelizacao-reminder-closed"><strong>{a.client_name}</strong><span> · {a.status==='done'?'Concluído':'Dispensado'}</span><div>{a.note}</div></div>)}</div>}</div>}
 </section>
 </main></>;
}
