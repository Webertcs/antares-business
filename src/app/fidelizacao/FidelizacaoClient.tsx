'use client';
import {useEffect,useMemo,useState} from 'react';
import {relationshipCycle} from '@/lib/fidelizacao/relationship-cycle';

type Client={id:string;name:string;kind:string;status:string;city:string|null;phone?:string|null};
type Contact={client_id:string;phone:string|null;whatsapp:boolean;is_primary:boolean};
type Event={id:string;client_id:string;status:string;event_date:string|null;title:string};
type Action={archived?:boolean;id:string;client_id:string;client_name:string;action_kind:string;due_date:string|null;priority:string;status:string;note:string};
type Item={client:Client;completed:number;last:Date|null;days:number|null;tier:string;alert:string;priority:number};
function parseDate(value:string|null):Date|null{
 if(!value)return null;
 const date=new Date(value.slice(0,10)+'T12:00:00Z');
 return Number.isNaN(date.getTime())?null:date;
}
export default function FidelizacaoClient(){
 const [clients,setClients]=useState<Client[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [contacts,setContacts]=useState<Contact[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('all');
 const [radarPage,setRadarPage]=useState(0);
 const [attentionPage,setAttentionPage]=useState(0);
 const [showHistory,setShowHistory]=useState(false);
 const [showArchived,setShowArchived]=useState(false);
 const threshold=90;
 const [actions,setActions]=useState<Action[]>([]);
 const [actionsError,setActionsError]=useState('');
 const [actionsLoaded,setActionsLoaded]=useState(false);
 const [selected,setSelected]=useState('');
 const [modalOpen,setModalOpen]=useState(false);
 const [modalFromRadar,setModalFromRadar]=useState(false);
 const [modalTouched,setModalTouched]=useState(false);
 const [due,setDue]=useState('');
 const [kind,setKind]=useState('follow_up');
 const [priority,setPriority]=useState('normal');
 const [note,setNote]=useState('');
 const [saving,setSaving]=useState(false);
 const [feedback,setFeedback]=useState('');
 const [snoozes,setSnoozes]=useState<Record<string,string>>({});
 async function refreshActions(){
  const r=await fetch('/api/fidelizacao/acoes',{cache:'no-store'});const d=await r.json();
  if(!r.ok)throw Error(d.error||'Falha ao carregar lembretes');if(!Array.isArray(d.actions))throw Error('Resposta inválida da agenda');setActions(d.actions);setActionsError('');setActionsLoaded(true);
 }
 const [todayKey,setTodayKey]=useState(()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}));
 useEffect(()=>{
  let active=true;let pending=false;
  const sync=async()=>{
   if(pending||document.visibilityState==='hidden')return;
   pending=true;
   try{
    const [actionsResult,alertsResult,clientsResult]=await Promise.allSettled([
     fetch('/api/fidelizacao/acoes',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao atualizar lembretes');return d;}),
     fetch('/api/fidelizacao/alertas',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Falha ao atualizar alertas');return r.json();}),
     fetch('/api/crm/clientes',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao atualizar clientes');return d;})
    ]);
    if(!active)return;
    if(actionsResult.status==='fulfilled'&&Array.isArray(actionsResult.value.actions)){setActions(actionsResult.value.actions);setActionsError('');setActionsLoaded(true);}else{setActionsError(actionsResult.status==='rejected'?(actionsResult.reason instanceof Error?actionsResult.reason.message:'Falha na consulta de lembretes'):'Resposta inválida da agenda');}
    if(alertsResult.status==='fulfilled')setSnoozes(alertsResult.value.snoozes||{});
    if(clientsResult.status==='fulfilled'){const d=clientsResult.value;setClients(d.clients||[]);setEvents(d.events||[]);setContacts(d.contacts||[]);setError('');}
    setTodayKey(new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}));
   }finally{pending=false;}
  };
  void sync();
  const onResume=()=>{if(document.visibilityState==='visible')void sync();};
  const interval=window.setInterval(onResume,60*1000);
  window.addEventListener('focus',onResume);
  document.addEventListener('visibilitychange',onResume);
  return()=>{active=false;window.clearInterval(interval);window.removeEventListener('focus',onResume);document.removeEventListener('visibilitychange',onResume);};
 },[]);
 async function snooze(clientId:string){
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+14);
  const until=date.toISOString().slice(0,10);
  if(!window.confirm('Adiar o alerta por 14 dias? A contagem desde a última visita continuará normalmente.'))return;
  setSaving(true);setFeedback('');
  try{const r=await fetch('/api/fidelizacao/adiar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId,until})});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível adiar');setSnoozes(p=>({...p,[clientId]:until}));setFeedback('Alerta adiado até '+until.split('-').reverse().join('/')+'.');}
  catch(e){setFeedback(e instanceof Error?e.message:'Erro ao adiar');}finally{setSaving(false);}
 }
 async function manageHistory(id:string,command:'archive'|'restore'){
  if(command==='archive'&&!window.confirm('Arquivar este contato? Ele sairá do histórico principal, mas será preservado para auditoria e poderá ser restaurado.'))return;
  setSaving(true);setFeedback('');
  try{
   const r=await fetch('/api/fidelizacao/historico',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,command})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível atualizar o histórico');
   await refreshActions();setFeedback(command==='archive'?'Contato arquivado com sucesso.':'Contato restaurado com sucesso.');
  }catch(e){setFeedback(e instanceof Error?e.message:'Erro ao atualizar histórico');}
  finally{setSaving(false);}
 }
 async function saveAction(command:'create'|'complete'|'dismiss',id?:string){
  setSaving(true);setFeedback('');
  try{
   const r=await fetch('/api/fidelizacao/acoes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,id,clientId:selected,date:due||null,kind,priority,note})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível salvar');
   await refreshActions();setNote('');setDue('');setFeedback('Lembrete atualizado com sucesso.');
   if(command==='create'){setModalOpen(false);setModalTouched(false);}
  }catch(e){setFeedback(e instanceof Error?e.message:'Erro inesperado');}
  finally{setSaving(false);}
 }
 useEffect(()=>{
  const ctrl=new AbortController();
  fetch('/api/crm/clientes',{cache:'no-store',signal:ctrl.signal}).then(async r=>{
   const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao carregar dados.');
   setClients(d.clients||[]);setEvents(d.events||[]);setContacts(d.contacts||[]);
  }).catch(e=>{if(e.name!=='AbortError')setError(e.message||'Erro ao carregar');}).finally(()=>setLoading(false));
  return ()=>ctrl.abort();
 },[]);
 function openReminder(clientId=''){if(clientId&&actions.some(a=>a.client_id===clientId&&a.status==='open')){setFeedback('Já existe um contato em aberto para esta instituição. Consulte a Agenda Interna.');document.getElementById('agenda-relacionamento')?.scrollIntoView({behavior:'smooth',block:'start'});return;}setModalFromRadar(Boolean(clientId));setSelected(clientId);setDue('');setKind('follow_up');setPriority('normal');setNote('');setFeedback('');setModalTouched(false);setModalOpen(true);}
 function closeReminder(){if(saving)return;if(modalTouched&&!window.confirm('Descartar as alterações do lembrete?'))return;setModalOpen(false);setModalTouched(false);}
 useEffect(()=>{if(!modalOpen)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();if(!saving&&(!modalTouched||window.confirm('Descartar as alterações do lembrete?'))){setModalOpen(false);setModalTouched(false);}}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[modalOpen,modalTouched,saving]);
 const items=useMemo<Item[]>(()=>{
  const year=Number(new Intl.DateTimeFormat('en-US',{year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date()));
  return clients.filter(c=>c.kind==='school'||c.kind==='company'||c.kind==='association').map(client=>{
   // A confirmação verde na Agenda habilita o ciclo; a visita só entra na contagem após sua data.
   // Eventos cancelados, reservados e futuros não contam como visitas realizadas.
   const today=parseDate(new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}))!;
   const completed=events.filter(e=>e.client_id===client.id&&(e.status==='confirmed'||e.status==='completed')&&parseDate(e.event_date)!==null&&parseDate(e.event_date)!.getTime()<=today.getTime());
   const cycle=relationshipCycle(events.filter(e=>e.client_id===client.id),today.toISOString().slice(0,10));
   const dated=completed.map(e=>parseDate(e.event_date)).filter((d):d is Date=>d!==null).sort((a,b)=>b.getTime()-a.getTime());
   const last=dated[0]||null;
   const days=cycle.days;
   const yearly=dated.filter(d=>d.getUTCFullYear()===year).length;
   const tier=yearly>=8?'Diamante':yearly>=4?'Ouro':yearly>=2?'Prata':yearly===1?'Bronze':'Sem categoria';
   const alert=days!==null&&days>=threshold?'Retomar contato':completed.length===0?'Novo / sem visita realizada':days!==null&&days>=60?'Acompanhar':'Relacionamento recente';
   return {client,completed:yearly,last,days,tier,alert,priority:days!==null&&days>=threshold?0:days!==null&&days>=60?2:3};
  }).sort((a,b)=>a.priority-b.priority||((b.days||0)-(a.days||0)));
 },[clients,events,todayKey]);
 const radar=useMemo(()=>{
  const withoutVisit=items.filter(i=>i.last===null);
  const inactive=items.filter(i=>i.days!==null&&i.days>=threshold);
  const attention=items.filter(i=>i.days!==null&&i.days>=60&&i.days<threshold);
  const recurring=items.filter(i=>i.completed>=2);
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  const overdue=actions.filter(a=>a.status==='open'&&a.due_date&&String(a.due_date).slice(0,10)<today);
  const suggestions=[
   ...inactive.map(i=>({id:i.client.id,name:i.client.name,reason:'Sem visita confirmada há '+i.days+' dias',tip:'Avaliar oferta de nova apresentação',rank:0})),
   ...attention.map(i=>({id:i.client.id,name:i.client.name,reason:'Última visita há '+i.days+' dias',tip:'Programar acompanhamento',rank:1})),
   ...recurring.filter(i=>i.priority!==0).map(i=>({id:i.client.id,name:i.client.name,reason:i.completed+' apresentações neste ano',tip:'Avaliar pacote de renovação',rank:2})),
   ...withoutVisit.map(i=>({id:i.client.id,name:i.client.name,reason:'Nenhuma visita confirmada até hoje',tip:'Verificar negociação da primeira visita',rank:3}))
  ].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'}));
  return {withoutVisit:withoutVisit.length,inactive:inactive.length,attention:attention.length,recurring:recurring.length,overdue:overdue.length,suggestions};
 },[items,actions,threshold]);
 const openByClient=useMemo(()=>{const m=new Map<string,Action[]>();for(const a of actions){if(a.status!=='open')continue;const list=m.get(a.client_id)||[];list.push(a);m.set(a.client_id,list);}for(const list of m.values())list.sort((a,b)=>String(a.due_date||'9999').localeCompare(String(b.due_date||'9999')));return m;},[actions]);
 const whatsappFor=(clientId:string)=>{
  const client=clients.find(c=>c.id===clientId);
  const preferred=contacts.find(c=>c.client_id===clientId&&c.whatsapp&&c.phone)||contacts.find(c=>c.client_id===clientId&&c.is_primary&&c.phone);
  const raw=preferred?.phone||client?.phone||'';
  const digits=raw.replace(/\D/g,'');
  if(!digits||digits.length<10||digits.length>13)return null;
  const international=digits.startsWith('55')?digits:'55'+digits;
  return 'https://wa.me/'+international+'?text='+encodeURIComponent(messageFor(clientId));
 };
 const radarPages=Math.max(1,Math.ceil(radar.suggestions.length/10));
 const currentRadarPage=Math.min(radarPage,radarPages-1);
 const displayed=items.filter(i=>filter==='all'||(filter==='attention'?i.priority<=2:i.tier===filter)).sort((a,b)=>a.client.name.localeCompare(b.client.name,'pt-BR',{sensitivity:'base'}));
 const attentionPages=Math.max(1,Math.ceil(displayed.length/10));
 const currentAttentionPage=Math.min(attentionPage,attentionPages-1);
 const count=(tier:string)=>items.filter(i=>i.tier===tier).length;
 const messageFor=(clientId:string)=>{const client=items.find(i=>i.client.id===clientId);const name=client?.client.name||'sua instituição';const tier=client?.tier||'Sem categoria';const proposal=tier==='Diamante'?'uma parceria anual e experiências especiais':tier==='Ouro'?'novas experiências e condições para a continuidade da parceria':tier==='Prata'?'novos temas e opções de programação recorrente':'uma nova visita do Planetário ANTARES';return 'Olá! Agradecemos a parceria com '+name+'. Gostaríamos de conversar sobre '+proposal+'. Podemos apresentar uma proposta personalizada?';};
 const dateLabel=(d:Date|null)=>d?d.toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
 const shortAlert=(i:Item)=>{
  if(i.last!==null)return i.alert;
  const today=parseDate(new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}))!;
  const upcoming=events.filter(e=>e.client_id===i.client.id&&e.status==='confirmed'&&parseDate(e.event_date)!==null&&parseDate(e.event_date)!.getTime()>today.getTime()).map(e=>parseDate(e.event_date)!).sort((a,b)=>a.getTime()-b.getTime());
  return upcoming.length?'Visita confirmada para '+dateLabel(upcoming[0]):'Primeira visita';
 };
 return <><style>{`
 .fidelizacao-programmed{display:inline-block;margin-left:10px;padding:2px 7px;border:1px solid #b3d5be;border-radius:6px;background:#e4f5e9;color:#176039;font-size:11px;font-weight:700;white-space:nowrap}
 .fidelizacao-modal-description strong{color:#173f7c;font-size:17px}
 .fidelizacao-modal-backdrop{position:fixed;inset:0;background:rgba(8,22,48,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px}
 .fidelizacao-modal{width:min(680px,100%);max-height:90vh;overflow-y:auto;background:#f5f9ff;color:#142b4f;border:1px solid #b9d4f8;border-radius:16px;padding:22px;box-shadow:0 24px 80px #08163070}
 .fidelizacao-modal-header{display:flex;justify-content:space-between;align-items:center;gap:12px;background:linear-gradient(105deg,#173f7c,#2477d8);color:white;border-radius:10px;padding:12px 16px}
 .fidelizacao-modal-header h2{font-size:20px;margin:0;font-weight:750}
 .fidelizacao-modal-header button{background:#ffffff25;color:white;border:1px solid #ffffff66;border-radius:8px;padding:5px 12px;cursor:pointer}
 .fidelizacao-modal-description{margin:14px 0;color:#31527e}
 .fidelizacao-modal .fidelizacao-form-grid{margin-bottom:16px}
 .fidelizacao-modal input,.fidelizacao-modal select{max-width:100%!important;width:100%;border:1px solid #a9c6eb;border-radius:8px;background:#fff;color:#142b4f}
 .fidelizacao-modal-cancel{margin-left:12px;border:1px solid #9ab5d9;border-radius:8px;padding:9px 15px;background:#e8f0fb;color:#173f7c;cursor:pointer}
 .fidelizacao-section-heading{color:#173f7c!important;font-size:20px;font-weight:750;background:#dceaff!important;padding:13px 16px;border:1px solid #c7dcf7;border-radius:10px;margin:-3px -3px 15px}
 .fidelizacao-opportunity-compact{padding:5px 10px!important;min-height:0!important;gap:8px!important;align-items:center!important}
 .fidelizacao-opportunity-compact strong{font-size:13px}
 .fidelizacao-opportunity-compact .fidelizacao-button{padding:6px 10px!important;font-size:12px;white-space:nowrap}
 .fidelizacao-kpi-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}\n @media(max-width:1050px){.fidelizacao-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}\n @media(max-width:650px){.fidelizacao-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n .fidelizacao-kpi-compact{padding:10px 12px!important;min-height:62px!important;background:#eaf3ff!important;border-color:#c9dcf7!important;border-radius:9px!important;display:flex;flex-direction:column;justify-content:center;min-width:0}
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
 .fidelizacao-page .fidelizacao-attention-table td{padding:6px 9px;vertical-align:middle}
 .fidelizacao-attention-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:240px}
 .fidelizacao-attention-status{flex:1;min-width:0;font-size:12px;line-height:1.25}
 .fidelizacao-attention-buttons{display:flex;gap:5px;align-items:center;flex-shrink:0}
 .fidelizacao-attention-buttons .fidelizacao-button{padding:5px 9px!important;font-size:11px!important;line-height:1.2!important;white-space:nowrap;min-height:26px}
 @media(max-width:800px){.fidelizacao-attention-actions{min-width:220px;flex-wrap:wrap;gap:5px}.fidelizacao-attention-buttons{flex-wrap:wrap}}
 
 .fidelizacao-attention-table tbody td:first-child strong{color:#1554a0}
 .fidelizacao-attention-table tbody td:last-child{color:#245b9b;font-weight:600}
 .fidelizacao-attention-table + *{margin-top:0}\n .fidelizacao-attention-table td{padding:7px 10px;border-bottom:1px solid #e1e8f1}\n .fidelizacao-attention-table th{font-size:12px}\n .fidelizacao-radar-kpi{padding:10px 12px!important;min-height:62px!important;display:flex;flex-direction:column;justify-content:center;min-width:0}\n .fidelizacao-radar-kpi small{font-size:11px!important}\n .fidelizacao-radar-kpi>div{font-size:20px!important;line-height:1.2!important}\n .fidelizacao-radar-kpi{background:#eaf3ff!important;border:1px solid #c9dcf7!important;border-radius:8px;color:#17467f!important}
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
 .fidelizacao-tier-diamante{background:#e6f5ff!important;border-top:3px solid #4ca6d8!important}
 .fidelizacao-tier-card:nth-child(1){background:#fff5e9!important;border-color:#d4a06a!important}
 .fidelizacao-tier-card:nth-child(2){background:#eff3fa!important;border-color:#9eafc6!important}
 .fidelizacao-tier-card:nth-child(3){background:#fff9e5!important;border-color:#d6b45b!important}
 .fidelizacao-radar-kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}\n @media(max-width:1050px){.fidelizacao-radar-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}\n @media(max-width:650px){.fidelizacao-radar-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n .fidelizacao-history-status{display:inline-flex;align-items:center;white-space:nowrap;margin-left:auto;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:700}\n .fidelizacao-history-status.is-done{background:#e1f5e9;color:#146c43}\n .fidelizacao-history-status.is-dismissed{background:#edf0f5;color:#52627a}\n .fidelizacao-reminder-closed{display:flex;align-items:center;gap:12px;flex-wrap:wrap}\n .fidelizacao-reminder-closed>div{flex-basis:100%;font-size:13px;color:#31527e}\n .fidelizacao-history-button{padding:10px 16px;border:1px solid #9dbce6;border-radius:9px;background:#dceaff;color:#173f7c;font-weight:750;cursor:pointer}\n .fidelizacao-history-button:hover{background:#c9dfff}\n .fidelizacao-reminder{background:#eef5ff;border:1px solid #c3d8f5;border-radius:10px;padding:12px}
 .fidelizacao-page select,.fidelizacao-page input,.fidelizacao-page textarea{background:#f1f7ff!important;border-color:#a9c9ef!important}
 .fidelizacao-page button:not(:disabled){transition:background .15s,border-color .15s}
 .fidelizacao-pagination button{padding:8px 12px;border:1px solid #a9c2e4;border-radius:8px;background:#eaf2ff;color:#154783;font-weight:650;cursor:pointer}
 .fidelizacao-pagination button:disabled{opacity:.45;cursor:not-allowed}
 /* Hierarquia visual dos painéis e histórico compacto */
 .fidelizacao-page .fidelizacao-radar-panel{padding:22px!important}
 .fidelizacao-page .fidelizacao-radar-kpi{min-height:84px!important;padding:12px 14px!important}
 .fidelizacao-page .fidelizacao-radar-kpi small{font-size:13px!important;color:#24548d!important}
 .fidelizacao-page .fidelizacao-radar-kpi>div{font-size:23px!important;color:#17467f!important}
 .fidelizacao-page .fidelizacao-attention-panel{padding:22px!important}
 .fidelizacao-page .fidelizacao-attention-table{font-size:13px}
 .fidelizacao-page .fidelizacao-attention-table td{padding:9px 10px}
 .fidelizacao-page .fidelizacao-agenda-panel{padding:15px!important;color:#17467f}
 .fidelizacao-page .fidelizacao-agenda-panel .fidelizacao-section-heading{margin-bottom:10px;padding:11px 14px;font-size:18px}
 .fidelizacao-page .fidelizacao-agenda-panel h3{margin-top:12px!important;color:#17467f;font-size:14px}
 .fidelizacao-page .fidelizacao-agenda-panel p,.fidelizacao-page .fidelizacao-agenda-panel strong,.fidelizacao-page .fidelizacao-agenda-panel .fidelizacao-reminder{color:#17467f}
 .fidelizacao-page .fidelizacao-agenda-panel .fidelizacao-reminder-open{padding:10px!important}
 .fidelizacao-page .fidelizacao-history-row{display:grid!important;grid-template-columns:minmax(140px,1.15fr) minmax(160px,2fr) auto auto;align-items:center;gap:10px;padding:8px 11px!important;min-height:40px}
 .fidelizacao-page .fidelizacao-history-row>.fidelizacao-history-button{width:auto!important;min-width:88px;max-width:max-content;justify-self:end;grid-column:auto!important;grid-row:auto!important;padding:6px 12px!important;font-size:12px!important;line-height:1.3;white-space:nowrap}
 .fidelizacao-page .fidelizacao-history-row>.fidelizacao-history-status{margin-left:0!important;justify-self:end}
 @media(max-width:760px){.fidelizacao-page .fidelizacao-history-row{grid-template-columns:minmax(0,1fr) auto auto!important;gap:8px}.fidelizacao-page .fidelizacao-history-row>.fidelizacao-history-note{grid-column:1/-1;grid-row:2}.fidelizacao-page .fidelizacao-history-row>.fidelizacao-history-status{grid-column:2;grid-row:1}.fidelizacao-page .fidelizacao-history-row>.fidelizacao-history-button{grid-column:3!important;grid-row:1!important}}
 .fidelizacao-page .fidelizacao-history-row strong{font-size:13px;line-height:1.3}
 .fidelizacao-page .fidelizacao-history-note{font-size:12px;color:#31527e;line-height:1.35;overflow-wrap:anywhere}
 .fidelizacao-page .fidelizacao-history-row .fidelizacao-history-status{margin-left:0;justify-self:end}
 @media(max-width:760px){.fidelizacao-page .fidelizacao-history-row{grid-template-columns:minmax(0,1fr) auto}.fidelizacao-page .fidelizacao-history-note{grid-column:1/-1;grid-row:2}.fidelizacao-page .fidelizacao-history-row .fidelizacao-history-status{grid-column:2;grid-row:1}}

 
  /* Auditoria final: padrao visual de Fidelizacao */
 .fidelizacao-page{--fidelizacao-text:#17467f;--fidelizacao-muted:#315b90;--fidelizacao-border:#c7dcf7;--fidelizacao-radius:10px;color:var(--fidelizacao-text)}
 .fidelizacao-page .fidelizacao-panel{border-color:var(--fidelizacao-border);border-radius:12px}
 .fidelizacao-page .fidelizacao-section-heading{color:var(--fidelizacao-text)!important;border-radius:var(--fidelizacao-radius);font-size:19px;line-height:1.3}
 .fidelizacao-page .fidelizacao-agenda-panel .fidelizacao-section-heading{font-size:18px}
 .fidelizacao-page .fidelizacao-kpi-compact small,.fidelizacao-page .fidelizacao-radar-kpi small{color:var(--fidelizacao-muted)!important;font-size:12px!important;line-height:1.35}
 .fidelizacao-page .fidelizacao-kpi-compact>div{font-size:20px;line-height:1.2}
 .fidelizacao-page .fidelizacao-radar-kpi{min-height:84px!important}
 .fidelizacao-page .fidelizacao-attention-table{color:var(--fidelizacao-text);font-size:13px}
 .fidelizacao-page .fidelizacao-attention-table th{font-size:12px;line-height:1.35}
 .fidelizacao-page .fidelizacao-history-note{font-size:13px;line-height:1.45;color:var(--fidelizacao-muted);overflow-wrap:anywhere;min-width:0}
 .fidelizacao-page .fidelizacao-history-row{border-radius:var(--fidelizacao-radius);gap:12px}
 .fidelizacao-page .fidelizacao-history-row strong{color:var(--fidelizacao-text)}
 .fidelizacao-page .fidelizacao-button,.fidelizacao-page .fidelizacao-history-button,.fidelizacao-page .fidelizacao-pagination button,.fidelizacao-page .fidelizacao-modal-cancel{border-radius:8px;font-weight:700;line-height:1.3}
 .fidelizacao-page .fidelizacao-history-button,.fidelizacao-page .fidelizacao-pagination button{min-height:36px}
 .fidelizacao-page .fidelizacao-agenda-panel h3,.fidelizacao-page .fidelizacao-agenda-panel p{color:var(--fidelizacao-text)}
 .fidelizacao-page button:focus-visible,.fidelizacao-page input:focus-visible,.fidelizacao-page select:focus-visible,.fidelizacao-page textarea:focus-visible{outline:2px solid #2477d8;outline-offset:2px}
 @media(max-width:760px){.fidelizacao-page .fidelizacao-history-row{gap:8px}.fidelizacao-page .fidelizacao-history-note{font-size:13px}}
`}</style><main className="fidelizacao-page" style={{maxWidth:1180,margin:'0 auto',padding:'16px 18px 32px',fontFamily:'system-ui',color:'#142b4f'}}>

 <header className="fidelizacao-hero"><div className="fidelizacao-eyebrow">ANTARES BUSINESS · RELACIONAMENTO</div><h1>Fidelização e Relacionamento</h1></header>
 <div className="fidelizacao-kpi-grid">
 {([['Instituições',items.length],['Diamante',count('Diamante')],['Ouro',count('Ouro')],['Prata',count('Prata')],['Bronze',count('Bronze')],['Precisam de atenção',items.filter(i=>i.priority<=2).length]] as [string,number][]).map(([k,v])=>
 <div key={k} className="fidelizacao-kpi fidelizacao-kpi-compact"><small>{k}</small><div style={{fontSize:22,fontWeight:800}}>{v}</div></div>)}
 </div>
 <section style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 className="fidelizacao-section-heading">Programa de Fidelização</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginTop:14}}>
 {[
 {name:'Diamante',count:'8 ou mais visitas concluídas',ideas:'Sugestões para negociação: até 20% de desconto, sessão gratuita anual e selo Escola Parceira, conforme aprovação do proprietário.'},
 {name:'Ouro',count:'4 a 7 visitas concluídas',ideas:'Sugestões para negociação: até 15% de desconto, sessão extra a cada cinco visitas e materiais exclusivos.'},
 {name:'Prata',count:'2 ou 3 visitas concluídas',ideas:'Sugestões para negociação: até 10% de desconto, prioridade de agenda e novos temas.'},
 {name:'Bronze',count:'1 visita concluída',ideas:'Sugestões para negociação: agradecimento, até 5% na segunda visita e acompanhamento.'}
 ].map(t=><div key={t.name} className={'fidelizacao-tier fidelizacao-tier-'+t.name.toLowerCase()}>
 <strong>✦ {t.name}</strong><div style={{fontSize:13,margin:'6px 0'}}>{t.count}</div><p style={{fontSize:13}}>{t.ideas}</p></div>)}
 </div>
 </section>
 <section className="fidelizacao-panel fidelizacao-radar-panel">
 <h2 className="fidelizacao-section-heading">ANTARES Intelligence · Radar comercial</h2>
 
 <div className="fidelizacao-radar-kpi-grid" style={{marginBottom:18}}>
 {([['Primeira visita pendente',radar.withoutVisit],['Retorno em atenção',radar.inactive],['Acompanhar',radar.attention],['Recorrentes no ano',radar.recurring],['Lembretes vencidos',radar.overdue]] as [string,number][]).map(([label,total])=><div key={label} className="fidelizacao-radar-kpi"><small>{label}</small><div style={{fontSize:25,fontWeight:800}}>{total}</div></div>)}
 </div>
 <h3 className="fidelizacao-radar-subtitle">Radar de Fidelização</h3>
 {loading?<p>Carregando...</p>:error?<p role="alert">{error}</p>:radar.suggestions.length===0?<p>Sem oportunidades identificadas.</p>:<div className="fidelizacao-radar-list" style={{display:'grid',gap:3}}>{radar.suggestions.slice(currentRadarPage*10,(currentRadarPage+1)*10).map(o=><div key={o.id+o.rank} className="fidelizacao-opportunity fidelizacao-opportunity-compact"><div><strong>{o.name}</strong>{openByClient.get(o.id)?.length?<span className="fidelizacao-programmed" title="Contato programado, ainda não concluído">✓ Programado: {String(openByClient.get(o.id)![0].due_date||"Sem data").slice(0,10).split("-").reverse().join("/")} {openByClient.get(o.id)!.length>1?`· ${openByClient.get(o.id)!.length} lembretes`:""}</span>:null}</div><button type="button" className="fidelizacao-button" onClick={()=>openReminder(o.id)}>Programar contato</button></div>)}</div>}
 {radar.suggestions.length>10&&<nav aria-label="Páginas do radar comercial" className="fidelizacao-pagination"><span>Exibindo {currentRadarPage*10+1}–{Math.min((currentRadarPage+1)*10,radar.suggestions.length)} de {radar.suggestions.length} escolas · Página {currentRadarPage+1} de {radarPages}</span><div><button type="button" disabled={currentRadarPage===0} onClick={()=>setRadarPage(p=>Math.max(0,p-1))}>Anterior</button><button type="button" disabled={currentRadarPage>=radarPages-1} onClick={()=>setRadarPage(p=>Math.min(radarPages-1,p+1))}>Próxima</button></div></nav>}

 </section>

 <section className="fidelizacao-attention-panel" style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 className="fidelizacao-section-heading">Central de Alertas</h2>
  {feedback&&<p role="status" style={{padding:"8px 12px",background:"#eaf3ff",borderRadius:8,color:"#17467f"}}>{feedback}</p>}
 
 <div style={{display:'flex',flexWrap:'wrap',gap:12,margin:'15px 0'}}>
 <label>Mostrar <select value={filter} onChange={e=>(setFilter(e.target.value),setAttentionPage(0))} style={{marginLeft:8,padding:8,border:'1px solid #9db1cd',borderRadius:8,background:'white',color:'#142b4f'}}>
 <option value="all">Todas</option><option value="attention">Precisam de atenção</option><option value="Diamante">Diamante</option><option value="Ouro">Ouro</option><option value="Prata">Prata</option><option value="Bronze">Bronze</option></select></label>
 <span style={{alignSelf:'center',fontSize:13,color:'#315b90'}}>Aviso preventivo: 60 dias · Prioritário: 90 dias</span>
 </div>
 {loading?<p>Carregando dados da organização...</p>:error?<p role="alert">{error}</p>:displayed.length===0?<p>Nenhuma instituição nesta categoria.</p>:
 <div style={{overflowX:'auto'}}><table className="fidelizacao-attention-table" style={{width:'100%',borderCollapse:'collapse',textAlign:'left',minWidth:680}}>
 <thead><tr>{['Instituição','Categoria','Visitas','Última visita','Atenção'].map(c=><th key={c} style={{padding:'8px 10px',borderBottom:'1px solid #c3d1e6'}}>{c}</th>)}</tr></thead>
 <tbody>{displayed.slice(currentAttentionPage*10,(currentAttentionPage+1)*10).map(i=><tr key={i.client.id}><td style={{padding:'7px 10px',borderBottom:'1px solid #e1e8f1'}}><strong>{i.client.name}</strong></td>
 <td>{i.tier==='Sem categoria'?'—':i.tier}</td><td>{i.completed}</td><td>{dateLabel(i.last)}</td><td><div className="fidelizacao-attention-actions"><span className="fidelizacao-attention-status">{snoozes[i.client.id]&&snoozes[i.client.id]>=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})?'Adiado até '+snoozes[i.client.id].split('-').reverse().join('/'):shortAlert(i)}</span><div className="fidelizacao-attention-buttons">{openByClient.get(i.client.id)?.length?<small style={{color:'#176039'}}>✓ Contato programado</small>:<button type="button" className="fidelizacao-button" onClick={()=>openReminder(i.client.id)}>Programar contato</button>}{i.days!==null&&i.days>=60&&!(snoozes[i.client.id]&&snoozes[i.client.id]>=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}))&&<button type="button" disabled={saving} className="fidelizacao-button" onClick={()=>snooze(i.client.id)}>Adiar 14 dias</button>}</div></div></td></tr>)}</tbody>
 </table></div>}
 {displayed.length>10&&<nav aria-label="Páginas da Central de Alertas" className="fidelizacao-pagination"><span>Exibindo {currentAttentionPage*10+1}–{Math.min((currentAttentionPage+1)*10,displayed.length)} de {displayed.length} instituições · Página {currentAttentionPage+1} de {attentionPages}</span><div><button type="button" disabled={currentAttentionPage===0} onClick={()=>setAttentionPage(p=>Math.max(0,p-1))}>Anterior</button><button type="button" disabled={currentAttentionPage>=attentionPages-1} onClick={()=>setAttentionPage(p=>Math.min(attentionPages-1,p+1))}>Próxima</button></div></nav>}
 </section>

 <section className="fidelizacao-agenda-panel" style={{border:'1px solid #b6c7de',borderRadius:14,padding:19,marginTop:20}}>
 <h2 id="agenda-relacionamento" className="fidelizacao-section-heading">Agenda interna de relacionamento</h2>
 
 {feedback&&<p role="status" style={{marginTop:10}}>{feedback}</p>}
 {actionsError&&<p role="alert" style={{marginTop:10,color:'#a83232',fontWeight:700}}>Não foi possível atualizar a agenda: {actionsError}. Os registros não foram apagados.</p>}
 {!actionsLoaded&&!actionsError&&<p role="status">Carregando histórico e lembretes...</p>}
 <h3 style={{marginTop:22,fontWeight:700}}>Lembretes registrados ({actions.filter(a=>a.status==='open').length} em aberto)</h3>
 <div style={{display:'grid',gap:10,marginTop:10}}>
 {actions.filter(a=>a.status==='open').length===0?<p>Nenhum lembrete cadastrado.</p>:actions.filter(a=>a.status==='open').map(a=><div key={a.id} className={'fidelizacao-reminder '+(a.status==='open'?'fidelizacao-reminder-open':'fidelizacao-reminder-closed')}>
 <div><strong>{a.client_name}</strong> <span className={'fidelizacao-status '+(a.status==='open'?'is-open':'is-closed')}>{a.status==='open'?'Em aberto':a.status==='done'?'Concluído':'Dispensado'}</span><div style={{fontSize:13}}>Prazo: {a.due_date?String(a.due_date).slice(0,10).split('-').reverse().join('/'):'Sem data'}</div><div>{a.note}</div></div>
 {a.status==='open'&&<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>{whatsappFor(a.client_id)?<a href={whatsappFor(a.client_id)!} target="_blank" rel="noopener noreferrer" className="fidelizacao-button" style={{textDecoration:'none',background:'#16794c'}}>WhatsApp</a>:<span style={{fontSize:12,color:'#6b7280'}} title="Cadastre um telefone válido em Clientes">Sem telefone cadastrado</span>}<button disabled={saving} onClick={()=>saveAction('complete',a.id)}>Concluir</button><button disabled={saving} onClick={()=>saveAction('dismiss',a.id)}>Dispensar</button></div>}</div>)}
 </div>
 {actions.some(a=>a.status!=='open'&&!a.archived)&&<div style={{marginTop:14}}><button type="button" className="fidelizacao-history-button" onClick={()=>setShowHistory(v=>!v)} aria-expanded={showHistory}>{showHistory?'Ocultar histórico':'Ver histórico de contatos'} ({actions.filter(a=>a.status!=='open'&&!a.archived).length})</button>{showHistory&&<div style={{display:'grid',gap:8,marginTop:10}}>{actions.filter(a=>a.status!=='open'&&!a.archived).map(a=><div key={a.id} className="fidelizacao-reminder fidelizacao-reminder-closed fidelizacao-history-row"><strong>{a.client_name}</strong><div className="fidelizacao-history-note">{a.note}</div><span className={'fidelizacao-history-status '+(a.status==='done'?'is-done':'is-dismissed')}>{a.status==='done'?'✓ Concluído':'Dispensado'}</span><button type="button" disabled={saving} className="fidelizacao-history-button" onClick={()=>manageHistory(a.id,'archive')}>Arquivar</button></div>)}</div>}</div>}
 {actions.some(a=>a.archived)&&<div style={{marginTop:12}}><button type="button" className="fidelizacao-history-button" onClick={()=>setShowArchived(v=>!v)} aria-expanded={showArchived}>{showArchived?'Ocultar arquivados':'Ver arquivados'} ({actions.filter(a=>a.archived).length})</button>{showArchived&&<div style={{display:'grid',gap:8,marginTop:10}}>{actions.filter(a=>a.archived).map(a=><div key={a.id} className="fidelizacao-reminder fidelizacao-reminder-closed fidelizacao-history-row"><strong>{a.client_name}</strong><div className="fidelizacao-history-note">{a.note}</div><span className="fidelizacao-history-status">Arquivado</span><button type="button" disabled={saving} className="fidelizacao-history-button" onClick={()=>manageHistory(a.id,'restore')}>Restaurar</button></div>)}</div>}</div>}
 </section>
 </main>
 {modalOpen&&<div className="fidelizacao-modal-backdrop" role="presentation">
 <div className="fidelizacao-modal" role="dialog" aria-modal="true" aria-labelledby="fidelizacao-modal-title">
 <div className="fidelizacao-modal-header"><h2 id="fidelizacao-modal-title">Programar contato</h2><button type="button" onClick={closeReminder} disabled={saving} aria-label="Fechar janela">✕</button></div>
 <p className="fidelizacao-modal-description"><strong>{clients.find(c=>c.id===selected)?.name||"Selecione a instituição"}</strong></p>
  <div className="fidelizacao-form-grid">
 {!modalFromRadar&&<label>Instituição<select value={selected} onChange={e=>{setSelected(e.target.value);setModalTouched(true);}} style={{display:'block',padding:9,maxWidth:230}}><option value="">Selecione</option>{items.map(i=><option key={i.client.id} value={i.client.id}>{i.client.name}</option>)}</select></label>}
 <label>Ação<select value={kind} onChange={e=>{setKind(e.target.value);setModalTouched(true);}} style={{display:'block',padding:9}}><option value="follow_up">Retomar contato</option><option value="renewal">Renovação</option><option value="feedback">Pedir avaliação</option><option value="offer">Nova experiência</option><option value="other">Outra</option></select></label>
 <label>Data prevista<input type="date" value={due} onChange={e=>{setDue(e.target.value);setModalTouched(true);}} style={{display:'block',padding:8}}/></label>
 <label>Prioridade<select value={priority} onChange={e=>{setPriority(e.target.value);setModalTouched(true);}} style={{display:'block',padding:9}}><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baixa</option></select></label>
 </div>
 <label>Observação<input value={note} onChange={e=>{setNote(e.target.value);setModalTouched(true);}} maxLength={2000} placeholder="Ex.: oferecer sessão de galáxias no próximo bimestre" style={{display:'block',padding:10,width:'100%',margin:'6px 0 12px'}}/></label>

 <button type="button" disabled={saving||!selected||!due} onClick={()=>saveAction('create')} className="fidelizacao-button">{saving?'Salvando...':'Criar lembrete interno'}</button>


 <button type="button" onClick={closeReminder} disabled={saving} className="fidelizacao-modal-cancel">Cancelar</button>
 </div></div>}
 </>;
}
