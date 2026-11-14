'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Bell,CalendarDays,ChevronLeft,ChevronRight,ClipboardCheck,FileText,Users,Wallet,BarChart3,Clock3,BriefcaseBusiness,CheckCircle2,Eye,EyeOff} from 'lucide-react';
import type {NotificationFeed} from '@/lib/notificacoes/types';
type Booking={id:string;event_title:string;dome_name:string;starts_at:string;status:string;crmDateOnly?:boolean;start_time?:string|null;linked_event_id?:string|null};
type Reminder={id:string;client_name:string;due_date:string|null;priority:string;status:string;note:string};
type Props={cash:string;receivable:string;proposals:string;upcoming:Booking[];calendarBookings:Booking[];agendaAvailable:boolean;reminders:Reminder[];remindersAvailable:boolean;businessReady:boolean;notifications:NotificationFeed|null;onNavigate:(section:string)=>void;onAgendaDate:(date:string)=>void;onOpenOperation:(panel:'cupulas'|'reservas'|'checklist')=>void};
const TZ='America/Sao_Paulo';
const dateKey=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const formatDate=(date:Date)=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'short'}).format(date).replace('.','');
const formatTime=(date:Date)=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(date);
export default function DashboardOverview({cash,receivable,proposals,upcoming,calendarBookings,agendaAvailable,reminders,remindersAvailable,businessReady,notifications,onNavigate,onAgendaDate,onOpenOperation}:Props){
 const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
 const [checklist,setChecklist]=useState<boolean[]>([false,false,false,false]);
 // Privacidade por padrão: ao atualizar a página, os valores voltam a ficar ocultos.
 const [showFinancialValues,setShowFinancialValues]=useState(false);
 const moneyForDisplay=(value:string)=>showFinancialValues?value:(value==='—'?'—':'R$ •••••');
 const safePriorityDetail=(value:string)=>showFinancialValues?value:value.replace(/R\$\s*[\d.,]+/g,'R$ •••••');
 const nextBooking=upcoming[0];
 const eventId=nextBooking?.crmDateOnly?nextBooking.id.replace(/^crm-/,''):nextBooking?.linked_event_id;
 const eventHref=eventId&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(eventId)?'/eventos/'+eventId:null;
 const sessionTime=(b:Booking)=>b.crmDateOnly?(b.start_time?.slice(0,5)||'Horário a definir'):formatTime(new Date(b.starts_at));
 useEffect(()=>{setChecklist([false,false,false,false])},[nextBooking?.id]);
 const [operational,setOperational]=useState<{domes:number;booked:number}|null>(null);
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/agenda/reservas',{signal:ctrl.signal,cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&!ctrl.signal.aborted){setOperational({domes:Array.isArray(d.domes)?d.domes.length:0,booked:Array.isArray(d.links)?d.links.length:0});}}).catch(()=>{});return()=>ctrl.abort()},[]);
 const now=dateKey(new Date());
 const priorities=(notifications?.items||[]).slice(0,2);
 const inboxAvailable=Boolean(notifications&&!notifications.unavailable.includes('opportunities'));
 const priorityCategory:Record<string,string>={opportunities:'Oportunidades',loyalty:'Fidelização',agenda:'Agenda interna',finance:'Financeiro'};
 const pending=reminders.filter(r=>r.status==='open');
 const overdue=pending.filter(r=>r.due_date&&String(r.due_date).slice(0,10)<now).length;
 const today=pending.filter(r=>r.due_date&&String(r.due_date).slice(0,10)===now).length;
 const calendar=useMemo(()=>{
   const first=new Date(month.getFullYear(),month.getMonth(),1);
   const offset=first.getDay();
   const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
   return Array.from({length:offset+days},(_,i)=>i<offset?null:i-offset+1);
 },[month]);
 const monthLabel=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(month);
 const agendaDays=new Set(calendarBookings.filter(b=>!['cancelled','canceled'].includes(b.status)&&Number.isFinite(new Date(b.starts_at).getTime())).map(b=>dateKey(new Date(b.starts_at))));
 const shift=(n:number)=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+n,1));
 return <div className="owner-overview">
  <div className="owner-kpis" aria-label="Indicadores do negócio">
   {[
    {label:'Saldo realizado',value:moneyForDisplay(cash),icon:Wallet,href:'/financeiro',hint:'Abrir Financeiro'},
    {label:'A receber',value:moneyForDisplay(receivable),icon:ArrowUpRight,href:'/financeiro/receber',hint:'Abrir contas a receber'},
    {label:'Propostas abertas',value:proposals,icon:FileText,href:'/operacoes?area=comercial',hint:'Consultar propostas'},
    {label:'Oportunidades da Vitrine',value:inboxAvailable?String(notifications?.opportunitiesCount??0):'—',icon:BriefcaseBusiness,href:'/vitrine/inbox',hint:'Abrir solicitações recebidas pela Vitrine'}
   ].map(k=>{
    const body=<><span className="owner-kpi-icon"><k.icon size={20}/></span>
     <div className="owner-kpi-details"><span>{k.label}</span><strong>{k.value}</strong></div>
     <ChevronRight className="owner-kpi-arrow" size={17} aria-hidden="true"/></>;
    if(k.label==='Saldo realizado'){
     return <div className="owner-kpi owner-kpi-action owner-kpi-private" key={k.label}>
      <Link href={k.href} className="owner-kpi-main-link" aria-label={k.hint}>{body}</Link>
      <button type="button" className="owner-kpi-visibility"
       aria-label={showFinancialValues?'Ocultar saldos e valores a receber':'Mostrar saldos e valores a receber'}
       aria-pressed={showFinancialValues}
       title={showFinancialValues?'Ocultar valores':'Mostrar valores'}
       onClick={()=>setShowFinancialValues(v=>!v)}>
       {showFinancialValues?<EyeOff size={16} aria-hidden="true"/>:<Eye size={16} aria-hidden="true"/>}
      </button>
     </div>;
    }
    return <Link href={k.href} className="owner-kpi owner-kpi-action" key={k.label} aria-label={k.hint}>{body}</Link>;
   })}
  </div>
  <div className="owner-main-grid">
   <section className="owner-tile owner-relationship"><div className="owner-tile-head"><span className="owner-tile-icon"><Users size={20}/></span><div><h2>Inteligência de relacionamento</h2><p>Alertas e lembretes comerciais</p></div></div>
    <Link href="/fidelizacao#agenda-relacionamento" className="owner-insight"><Clock3 size={16}/><strong>{remindersAvailable?overdue:'—'} atrasados</strong><ChevronRight size={16}/></Link>
    <Link href="/fidelizacao#agenda-relacionamento" className="owner-insight"><CalendarDays size={16}/><strong>{remindersAvailable?today:'—'} para hoje</strong><ChevronRight size={16}/></Link>
    <Link href="/fidelizacao#agenda-relacionamento" className="owner-insight"><Bell size={16}/><strong>{remindersAvailable?pending.length:'—'} em aberto</strong><ChevronRight size={16}/></Link>
   </section>
   <section className="owner-tile"><div className="owner-tile-head"><span className="owner-tile-icon"><CalendarDays size={20}/></span><div><h2>Próximas apresentações</h2><p>Compromissos agendados</p></div><button className="owner-inline" onClick={()=>onNavigate('agenda')}>Ver agenda <ArrowUpRight size={15}/></button></div>
     <div className="owner-upcoming">{upcoming.slice(0,2).map(b=><button className="owner-event" key={b.id} onClick={()=>onAgendaDate(dateKey(new Date(b.starts_at)))} aria-label={'Ver apresentações em '+new Date(b.starts_at).toLocaleDateString('pt-BR')}><span className="owner-date">{formatDate(new Date(b.starts_at))}</span><span><strong>{b.event_title}</strong><small>{sessionTime(b)} · {b.dome_name||'Cúpula a confirmar'}</small></span><ChevronRight size={16}/></button>)}{upcoming.length===0&&<div className="owner-empty">{agendaAvailable?'Nenhuma apresentação futura cadastrada.':'Agenda temporariamente indisponível.'}</div>}</div>
   </section>
   <section className="owner-tile"><div className="owner-tile-head"><span className="owner-tile-icon"><ClipboardCheck size={20}/></span><div><h2>Preparação da próxima sessão</h2><p>{nextBooking?nextBooking.event_title:'Aguardando sessão agendada'}</p></div></div>
    {['Conferir estrutura da cúpula','Separar projetor e cabos','Verificar ar-condicionado','Confirmar horário com a escola'].map((item,i)=><label className="owner-check" key={item}><input type="checkbox" disabled={!nextBooking} checked={Boolean(nextBooking&&checklist[i])} onChange={()=>setChecklist(v=>v.map((old,j)=>j===i?!old:old))}/>{item}</label>)}
    <p className="owner-check-note">{nextBooking?'As marcações deste quadro são apenas para organização e não ficam salvas.':'O checklist ficará disponível quando houver uma próxima apresentação.'}</p>
    {eventHref
      ?<Link className="owner-check-action" href={eventHref}><ClipboardCheck size={15}/>Abrir checklist do evento <ChevronRight size={15}/></Link>
      :<button type="button" className="owner-check-action" onClick={()=>onOpenOperation('checklist')}><ClipboardCheck size={15}/>Abrir modelo do checklist <ChevronRight size={15}/></button>}
   </section>
  </div>
  <div className="owner-bottom-grid">
   <section className="owner-tile owner-calendar"><div className="owner-tile-head"><span className="owner-tile-icon"><CalendarDays size={20}/></span><div><h2>Agenda do mês</h2></div></div><div className="owner-month-nav"><button onClick={()=>shift(-1)} aria-label="Mês anterior"><ChevronLeft size={17}/></button><strong>{monthLabel}</strong><button onClick={()=>shift(1)} aria-label="Próximo mês"><ChevronRight size={17}/></button></div>
    <div className="owner-calendar-grid">{['D','S','T','Q','Q','S','S'].map((d,i)=><span className="owner-weekday" key={i}>{d}</span>)}{calendar.map((d,i)=>d?<button onClick={()=>onAgendaDate(month.getFullYear()+'-'+String(month.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'))} aria-label={d+' de '+monthLabel} key={i} className={agendaDays.has(dateKey(new Date(month.getFullYear(),month.getMonth(),d,12)))?'has-session':''}>{d}</button>:<span key={i}/>)}</div>
    <p className="owner-calendar-hint"><span className="owner-calendar-dot" aria-hidden="true"/> Dias com apresentação · selecione uma data para abrir a Agenda</p>
  </section>
   <section className="owner-tile owner-priorities">
    <div className="owner-tile-head">
     <span className="owner-tile-icon"><Bell size={20}/></span>
     <div><h2>Prioridades do dia</h2><p>Pendências que precisam de atenção</p></div>
     <Link href="/notificacoes" className="owner-inline" aria-label="Ver todas as notificações">Ver todas <ArrowUpRight size={15}/></Link>
    </div>
    <div className="owner-priorities-list">
     {!notifications&&<p className="owner-priorities-empty">Consultando as pendências...</p>}
     {notifications&&priorities.length===0&&<div className="owner-priorities-empty owner-priorities-clear"><CheckCircle2 size={18}/><span>Sem pendências nos módulos disponíveis.</span></div>}
     {priorities.map(n=>
      <Link className="owner-priority" key={n.id} href={n.href} aria-label={'Abrir '+n.title+' de '+safePriorityDetail(n.detail)}>
       <span className={'owner-priority-mark'+(n.priority==='high'?' is-high':'')} aria-hidden="true"/>
       <span className="owner-priority-info"><small>{priorityCategory[n.category]}</small><strong>{n.title}</strong><span>{safePriorityDetail(n.detail)}</span></span>
       <ChevronRight size={16} aria-hidden="true"/>
      </Link>
     )}
    </div>
    {notifications&&notifications.count>2&&<Link className="owner-priorities-more" href="/notificacoes">Mais {notifications.count-2} pendências na Central <ChevronRight size={14}/></Link>}
    {notifications&&notifications.unavailable.length>0&&<p className="owner-priorities-warning">Alguns módulos estão temporariamente indisponíveis.</p>}
   </section>
   <div className="owner-right-column">
    <section className="owner-tile owner-summary"><div className="owner-tile-head"><span className="owner-tile-icon"><BarChart3 size={20}/></span><div><h2>Resumo operacional</h2><p>Visão geral do planetário</p></div></div>
    <button type="button" className="owner-summary-row owner-summary-action" onClick={()=>onOpenOperation('cupulas')} aria-label="Abrir cúpulas cadastradas"><span>Cúpulas cadastradas</span><strong>{operational?.domes??'—'}</strong><ChevronRight size={15}/></button>
    <button type="button" className="owner-summary-row owner-summary-action" onClick={()=>onOpenOperation('reservas')} aria-label="Abrir reservas vinculadas"><span>Reservas vinculadas</span><strong>{operational?.booked??'—'}</strong><ChevronRight size={15}/></button>
    </section>
    <Link className="owner-vitrine" href="/vitrine"><span><strong>Vitrine Kids</strong><small>Apresente o universo a mais escolas e crianças.</small></span><span className="owner-vitrine-action">Acessar vitrine <ArrowUpRight size={15}/></span><span className="owner-vitrine-planet" aria-hidden="true">🪐</span></Link>
   </div>
  </div>
 </div>;
}
