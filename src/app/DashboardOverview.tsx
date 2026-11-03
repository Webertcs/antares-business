'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Bell,CalendarDays,ChevronLeft,ChevronRight,ClipboardCheck,FileText,GraduationCap,Orbit,Users,Wallet,BarChart3,HandCoins,Clock3,BriefcaseBusiness,ContactRound,Plus} from 'lucide-react';
type Booking={id:string;event_title:string;dome_name:string;starts_at:string;status:string};
type Reminder={id:string;client_name:string;due_date:string|null;priority:string;status:string;note:string};
type Props={cash:string;receivable:string;proposals:string;upcoming:Booking[];calendarBookings:Booking[];agendaAvailable:boolean;reminders:Reminder[];remindersAvailable:boolean;businessReady:boolean;check:boolean[];onCheck:(index:number)=>void;onNavigate:(section:string)=>void};
const TZ='America/Sao_Paulo';
const dateKey=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const formatDate=(date:Date)=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'short'}).format(date).replace('.','');
const formatTime=(date:Date)=>new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(date);
const quickLinks=[
 {title:'Cúpulas',href:'/agenda/reservas',icon:Orbit},
 {title:'Contratos',href:'/operacoes',icon:FileText},
 {title:'Professores',href:'/educacional',icon:GraduationCap},
 {title:'Alunos e turmas',href:'/educacional',icon:Users},
 {title:'Recebimentos',href:'/financeiro/receber',icon:HandCoins},
 {title:'Relatórios',href:'/financeiro',icon:BarChart3},
 {title:'Leads da vitrine',href:'/vitrine/inbox',icon:ContactRound},
];
export default function DashboardOverview({cash,receivable,proposals,upcoming,calendarBookings,agendaAvailable,reminders,remindersAvailable,businessReady,check,onCheck,onNavigate}:Props){
 const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
 const [operational,setOperational]=useState<{domes:number;booked:number}|null>(null);
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/agenda/reservas',{signal:ctrl.signal,cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&!ctrl.signal.aborted){setOperational({domes:Array.isArray(d.domes)?d.domes.length:0,booked:Array.isArray(d.links)?d.links.length:0});}}).catch(()=>{});return()=>ctrl.abort()},[]);
 const now=dateKey(new Date());
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
  <div className="owner-kpis">
   {[{label:'Saldo realizado',value:cash,icon:Wallet},
   {label:'A receber',value:receivable,icon:ArrowUpRight},
   {label:'Propostas abertas',value:proposals,icon:FileText},
   {label:'Próximas sessões',value:agendaAvailable?String(upcoming.length):'—',icon:CalendarDays}].map(k=><article className="owner-kpi" key={k.label}><span className="owner-kpi-icon"><k.icon size={20}/></span><div><span>{k.label}</span><strong>{k.value}</strong></div></article>)}
   <button type="button" className="owner-kpi-budget" onClick={()=>onNavigate('comercial')}><Plus size={19}/><span>Novo orçamento</span></button>
  </div>
  <div className="owner-main-grid">
   <section className="owner-tile owner-relationship"><div className="owner-tile-head"><span className="owner-tile-icon"><Users size={20}/></span><div><h2>Inteligência de relacionamento</h2><p>Alertas e lembretes comerciais</p></div></div>
    <Link href="/fidelizacao" className="owner-insight"><Clock3 size={16}/><strong>{remindersAvailable?overdue:'—'} atrasados</strong><ChevronRight size={16}/></Link>
    <Link href="/fidelizacao" className="owner-insight"><CalendarDays size={16}/><strong>{remindersAvailable?today:'—'} para hoje</strong><ChevronRight size={16}/></Link>
    <Link href="/fidelizacao" className="owner-insight"><Bell size={16}/><strong>{remindersAvailable?pending.length:'—'} em aberto</strong><ChevronRight size={16}/></Link>
   </section>
   <section className="owner-tile"><div className="owner-tile-head"><span className="owner-tile-icon"><CalendarDays size={20}/></span><div><h2>Próximas apresentações</h2><p>Compromissos agendados</p></div><button className="owner-inline" onClick={()=>onNavigate('agenda')}>Ver agenda <ArrowUpRight size={15}/></button></div>
     <div className="owner-upcoming">{upcoming.slice(0,2).map(b=><button className="owner-event" key={b.id} onClick={()=>onNavigate('agenda')}><span className="owner-date">{formatDate(new Date(b.starts_at))}</span><span><strong>{b.event_title}</strong><small>{formatTime(new Date(b.starts_at))} · {b.dome_name||'Cúpula a confirmar'}</small></span><ChevronRight size={16}/></button>)}{upcoming.length===0&&<div className="owner-empty">{agendaAvailable?'Nenhuma apresentação futura cadastrada.':'Agenda temporariamente indisponível.'}</div>}</div>
   </section>
   <section className="owner-tile"><div className="owner-tile-head"><span className="owner-tile-icon"><ClipboardCheck size={20}/></span><div><h2>Preparação da próxima sessão</h2><p>Checklist de montagem</p></div></div>
    {['Conferir estrutura da cúpula','Separar projetor e cabos','Verificar ar-condicionado','Confirmar horário com a escola'].map((item,i)=><label className="owner-check" key={item}><input type="checkbox" checked={check[i]} onChange={()=>onCheck(i)}/>{item}</label>)}
   </section>
  </div>
  <div className="owner-bottom-grid">
   <section className="owner-tile owner-calendar"><div className="owner-tile-head"><span className="owner-tile-icon"><CalendarDays size={20}/></span><div><h2>Agenda do mês</h2></div></div><div className="owner-month-nav"><button onClick={()=>shift(-1)} aria-label="Mês anterior"><ChevronLeft size={17}/></button><strong>{monthLabel}</strong><button onClick={()=>shift(1)} aria-label="Próximo mês"><ChevronRight size={17}/></button></div>
    <div className="owner-calendar-grid">{['D','S','T','Q','Q','S','S'].map((d,i)=><span className="owner-weekday" key={i}>{d}</span>)}{calendar.map((d,i)=>d?<button onClick={()=>onNavigate('agenda')} aria-label={d+' de '+monthLabel} key={i} className={agendaDays.has(dateKey(new Date(month.getFullYear(),month.getMonth(),d,12)))?'has-session':''}>{d}</button>:<span key={i}/>)}</div>
   </section>
   <section className="owner-tile owner-quick"><div className="owner-tile-head"><span className="owner-tile-icon"><ArrowUpRight size={20}/></span><div><h2>Acesso rápido</h2><p>Funcionalidades do ANTARES</p></div></div>
     <div className="owner-quick-grid">{quickLinks.map(q=><Link className="owner-quick-link" href={q.href} key={q.title}><q.icon size={20}/><span>{q.title}</span></Link>)}</div>
   </section>
   <div className="owner-right-column">
    <section className="owner-tile owner-summary"><div className="owner-tile-head"><span className="owner-tile-icon"><BarChart3 size={20}/></span><div><h2>Resumo operacional</h2><p>Visão geral do planetário</p></div></div>
    <div className="owner-summary-row"><span>Cúpulas cadastradas</span><strong>{operational?.domes??'—'}</strong></div><div className="owner-summary-row"><span>Reservas vinculadas</span><strong>{operational?.booked??'—'}</strong></div><div className="owner-summary-row"><span>Próximas sessões</span><strong>{agendaAvailable?upcoming.length:'—'}</strong></div><div className="owner-summary-row"><span>Propostas abertas</span><strong>{businessReady?proposals:'—'}</strong></div>
    </section>
    <Link className="owner-vitrine" href="/vitrine"><span><strong>Vitrine Kids</strong><small>Apresente o universo a mais escolas e crianças.</small></span><span className="owner-vitrine-action">Acessar vitrine <ArrowUpRight size={15}/></span><span className="owner-vitrine-planet" aria-hidden="true">🪐</span></Link>
   </div>
  </div>
 </div>;
}
