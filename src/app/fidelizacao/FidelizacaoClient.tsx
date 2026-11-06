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
 const dateLabel=(d:Date|null)=>d?d.toLocaleDateString('pt-BR',{timeZone:'UTC'}):'Nenhuma visita concluída';
 return <><style>{`
 .fidelizacao-section-heading{font-size:20px;font-weight:750;background:linear-gradient(105deg,#173f7c,#2477d8);color:white;padding:13px 16px;border-radius:10px;margin:-3px -3px 15px}
 .fidelizacao-opportunity-compact{padding:8px 12px!important;min-height:0!important;gap:12px!important}
 .fidelizacao-opportunity-compact strong{font-size:13px}
 .fidelizacao-opportunity-compact .fidelizacao-button{padding:8px 11px;font-size:12px;white-space:nowrap}
 .fidelizacao-pagination{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:14px;font-size:13px}
 .fidelizacao-pagination>div{display:flex;gap:8px}
 .fidelizacao-pagination button{padding:8px 12px;border:1px solid #a9c2e4;border-radius:8px;background:#eaf2ff;color:#154783;font-weight:650;cursor:pointer}
 .fidelizacao-pagination button:disabled{opacity:.45;cursor:not-allowed}
 `}</style><main className="fidelizacao-page" style={{maxWidth:1180,margin:'0 auto',padding:'16px 18px 32px',fontFamily:'system-ui',color:'#142b4f'}}>

 <header className="fidelizacao-hero"><div className="fidelizacao-eyebrow">ANTARES BUSINESS · RELACIONAMENTO</div><h1>Fidelização e Relacionamento</h1><p>Acompanhe instituições, oportunidades e próximos contatos. Nenhuma mensagem é enviada automaticamente.</p></header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12}}>
 {([['Instituições',items.length],['Ouro',count('Ouro')],['Prata',count('Prata')],['Bronze',count('Bronze')],['Precisam de atenção',items.filter(i=>i.priority<=2).length]] as [string,number][]).map(([k,v])=>
 <div key={k} className="fidelizacao-kpi"><small>{k}</small><div style={{fontSize:27,fontWeight:800}}>{v}</div></div>)}
 </div>
 <section className="fidelizacao-panel">
 <h2 className="fidelizacao-section-heading">ANTARES Intelligence · Radar comercial</h2>
 <p>Oportunidades calculadas a partir de apresentações concluídas, sem enviar mensagens nem conceder descontos.</p>
 <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
 {([['Primeira visita pendente',radar.withoutVisit],['Retorno em atenção',radar.inactive],['Acompanhar',radar.attention],['Recorrentes no ano',radar.recurring],['Lembretes vencidos',radar.overdue]] as [string,number][]).map(([label,total])=><div key={label} className="fidelizacao-radar-kpi" style={{flex:'1 1 140px'}}><small>{label}</small><div style={{fontSize:25,fontWeight:800}}>{total}</div></div>)}
 </div>
 <h3 style={{fontWeight:700,marginBottom:10}}>Oportunidades sugeridas</h3>
 {loading?<p>Carregando...</p>:error?<p role="alert">{error}</p>:radar.suggestions.length===0?<p>Sem oportunidades identificadas.</p>:<div style={{display:'grid',gap:9}}>{radar.suggestions.slice(currentRadarPage*10,(currentRadarPage+1)*10).map(o=><div key={o.id+o.rank} className="fidelizacao-opportunity fidelizacao-opportunity-compact"><div><strong>{o.name}</strong><div style={{fontSize:13}}>{o.reason}</div><div style={{fontSize:13,color:'#315a96'}}>{o.tip}</div></div><button type="button" className="fidelizacao-button" onClick={()=>{setSelected(o.id);document.getElementById('agenda-relacionamento')?.scrollIntoView({behavior:'smooth'});}}>Programar contato</button></div>)}</div>}
 {radar.suggestions.length>10&&<nav aria-label="Páginas do radar comercial" className="fidelizacao-pagination"><span>Exibindo {currentRadarPage*10+1}–{Math.min((currentRadarPage+1)*10,radar.suggestions.length)} de {radar.suggestions.length} escolas · Página {currentRadarPage+1} de {radarPages}</span><div><button type="button" disabled={currentRadarPage===0} onClick={()=>setRadarPage(p=>Math.max(0,p-1))}>Anterior</button><button type="button" disabled={currentRadarPage>=radarPages-1} onClick={()=>setRadarPage(p=>Math.min(radarPages-1,p+1))}>Próxima</button></div></nav>}
 <p style={{fontSize:12,opacity:.75,marginTop:12}}>Indicadores de relacionamento são estimativas para auxiliar o acompanhamento das instituições, não conclusões definitivas.</p>
 </section>
 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 className="fidelizacao-section-heading">Central de atenção aos clientes</h2>
 <p style={{fontSize:13}}>Classificação por apresentações concluídas no ano atual: Bronze (1), Prata (2–3), Ouro (4+). Eventos cancelados, reservados ou apenas orçados não contam.</p>
 <div style={{display:'flex',flexWrap:'wrap',gap:12,margin:'15px 0'}}>
 <label>Mostrar <select value={filter} onChange={e=>setFilter(e.target.value)} style={{marginLeft:8,padding:8,border:'1px solid #9db1cd',borderRadius:8,background:'white',color:'#142b4f'}}>
 <option value="all">Todas</option><option value="attention">Precisam de atenção</option><option value="Ouro">Ouro</option><option value="Prata">Prata</option><option value="Bronze">Bronze</option></select></label>
 <label>Alerta após <select value={threshold} onChange={e=>setThreshold(Number(e.target.value))} style={{marginLeft:8,padding:8,border:'1px solid #9db1cd',borderRadius:8,background:'white',color:'#142b4f'}}><option value={90}>90 dias</option><option value={120}>120 dias</option><option value={180}>180 dias</option></select></label>
 </div>
 {loading?<p>Carregando dados da organização...</p>:error?<p role="alert">{error}</p>:displayed.length===0?<p>Nenhuma instituição nesta categoria.</p>:
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',minWidth:680}}>
 <thead><tr>{['Instituição','Categoria','Visitas no ano','Última visita','Atenção recomendada'].map(c=><th key={c} style={{padding:12,borderBottom:'1px solid #c3d1e6'}}>{c}</th>)}</tr></thead>
 <tbody>{displayed.map(i=><tr key={i.client.id}><td style={{padding:12,borderBottom:'1px solid #e1e8f1'}}><strong>{i.client.name}</strong><div style={{fontSize:12}}>{i.client.city||'Cidade não informada'}</div></td>
 <td>{i.tier}</td><td>{i.completed}</td><td>{dateLabel(i.last)}</td><td>{i.alert}{i.days!==null?' ('+i.days+' dias)':''}</td></tr>)}</tbody>
 </table></div>}
 </section>
 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 className="fidelizacao-section-heading">Programa de relacionamento por instituição</h2>
 <p>As categorias representam visitas concluídas no ano, não descontos ou benefícios concedidos automaticamente.</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginTop:14}}>
 {[
 {name:'Bronze',count:'1 visita concluída',ideas:'Agradecimento, material de apoio e convite para nova sessão.'},
 {name:'Prata',count:'2 ou 3 visitas concluídas',ideas:'Avaliar pacote anual, indicação e prioridade de negociação.'},
 {name:'Ouro',count:'4 ou mais visitas concluídas',ideas:'Planejar agenda anual, sessões temáticas e prioridade de planejamento.'}
 ].map(t=><div key={t.name} className={'fidelizacao-tier fidelizacao-tier-'+t.name.toLowerCase()}>
 <strong>✦ {t.name}</strong><div style={{fontSize:13,margin:'6px 0'}}>{t.count}</div><p style={{fontSize:13}}>{t.ideas}</p></div>)}
 </div>
 <p style={{fontSize:12,marginTop:12}}>Pacotes anuais, prioridade de agenda e indicações premiadas são possibilidades comerciais sujeitas à aprovação do proprietário, disponibilidade e condições definidas em proposta. Nenhuma vantagem é concedida por este painel.</p>
 </section>
 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 id="agenda-relacionamento" className="fidelizacao-section-heading">Agenda interna de relacionamento</h2>
 <p style={{fontSize:13}}>Registre contatos e programe retornos. O ANTARES não envia mensagens automaticamente.</p>
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
 <p style={{fontSize:12,opacity:.8,marginTop:16}}>As recomendações são somente orientativas. A agenda permite cadastrar e concluir lembretes internos; não envia mensagens. A disponibilidade das cúpulas é gerenciada na Agenda.</p>
 </main></>;
}
