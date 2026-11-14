'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Bell,BriefcaseBusiness,CalendarDays,CheckCircle2,ChevronRight,HeartHandshake,History,RefreshCw,Wallet} from 'lucide-react';
import type {AntaresNotification,NotificationCategory,TrackedNotification} from '@/lib/notificacoes/types';
import {useNotificationFeed} from '../useNotificationFeed';

type Filter='all'|NotificationCategory;
const categoryNames:Record<NotificationCategory,string>={
 opportunities:'Oportunidades',loyalty:'Fidelização',agenda:'Agenda interna',finance:'Financeiro'
};
const statusNames:Record<string,string>={
 pending:'Pendente',overdue:'Atrasado',today:'Hoje',
 reviewing:'Em análise',converted:'Convertida',archived:'Arquivada'
};
function Icon({category}:{category:NotificationCategory}){
 if(category==='opportunities')return <BriefcaseBusiness size={18}/>;
 if(category==='loyalty')return <HeartHandshake size={18}/>;
 if(category==='agenda')return <CalendarDays size={18}/>;
 return <Wallet size={18}/>;
}
function showDate(value:string|null){
 if(!value)return '';
 const date=value.length===10?new Date(value+'T12:00:00'):new Date(value);
 return Number.isNaN(date.getTime())?'':date.toLocaleDateString('pt-BR');
}
function Item({data,onRead,readEnabled}:{data:AntaresNotification|TrackedNotification;onRead:(key:string)=>Promise<void>;readEnabled:boolean}){
 const tracked='readKey' in data?data as TrackedNotification:null;
 const unread=Boolean(tracked&&!tracked.read);
 return <article className={'notificacoes-item'+(unread?' notificacoes-item--new':'')}>
  <div className={'notificacoes-item-icon notificacoes-item-icon--'+data.category}><Icon category={data.category}/></div>
  <div className="notificacoes-item-main">
   <div className="notificacoes-item-meta">
    <span>{categoryNames[data.category]}</span>
    <span className={'notificacoes-state notificacoes-state--'+data.status}>{statusNames[data.status]||data.status}</span>
    {unread&&<span className="notificacoes-unread-label">Nova</span>}
    {data.date&&<time>{showDate(data.date)}</time>}
   </div>
   <h3>{data.title}</h3>
   <p>{data.detail}</p>
  </div>
  {unread&&readEnabled&&tracked&&<button type="button" className="notificacoes-mark-read" onClick={()=>void onRead(tracked.readKey)}>Marcar como lida</button>}
  <Link className="notificacoes-open" href={data.href} onClick={()=>{if(unread&&readEnabled&&tracked)void onRead(tracked.readKey).catch(()=>{});}} aria-label={'Abrir '+data.title+' em '+categoryNames[data.category]}>
   Abrir <ChevronRight size={17}/>
  </Link>
 </article>;
}
export default function NotificationsClient(){
 const {feed,loading,error,refresh,markRead}=useNotificationFeed(true);
 const [readError,setReadError]=useState('');
 async function confirmRead(key:string){
  setReadError('');
  try{await markRead([key]);}
  catch(e){setReadError(e instanceof Error?e.message:'Não foi possível registrar a leitura.');}
 }
 const [filter,setFilter]=useState<Filter>('all');
 const [view,setView]=useState<'pending'|'history'>('pending');
 const counts=useMemo(()=>Object.fromEntries(
  (Object.keys(categoryNames) as NotificationCategory[]).map(c=>[c,feed?.items.filter(n=>n.category===c).length||0])
 ) as Record<NotificationCategory,number>,[feed]);
 const current=view==='pending'?feed?.items||[]:feed?.history||[];
 const shown=current.filter(n=>filter==='all'||n.category===filter);
 return <main className="notificacoes-page">
  <header className="notificacoes-hero">
   <div className="notificacoes-hero-title">
    <span className="notificacoes-hero-icon"><Bell size={26}/></span>
    <div><span className="notificacoes-eyebrow">ANTARES BUSINESS · NOTIFICAÇÕES</span>
     <h1>Central de Notificações</h1>
     <p>Avisos e pendências dos módulos, sem perder o controle do atendimento.</p>
    </div>
   </div>
   <button type="button" className="notificacoes-refresh" onClick={()=>void refresh()} disabled={loading}>
    <RefreshCw size={17}/>{loading?'Consultando...':'Atualizar'}
   </button>
  </header>

  <section className="notificacoes-overview" aria-label="Pendências por módulo">
   {(Object.keys(categoryNames) as NotificationCategory[]).map(category=>
    <button key={category} type="button" className={'notificacoes-summary '+(filter===category?'is-active':'')}
     onClick={()=>{setFilter(filter===category?'all':category);setView('pending')}}>
     <span className={'notificacoes-summary-icon notificacoes-item-icon--'+category}><Icon category={category}/></span>
     <span className="notificacoes-summary-name">{categoryNames[category]}</span>
     <strong>{counts[category]}</strong>
     <small>pendente{counts[category]===1?'':'s'}</small>
    </button>)}
  </section>

  <section className="notificacoes-card" aria-label="Avisos">
   <div className="notificacoes-toolbar">
    <div className="notificacoes-tabs" role="group" aria-label="Tipo de visualização">
     <button type="button" className={view==='pending'?'active':''} aria-pressed={view==='pending'} onClick={()=>setView('pending')}>
      <Bell size={16}/> Pendentes <span>{feed?.count??'—'} · {feed?.unreadCount??'—'} novas</span>
     </button>
     <button type="button" className={view==='history'?'active':''} aria-pressed={view==='history'} onClick={()=>{setView('history');setFilter('all')}}>
      <History size={16}/> Histórico da Vitrine
     </button>
    </div>
    <label className="notificacoes-filter">Módulo
     <select value={filter} onChange={e=>setFilter(e.target.value as Filter)}>
      <option value="all">Todos</option>
      {(Object.keys(categoryNames) as NotificationCategory[]).map(key=>
       <option value={key} key={key}>{categoryNames[key]}</option>)}
     </select>
    </label>
   </div>

   {(error||readError)&&<p className="notificacoes-message notificacoes-message--error" role="status">{error||readError}</p>}
   {feed&&!feed.readPersistenceAvailable&&<p className="notificacoes-message" role="status">No momento, a confirmação de leitura não fica salva depois que a página é recarregada. Os avisos continuam disponíveis.</p>}
   {feed&&feed.unavailable.length>0&&
    <p className="notificacoes-message" role="status">
     Não foi possível consultar: {feed.unavailable.map(x=>categoryNames[x]).join(', ')}. As demais pendências continuam disponíveis.
    </p>}
   {loading&&!feed&&<p className="notificacoes-message" role="status">Consultando as notificações...</p>}
   {!loading&&!feed&&!error&&<p className="notificacoes-message">Nenhuma informação disponível.</p>}
   {feed&&shown.length===0&&<div className="notificacoes-empty">
    <CheckCircle2 size={28}/>
    <h2>{view==='history'?'Sem solicitações finalizadas ou em análise':'Nenhuma pendência nesta seleção'}</h2>
    <p>{view==='history'?'O histórico exibirá solicitações da Vitrine em análise, convertidas ou arquivadas.':'Quando surgir uma pendência, ela aparecerá aqui e no sininho.'}</p>
   </div>}
   {shown.length>0&&<div className="notificacoes-list">{shown.map(n=><Item key={n.id} data={n} onRead={confirmRead} readEnabled={Boolean(feed?.readPersistenceAvailable)}/>)}</div>}
   <footer className="notificacoes-footer">
    <p>Ler o aviso remove o indicador vermelho do sino, mas a pendência continua até ser resolvida. Oportunidades permanece pendente até iniciar a análise.</p>
    <Link href="/vitrine/inbox"><BriefcaseBusiness size={16}/> Abrir Oportunidades</Link>
   </footer>
  </section>
 </main>;
}
