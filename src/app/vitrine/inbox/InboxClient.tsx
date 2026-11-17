'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Archive,ArrowLeft,Building2,CalendarDays,CheckCircle2,ChevronDown,Clock3,FileText,Layers,MapPin,MessageCircle,Phone,RefreshCw,UserRound,Users} from 'lucide-react';
import styles from './inbox.module.css';
import ProposalComposer from './ProposalComposer';
import ClientAcceptance from './ClientAcceptance';
import RenewValidity from './RenewValidity';
import ServiceBooking,{type ServiceBookingData,type ServiceReservation} from './ServiceBooking';
import ServiceContract,{type CentralContractData} from './ServiceContract';
type Lead={id:string;responsible_name:string;institution:string;city:string;phone:string;
 audience:string;attendees:number|null;desired_date:string|null;notes:string;status:string;created_at:string;converted_client_id:string|null;converted_proposal_id:string|null;proposal_status:string|null;proposal_valid_until:string|null;proposal_expired:boolean|null};
const label:Record<string,string>={pending:'Novo pedido',reviewing:'Em análise',converted:'Proposta criada',archived:'Arquivado'};
function statusLabel(lead:Lead,reservation:ServiceReservation|null){
 if(reservation?.status==='completed')return 'Apresentação concluída';
 if(reservation&&reservation.status!=='cancelled')return 'Reserva registrada';
 if(lead.status==='converted'&&lead.proposal_expired&&lead.proposal_status!=='accepted')return 'Proposta vencida';
 if(lead.status!=='converted')return label[lead.status]||lead.status;
 const statuses:Record<string,string>={draft:'Rascunho da proposta',approved_internal:'Proposta aprovada',legacy_accepted:'Aceite a confirmar',accepted:'Aceite registrado'};
 return statuses[String(lead.proposal_status||'')]||'Proposta criada';
}
/** Linha de acompanhamento: somente fatos já confirmados; reserva e conclusão exigem consulta própria. */
function ServiceTimeline({lead,reservation,operationalKnown}:{
 lead:Lead;reservation:ServiceReservation|null;operationalKnown:boolean
}){
 const bookingDone=Boolean(reservation&&reservation.status!=='cancelled');
 const finished=Boolean(reservation?.status==='completed');
 const hasProposal=lead.status==='converted'&&Boolean(lead.converted_proposal_id);
 const accepted=hasProposal&&lead.proposal_status==='accepted';
 const steps=[
  {name:'Contato',done:true,active:!hasProposal},
  {name:'Proposta',done:hasProposal,active:hasProposal&&!accepted},
  {name:'Aceite',done:accepted,active:false},
  {name:'Reserva',done:bookingDone,active:accepted&&operationalKnown&&!bookingDone},
  {name:'Conclusão',done:finished,active:bookingDone&&!finished}
 ];
 return <div aria-label="Etapas do atendimento" style={{margin:'12px 0 8px',padding:'14px 12px',background:'#f5f9ff',border:'1px solid #cbdcf7',borderRadius:12}}>
  <ol style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',listStyle:'none',margin:0,padding:0,gap:4}}>
   {steps.map((step,i)=><li key={step.name} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,textAlign:'center',minWidth:0}}>
    <span aria-hidden="true" style={{width:29,height:29,borderRadius:'50%',display:'grid',placeItems:'center',fontSize:13,fontWeight:800,color:step.done||step.active?'#fff':'#50698d',background:step.done?'#15803d':step.active?'#1d4ed8':'#e1eaf7'}}>
     {step.done?'✓':i+1}
    </span>
    <span style={{fontSize:11,fontWeight:step.active?800:650,color:step.active?'#164d9d':'#365780'}}>{step.name}</span>
   </li>)}
  </ol>
  <p style={{margin:'10px 0 0',fontSize:12,color:'#365780'}}>
   {finished?'Apresentação concluída conforme o registro operacional. Confira os recebimentos no Financeiro.':
    bookingDone?'Reserva registrada para '+(reservation?.starts_at?dateTime(reservation.starts_at):'data a confirmar')+'. Acompanhe a apresentação e o financeiro.':
    accepted&&!operationalKnown?'Aceite registrado. O estado das reservas não pôde ser consultado. Atualize a Central.':
    accepted?'Próxima ação: organizar a reserva. Contrato escrito é opcional.':
    hasProposal?'Próxima ação: revisar a proposta e registrar o aceite real da instituição.':
    'Próxima ação: conversar com a instituição e preparar a proposta.'}
  </p>
  {accepted&&<p style={{margin:'4px 0 0',fontSize:11,color:'#64748b'}}>O Financeiro é acompanhado separadamente e não impede a reserva.</p>}
 </div>;
}
function matchesFilter(lead:Lead,key:string,reservation:ServiceReservation|null){
 if(key==='all')return true;
 if(key==='open')return lead.status!=='archived'&&reservation?.status!=='completed';
 return lead.status===key;
}
const date=(value:string|null)=>value?new Date(value.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'A combinar';
const dateTime=(value:string)=>new Intl.DateTimeFormat('pt-BR',{
 dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
}).format(new Date(value));
function whatsAppMessage(lead:Lead){
 if(['approved_internal','legacy_accepted'].includes(String(lead.proposal_status)))
  return 'Olá, '+lead.responsible_name+'! A proposta do planetário para '+lead.institution+' está pronta. Vou encaminhar o PDF para sua avaliação. Aguardo seu retorno!';
 if(lead.proposal_status==='accepted')
  return 'Olá, '+lead.responsible_name+'! Obrigado pela confirmação da proposta para '+lead.institution+'. Vamos combinar os detalhes da apresentação?';
 return 'Olá, '+lead.responsible_name+'! Recebemos seu pedido de orçamento do planetário para '+lead.institution+'. Podemos conversar?';
}

function LeadObservations({notes}:{notes:string|null}){
 const raw=notes||'';
 const interestTag=/\[ANTARES KIDS\s*[—–-]\s*interesse opcional em novidades do jogo autorizado em\s+([^\]]+)\]/gi;
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

export default function Inbox({conversionEnabled,bookingWritesEnabled,contractWritesEnabled}:{conversionEnabled:boolean;bookingWritesEnabled:boolean;contractWritesEnabled:boolean}){
 const [leads,setLeads]=useState<Lead[]>([]);
 const [clients,setClients]=useState<{id:string;name:string;kind:string}[]>([]);
 const kindOf=(audience:string)=>({Escola:'school',Empresa:'company',Associação:'association','Evento particular':'private'} as Record<string,string>)[audience]||'private';
 const [error,setError]=useState('');const [busy,setBusy]=useState('');const [filter,setFilter]=useState('open');
 const [loading,setLoading]=useState(true);const [notice,setNotice]=useState('');
 const [composerLeadId,setComposerLeadId]=useState<string|null>(null);
 const [acceptLeadId,setAcceptLeadId]=useState<string|null>(null);
 const [renewLeadId,setRenewLeadId]=useState<string|null>(null);
 const [bookingLeadId,setBookingLeadId]=useState<string|null>(null);
 const [contractLeadId,setContractLeadId]=useState<string|null>(null);
 const [contractData,setContractData]=useState<CentralContractData|null>(null);
 const refreshContracts=useCallback(async()=>{
  try{
   const r=await fetch('/api/business',{cache:'no-store'});
   const json=await r.json();
   if(!r.ok||!Array.isArray(json.contracts)||!Array.isArray(json.proposals)||
      json.unavailable?.includes('contracts')||json.unavailable?.includes('proposals'))
    throw Error('Contratos indisponíveis.');
   setContractData(json as CentralContractData);
  }catch{setContractData(null);}
 },[]);
 const [bookingData,setBookingData]=useState<ServiceBookingData|null>(null);
 const [bookingError,setBookingError]=useState('');
 const refreshBookings=useCallback(async()=>{
  try{
   const r=await fetch('/api/agenda/reservas',{cache:'no-store'});
   const v=await r.json();
   if(!r.ok)throw Error(v.error||'Consulta de reservas indisponível.');
   if(!Array.isArray(v.links)||!Array.isArray(v.proposals)||!Array.isArray(v.domes))
    throw Error('Informações incompletas das reservas.');
   setBookingData(v as ServiceBookingData);setBookingError('');
  }catch(e){
   setBookingData(null);setBookingError(e instanceof Error?e.message:'Reservas indisponíveis.');
  }
 },[]);
 const reservationFor=(lead:Lead)=>bookingData?.links.find(r=>
  r.proposal_id===lead.converted_proposal_id&&r.status!=='cancelled')||null;
 const activeLead=composerLeadId?leads.find(l=>l.id===composerLeadId):undefined;
 const acceptedLead=acceptLeadId?leads.find(l=>l.id===acceptLeadId):undefined;
 const renewLead=renewLeadId?leads.find(l=>l.id===renewLeadId):undefined;
 const bookingLead=bookingLeadId?leads.find(l=>l.id===bookingLeadId):undefined;
 const contractLead=contractLeadId?leads.find(l=>l.id===contractLeadId):undefined;
 const load=useCallback(async()=>{setLoading(true);
  try{const r=await fetch('/api/vitrine/inbox',{cache:'no-store'});const data=await r.json();
   if(!r.ok)throw Error(data.error||'Não foi possível carregar.');
   setLeads(data.leads||[]);setError('');
   window.dispatchEvent(new Event('antares:opportunities-updated'));
  }catch(e){setError(e instanceof Error?e.message:'Erro ao consultar');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refreshBookings();void refreshContracts();},[refreshBookings,refreshContracts]);
 useEffect(()=>{void load();if(conversionEnabled){fetch('/api/crm/clientes',{cache:'no-store'}).then(r=>r.json()).then(d=>setClients(d.clients||[])).catch(()=>setNotice('Lista de clientes indisponível.'));}},[load,conversionEnabled]);
 const shown=useMemo(()=>leads.filter(x=>matchesFilter(x,filter,reservationFor(x))),[leads,filter,bookingData]);
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
   <ArrowLeft size={14}/><Link href="/clientes">Clientes e eventos</Link><span aria-hidden="true">›</span><span>Central de Atendimento</span>
  </nav>
  <header className={styles.hero}>
   <div className={styles.heroTitle}>
    <span className={styles.heroIcon}><FileText size={26} aria-hidden="true"/></span>
    <div>
     <span className={styles.eyebrow}>ANTARES BUSINESS · VITRINE</span>
     <h1>Central de Atendimento</h1>
     <p>Acompanhe cada instituição, da conversa à apresentação, sem perder o histórico.</p>
    </div>
   </div>
   <button type="button" className={styles.refresh} disabled={loading} onClick={()=>{void load();void refreshBookings();void refreshContracts();}}>
    <RefreshCw size={15} aria-hidden="true"/> {loading?'Atualizando...':'Atualizar lista'}
   </button>
  </header>
  <div className={styles.filters} role="group" aria-label="Filtrar solicitações">
   {([
    {key:'open',name:'Em andamento',Icon:Clock3,theme:styles.filterPending},
    {key:'all',name:'Todas',Icon:Layers,theme:''},
    {key:'converted',name:'Com proposta',Icon:FileText,theme:styles.filterConverted},
    {key:'archived',name:'Arquivadas',Icon:Archive,theme:styles.filterArchived}
   ] as const).map(option=><button type="button" key={option.key}
    className={[styles.filter,option.theme,filter===option.key?styles.filterActive:''].filter(Boolean).join(' ')}
    onClick={()=>setFilter(option.key)} aria-pressed={filter===option.key}>
    <option.Icon size={16} aria-hidden="true"/>
    {option.name} ({leads.filter(l=>matchesFilter(l,option.key,reservationFor(l))).length})
   </button>)}
  </div>
  {error&&<p role="alert" className={[styles.notification,styles.error].join(' ')}>{error}</p>}
  {notice&&<p role="status" className={styles.notification}>{notice}</p>}
  {bookingError&&<p role="status" className={styles.notification}>Situação operacional indisponível: {bookingError}</p>}
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
      lead.status==='converted'&&lead.proposal_status==='accepted'?styles.statusConverted:
      lead.status==='converted'&&lead.proposal_expired?styles.statusPending:
      lead.status==='converted'?styles.statusReviewing:
      lead.status==='archived'?styles.statusArchived:
      lead.status==='reviewing'?styles.statusReviewing:
      lead.status==='pending'?styles.statusPending:''].join(' ')}>
      {lead.status==='converted'&&lead.proposal_status==='accepted'&&<CheckCircle2 size={14} aria-hidden="true"/>}
      {statusLabel(lead,reservationFor(lead))}
     </span>
    </div>
    <div className={styles.quickFacts}>
     <span><UserRound size={14} aria-hidden="true"/>{lead.responsible_name}</span>
     <span><Users size={14} aria-hidden="true"/>{lead.attendees??'A combinar'} participantes</span>
     <span><CalendarDays size={14} aria-hidden="true"/>{date(lead.desired_date)}</span>
    </div>
    <ServiceTimeline lead={lead} reservation={reservationFor(lead)} operationalKnown={Boolean(bookingData)}/>
    {lead.status==='converted'&&lead.proposal_expired&&lead.proposal_status!=='accepted'&&<p role="status" style={{margin:'9px 0',padding:'10px 12px',background:'#fff4e4',border:'1px solid #e6bd72',borderRadius:8,color:'#805014',fontSize:13,fontWeight:650}}>Proposta vencida{lead.proposal_valid_until?' em '+date(lead.proposal_valid_until):''}. Renove a validade antes de registrar o aceite da escola.</p>}
    <details className={styles.leadDetails}>
     <summary>Ver informações do pedido <ChevronDown size={15} aria-hidden="true"/></summary>
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
    </details>
    <div className={styles.actions}>
     {conversionEnabled&&lead.status!=='archived'&&lead.status!=='converted'&&
      <button type="button" disabled={Boolean(busy)} onClick={()=>openComposer(lead.id)}
       className={styles.actionPrimary}><FileText size={16}/>Preparar proposta</button>}
     {lead.status==='converted'&&lead.converted_proposal_id&&
      (lead.proposal_status==='draft'
       ? <button type="button" disabled={Boolean(busy)||!conversionEnabled} onClick={()=>openComposer(lead.id)}
         className={styles.actionPrimary}><FileText size={16}/>Editar proposta</button>
       : lead.proposal_status==='approved_internal'||lead.proposal_status==='legacy_accepted'
       ? <Link href={'/vitrine/proposta/'+lead.converted_proposal_id+'?visualizar=1'} target="_blank" rel="noopener noreferrer"
         className={styles.actionPrimary}><FileText size={16}/>Visualizar proposta PDF</Link>
       : lead.proposal_status==='accepted'
       ? <button type="button" className={styles.actionPrimary} disabled={Boolean(busy)}
          onClick={()=>setBookingLeadId(lead.id)}>
          <CalendarDays size={16}/>{reservationFor(lead)?'Ver reserva':'Organizar reserva'}</button>
       : <Link href={'/vitrine/proposta/'+lead.converted_proposal_id+'?visualizar=1'} className={styles.actionPrimary}>
         <FileText size={16}/>Visualizar / Salvar PDF</Link>)}
     {lead.status==='archived'&&
      <button type="button" disabled={Boolean(busy)} onClick={()=>void review(lead.id,'pending')}
       className={styles.actionPrimary}><Archive size={16}/>Reabrir solicitação</button>}
     {lead.status==='converted'&&!lead.proposal_expired&&lead.converted_proposal_id&&['approved_internal','legacy_accepted'].includes(String(lead.proposal_status))&&
      <button type="button" disabled={Boolean(busy)||!conversionEnabled} onClick={()=>setAcceptLeadId(lead.id)}
       className={styles.actionSecondary}><CheckCircle2 size={16}/>Registrar aceite real</button>}
     {conversionEnabled&&lead.status==='converted'&&lead.converted_proposal_id&&lead.proposal_expired&&['approved_internal','legacy_accepted'].includes(String(lead.proposal_status))&&
      <button type="button" disabled={Boolean(busy)} className={styles.actionPrimary} onClick={()=>setRenewLeadId(lead.id)}><CalendarDays size={16}/>Renovar validade</button>}
     <a className={styles.actionWhatsApp}
      href={'https://wa.me/'+lead.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(whatsAppMessage(lead))}
      target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>WhatsApp</a>
     {lead.status!=='converted'&&(['pending','reviewing','archived'] as const)
       .filter(status=>status!==lead.status&&!(lead.status==='archived'&&status==='pending')).map(status=>
        <button type="button" key={status} disabled={Boolean(busy)} onClick={()=>void review(lead.id,status)}
         className={status==='archived'?styles.actionMuted:styles.actionSecondary}>
         {status==='reviewing'?'Iniciar análise':status==='pending'?'Marcar como pendente':'Arquivar'}
        </button>)}
     {lead.status==='converted'&&lead.converted_proposal_id&&
       ['draft','accepted'].includes(String(lead.proposal_status))&&
       <Link href={'/vitrine/proposta/'+lead.converted_proposal_id+'?visualizar=1'}
        target="_blank" rel="noopener noreferrer" className={styles.actionSecondary}>
        <FileText size={16}/>Visualizar PDF</Link>}
     {lead.status==='converted'&&lead.proposal_status==='accepted'&&lead.converted_proposal_id&&
       <button type="button" className={styles.actionSecondary} disabled={Boolean(busy)}
        onClick={()=>setContractLeadId(lead.id)}>
        <FileText size={16}/>{contractData?.contracts.some(c=>c.proposal_id===lead.converted_proposal_id)?'Elaborar documento':'Criar contrato (opcional)'}
       </button>}
     {lead.converted_client_id&&
       <Link href={'/clientes/'+lead.converted_client_id} className={styles.actionSecondary}>
        <Users size={16}/>Ficha da instituição
       </Link>}
    </div>
   </article>)}
  </div>
  {activeLead&&<ProposalComposer
    key={activeLead.id}
    lead={activeLead}
    clientOptions={clients.filter(c=>c.kind===kindOf(activeLead.audience)).slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(c=>({id:c.id,name:c.name}))}
    onClose={()=>setComposerLeadId(null)}
    onSaved={()=>{void load();}}
  />}
  {contractLead&&contractLead.converted_proposal_id&&<ServiceContract
    key={contractLead.id}
    institution={contractLead.institution}
    proposalId={contractLead.converted_proposal_id}
    enabled={contractWritesEnabled}
    onClose={()=>setContractLeadId(null)}
    onSaved={()=>{setNotice('Contrato cadastrado. Ele é opcional e não altera a reserva.');void refreshContracts();}}
  />}
  {bookingLead&&bookingLead.converted_proposal_id&&<ServiceBooking
    key={bookingLead.id}
    institution={bookingLead.institution}
    proposalId={bookingLead.converted_proposal_id}
    enabled={bookingWritesEnabled}
    onClose={()=>setBookingLeadId(null)}
    onSaved={()=>{setBookingLeadId(null);setNotice('Reserva registrada. A Central foi atualizada.');void refreshBookings();void load();}}
  />}
  {renewLead&&renewLead.converted_proposal_id&&<RenewValidity
    key={renewLead.id}
    proposalId={renewLead.converted_proposal_id}
    institution={renewLead.institution}
    previousValidUntil={renewLead.proposal_valid_until}
    onClose={()=>setRenewLeadId(null)}
    onSaved={()=>{setRenewLeadId(null);setNotice('Validade renovada. Solicite a confirmação da escola antes de registrar o aceite.');void load();}}
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
