'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';

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
 const displayed=items.filter(i=>filter==='all'||(filter==='attention'?i.priority<=2:i.tier===filter));
 const count=(tier:string)=>items.filter(i=>i.tier===tier).length;
 const dateLabel=(d:Date|null)=>d?d.toLocaleDateString('pt-BR',{timeZone:'UTC'}):'Nenhuma visita concluída';
 return <main style={{maxWidth:1180,margin:'0 auto',padding:'28px 18px',fontFamily:'system-ui'}}>
 <Link href="/">← Voltar ao painel</Link>
 <div style={{margin:'22px 0'}}><div style={{fontSize:12,letterSpacing:2,color:'#315a96'}}>ANTARES BUSINESS · BLOCO 06B</div>
 <h1 style={{fontSize:30,fontWeight:800}}>Fidelização e Relacionamento</h1>
 <p>Alertas internos para ajudar o proprietário a decidir quem merece atenção. Nenhuma mensagem é enviada automaticamente.</p></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12}}>
 {([['Instituições',items.length],['Ouro',count('Ouro')],['Prata',count('Prata')],['Bronze',count('Bronze')],['Precisam de atenção',items.filter(i=>i.priority<=2).length]] as [string,number][]).map(([k,v])=>
 <div key={k} style={{border:'1px solid #a9bdd8',borderRadius:12,padding:17}}><small>{k}</small><div style={{fontSize:27,fontWeight:800}}>{v}</div></div>)}
 </div>
 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 style={{fontWeight:750,fontSize:21}}>Central de atenção aos clientes</h2>
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
 <h2 style={{fontSize:21,fontWeight:750}}>Agenda interna de relacionamento</h2>
 <p style={{fontSize:13}}>Registre contatos e programe retornos. O ANTARES não envia mensagens automaticamente.</p>
 <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end',margin:'16px 0'}}>
 <label>Instituição<select value={selected} onChange={e=>setSelected(e.target.value)} style={{display:'block',padding:9,maxWidth:230}}><option value="">Selecione</option>{items.map(i=><option key={i.client.id} value={i.client.id}>{i.client.name}</option>)}</select></label>
 <label>Ação<select value={kind} onChange={e=>setKind(e.target.value)} style={{display:'block',padding:9}}><option value="follow_up">Retomar contato</option><option value="renewal">Renovação</option><option value="feedback">Pedir avaliação</option><option value="offer">Nova experiência</option><option value="other">Outra</option></select></label>
 <label>Data prevista<input type="date" value={due} onChange={e=>setDue(e.target.value)} style={{display:'block',padding:8}}/></label>
 <label>Prioridade<select value={priority} onChange={e=>setPriority(e.target.value)} style={{display:'block',padding:9}}><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baixa</option></select></label>
 </div>
 <label>Observação<input value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} placeholder="Ex.: oferecer sessão de galáxias no próximo bimestre" style={{display:'block',padding:10,width:'100%',margin:'6px 0 12px'}}/></label>
 <button disabled={saving||!selected} onClick={()=>saveAction('create')} style={{padding:'10px 18px',background:'#2058d4',color:'white',borderRadius:8}}>{saving?'Salvando...':'Criar lembrete interno'}</button>
 {feedback&&<p role="status" style={{marginTop:10}}>{feedback}</p>}
 <h3 style={{marginTop:22,fontWeight:700}}>Lembretes registrados ({actions.filter(a=>a.status==='open').length} em aberto)</h3>
 <div style={{display:'grid',gap:10,marginTop:10}}>
 {actions.length===0?<p>Nenhum lembrete cadastrado.</p>:actions.map(a=><div key={a.id} style={{border:'1px solid #d0dcf0',padding:13,borderRadius:10,display:'flex',gap:12,justifyContent:'space-between',flexWrap:'wrap'}}>
 <div><strong>{a.client_name}</strong><div style={{fontSize:13}}>Tipo: {a.action_kind} · Prioridade: {a.priority} · {a.status==='open'?'Em aberto':a.status==='done'?'Concluído':'Dispensado'}</div><div style={{fontSize:13}}>Prazo: {a.due_date?String(a.due_date).slice(0,10).split('-').reverse().join('/'):'Sem data'}</div><div>{a.note}</div></div>
 {a.status==='open'&&<div style={{display:'flex',alignItems:'center',gap:8}}><button disabled={saving} onClick={()=>saveAction('complete',a.id)}>Concluir</button><button disabled={saving} onClick={()=>saveAction('dismiss',a.id)}>Dispensar</button></div>}</div>)}
 </div>
 </section>
 <p style={{fontSize:12,opacity:.8,marginTop:16}}>Painel somente leitura. Alertas sugeridos, não confirmações de abandono ou interesse comercial. Para ações manuais e histórico completo, utilize Clientes e Eventos. A agenda de tarefas editáveis e o controle de cúpulas serão integrados em etapa posterior.</p>
 </main>;
}
