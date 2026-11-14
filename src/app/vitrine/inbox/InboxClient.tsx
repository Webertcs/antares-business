'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Archive,ArrowLeft,Building2,CalendarDays,CheckCircle2,ChevronDown,Clock3,FileText,Layers,MapPin,MessageCircle,MoreHorizontal,Phone,RefreshCw,Search,UserRound,Users} from 'lucide-react';
import styles from './inbox.module.css';
import ProposalComposer from './ProposalComposer';
import ClientAcceptance from './ClientAcceptance';
type Lead={id:string;responsible_name:string;institution:string;city:string;phone:string;
 audience:string;attendees:number|null;desired_date:string|null;notes:string;status:string;created_at:string;converted_client_id:string|null;converted_proposal_id:string|null;proposal_status:string|null};
const label:Record<string,string>={pending:'Pendente',reviewing:'Em análise',converted:'Convertido',archived:'Arquivado'};
const date=(value:string|null)=>value?new Date(value.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'A combinar';

function LeadObservations({notes}:{notes:string|null}){
 const raw=notes||'';
 const interestTag=/\\[ANTARES KIDS\\s*[—–-]\\s*interesse opcional em novidades do jogo autorizado em\\s+([^\\]]+)\\]/gi;
 const matches=[...raw.matchAll(interestTag)];
 const observation=raw.replace(interestTag,'').trim();
 const lastDate=matches.length?new Date(matches[matches.length-1][1]):null;
 const dateLabel=lastDate&&!Number.isNaN(lastDate.getTime())
  ?lastDate.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):null;
 if(!observation&&matches.length===0)return null;
 return <>
  {observation&&<div className={styles.detail}><MessageCircle size={16}/><span><b>Observações:</b> <span style={{whiteSpace:'pre-wrap'}}>{observation}</span></span></div>}
  {matches.length>0&&<div className={styles.detail}><CheckCircle2 size={16}/><span><b>Novidades do ANTARES Kids:</b> contato autorizado{dateLabel?' em '+dateLabel:''}.</span></div>}
 </>;
}

export default function Inbox({conversionEnabled}:{conversionEnabled:boolean}){
 const [leads,setLeads]=useState<Lead[]>([]);
 const [clients,setClients]=useState<{id:string;name:string;kind:string}[]>([]);
 const [chosen,setChosen]=useState<Record<string,string>>({});
 const kindOf=(audience:string)=>({Escola:'school',Empresa:'company',Associação:'association','Evento particular':'private'} as Record<string,string>)[audience]||'private';
 const [error,setError]=useState('');const [busy,setBusy]=useState('');const [filter,setFilter]=useState('all');
 const [loading,setLoading]=useState(true);const [notice,setNotice]=useState('');
 const [composerLeadId,setComposerLeadId]=useState<string|null>(null);
 const [acceptLeadId,setAcceptLeadId]=useState<string|null>(null);
 const activeLead=composerLeadId?leads.find(l=>l.id===composerLeadId):undefined;
 const acceptedLead=acceptLeadId?leads.find(l=>l.id===acceptLeadId):undefined;
 const load=useCallback(async()=>{setLoading(true);
  try{const r=await fetch('/api/vitrine/inbox',{cache:'no-store'});const data=await r.json();
   if(!r.ok)throw Error(data.error||'Não foi possível carregar.');
   setLeads(data.leads||[]);setError('');
   window.dispatchEvent(new Event('antares:opportunities-updated'));
  }catch(e){setError(e instanceof Error?e.message:'Erro ao consultar');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();if(conversionEnabled){fetch('/api/crm/clientes',{cache:'no-store'}).then(r=>r.json()).then(d=>setClients(d.clients||[])).catch(()=>setNotice('Lista de clientes indisponível.'));}},[load,conversionEnabled]);
 const shown=useMemo(()=>leads.filter(x=>filter==='all'||x.status===filter),[leads,filter]);
 function openComposer(id:string){
  if(busy||!conversionEnabled)return;
  setComposerLeadId(id);
 }
 async function review(id:string,status:string){
  setBusy(id);setNotice('');
  try{const r=await fetch('/api/vitrine/inbox',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({id,status})});const data=await r.json();if(!r.ok)throw Error(data.error||'Falha ao salvar');
   setNotice('Situação atualizada.');await load();
  }catch(e){setNotice(e instanceof Error?e.message:'Falha ao salvar');}
  finally{setBusy('');}
 }
 return <main className={styles.page}>
  <nav aria-label="Navegação" className={styles.breadcrumb}>
   <ArrowLeft size={14}/><Link href="/clientes">Clientes e eventos</Link><span aria-hidden="true">›</span><span>Solicitações de orçamento</span>
  </nav>
  <header className={styles.hero}>
   <div className={styles.heroTitle}>
    <span className={styles.heroIcon}><FileText size={26} aria-hidden="true"/></span>
    <div>
     <span className={styles.eyebrow}>ANTARES BUSINESS · VITRINE</span>
     <h1>Solicitações de orçamento</h1>
     <p>Acompanhe os pedidos recebidos e prepare propostas para cada instituição.</p>
    </div>
   </div>
   <button type="button" className={styles.refresh} disabled={loading} onClick={()=>void load()}>
    <RefreshCw size={15} aria-hidden="true"/> {loading?'Atualizando...':'Atualizar lista'}
   </button>
  </header>
  <div className={styles.filters} role="group" aria-label="Filtrar solicitações">
   {([
    {key:'all',name:'Todas',Icon:Layers,theme:''},
    {key:'pending',name:'Pendentes',Icon:Clock3,theme:styles.filterPending},
    {key:'reviewing',name:'Em análise',Icon:Search,theme:styles.filterReview},
    {key:'archived',name:'Arquivadas',Icon:Archive,theme:styles.filterArchived},
    {key:'converted',name:'Convertidas',Icon:CheckCircle2,theme:styles.filterConverted}
   ] as const).map(option=><button type="button" key={option.key}
    className={[styles.filter,option.theme,filter===option.key?styles.filterActive:''].filter(Boolean).join(' ')}
    onClick={()=>setFilter(option.key)} aria-pressed={filter===option.key}>
    <option.Icon size={16} aria-hidden="true"/>
    {option.name} ({option.key==='all'?leads.length:leads.filter(l=>l.status===option.key).length})
   </button>)}
  </div>
  {error&&<p role="alert" className={[styles.notification,styles.error].join(' ')}>{error}</p>}
  {notice&&<p role="status" className={styles.notification}>{notice}</p>}
  {loading?<div className={styles.empty} role="status">Carregando solicitações...</div>:
   !error&&shown.length===0?<div className={styles.empty}>Nenhuma solicitação nesta categoria.</div>:null}
  <div className={styles.list}>
   {!loading&&shown.map(lead=><article key={lead.id} className={styles.lead}>
    <div className={styles.leadHead}>
     <div className={styles.leadIcon}><Building2 size={24} aria-hidden="true"/></div>
     <div className={styles.leadTitle}>
      <h2>{lead.institution}</h2>
      <div className={styles.leadSubtitle}>Pedido recebido pelo site</div>
     </div>
     <span className={[styles.status,
      lead.status==='converted'?styles.statusConverted:
      lead.status==='archived'?styles.statusArchived:
      lead.status==='reviewing'?styles.statusReviewing:
      lead.status==='pending'?styles.statusPending:''].join(' ')}>
      {lead.status==='converted'&&<CheckCircle2 size={14} aria-hidden="true"/>}
      {label[lead.status]||lead.status}
     </span>
    </div>
    <div className={styles.details}>
     <div className={styles.detailGroup}>
      <div className={styles.detail}><UserRound size={16}/><span><b>Responsável:</b> {lead.responsible_name}</span></div>
      <div className={styles.detail}><MapPin size={16}/><span><b>Cidade:</b> {lead.city||'Não informada'}</span></div>
      <div className={styles.detail}><Users size={16}/><span><b>Público:</b> {lead.audience}</span></div>
      <div className={styles.detail}><Users size={16}/><span><b>Participantes:</b> {lead.attendees??'A combinar'}</span></div>
     </div>
     <div className={styles.detailGroup}>
      <div className={styles.detail}><CalendarDays size={16}/><span><b>Data desejada:</b> {date(lead.desired_date)}</span></div>
      <div className={styles.detail}><Phone size={16}/><span><b>WhatsApp:</b> {lead.phone}</span></div>
      <div className={styles.detail}><Clock3 size={16}/><span><b>Recebido:</b> {new Date(lead.created_at).toLocaleString('pt-BR')}</span></div>
      <LeadObservations notes={lead.notes}/>
     </div>
    </div>
    <div className={styles.actions}>
     {conversionEnabled&&lead.status!=='archived'&&lead.status!=='converted'&&
      <button type="button" disabled={Boolean(busy)} onClick={()=>openComposer(lead.id)}
       className={styles.actionPrimary}><FileText size={16}/>Preparar proposta</button>}
     {lead.status==='converted'&&lead.converted_proposal_id&&
      (lead.proposal_status==='draft'
       ? <button type="button" disabled={Boolean(busy)||!conversionEnabled} onClick={()=>openComposer(lead.id)}
         className={styles.actionPrimary}><FileText size={16}/>Editar proposta</button>
       : lead.proposal_status==='approved_internal'||lead.proposal_status==='legacy_accepted'
       ? <button type="button" disabled={Boolean(busy)||!conversionEnabled} onClick={()=>setAcceptLeadId(lead.id)}
         className={styles.actionPrimary}><CheckCircle2 size={16}/>Registrar aceite da escola</button>
       : <Link href={'/vitrine/proposta/'+lead.converted_proposal_id+'?visualizar=1'} className={styles.actionPrimary}>
         <FileText size={16}/>Visualizar / Salvar PDF</Link>)}
     {lead.status==='archived'&&
      <button type="button" disabled={Boolean(busy)} onClick={()=>void review(lead.id,'pending')}
       className={styles.actionPrimary}><Archive size={16}/>Reabrir solicitação</button>}
     <a className={styles.actionWhatsApp}
      href={'https://wa.me/'+lead.phone.replace(/\D/g,'')+'?text='+encodeURIComponent('Olá, '+lead.responsible_name+'! Recebemos seu pedido de orçamento do planetário para '+lead.institution+'. Podemos conversar?')}
      target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>WhatsApp</a>
     <details className={styles.more}>
      <summary className={styles.moreSummary} aria-label={'Mais opções para '+lead.institution}>
       <MoreHorizontal size={16}/>Mais opções<ChevronDown size={14} className={styles.moreChevron}/>
      </summary>
      <div className={styles.morePanel}>
       {lead.status!=='converted'&&(['pending','reviewing','archived'] as const).filter(s=>s!==lead.status&&!(lead.status==='archived'&&s==='pending')).map(s=>
        <button type="button" key={s} disabled={Boolean(busy)} onClick={()=>void review(lead.id,s)}
         className={s==='archived'?styles.actionMuted:styles.actionSecondary}>
         {s==='reviewing'?'Iniciar análise':s==='pending'?'Marcar como pendente':'Arquivar'}
        </button>)}
       {conversionEnabled&&lead.status!=='converted'&&lead.status!=='archived'&&
        <label className={styles.selectLabel}>Cliente da proposta
         <select aria-label={'Cliente para '+lead.institution} value={chosen[lead.id]||''}
          onChange={e=>setChosen(old=>({...old,[lead.id]:e.target.value}))}>
          <option value="">Criar novo cliente</option>
          {clients.filter(c=>c.kind===kindOf(lead.audience)).map(c=>
           <option key={c.id} value={c.id}>Vincular: {c.name}</option>)}
         </select>
        </label>}
       {lead.status==='converted'&&lead.converted_proposal_id&&['draft','approved_internal','legacy_accepted'].includes(String(lead.proposal_status))&&
        <Link href={'/vitrine/proposta/'+lead.converted_proposal_id+'?visualizar=1'} className={styles.actionSecondary}>
         <FileText size={16}/>Visualizar / Salvar PDF</Link>}
       {lead.status==='converted'&&lead.converted_proposal_id&&lead.proposal_status!=='draft'&&
        <span className={styles.moreHint}>{lead.proposal_status==='accepted'?'Aceite registrado. Proposta liberada para agendamento.':'Aprovação interna não equivale ao aceite da escola.'}</span>}
       <Link href="/clientes" className={styles.actionSecondary}><Users size={16}/>Abrir cadastro de clientes</Link>
      </div>
     </details>
    </div>
   </article>)}
  </div>
  {activeLead&&<ProposalComposer
    key={activeLead.id}
    lead={activeLead}
    existingClientId={chosen[activeLead.id]||null}
    onClose={()=>setComposerLeadId(null)}
    onSaved={()=>{void load();}}
  />}
  {acceptedLead&&acceptedLead.converted_proposal_id&&<ClientAcceptance
    key={acceptedLead.id}
    institution={acceptedLead.institution}
    proposalId={acceptedLead.converted_proposal_id}
    onClose={()=>setAcceptLeadId(null)}
    onSaved={()=>{setAcceptLeadId(null);setNotice('Aceite da instituição registrado. Agora você pode organizar a reserva.');void load();}}
  />}
 </main>;
}
