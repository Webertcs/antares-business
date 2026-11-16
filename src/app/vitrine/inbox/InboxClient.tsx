'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Archive,ArrowLeft,Building2,CalendarDays,CheckCircle2,ChevronDown,Clock3,FileText,MapPin,MessageCircle,MoreHorizontal,Phone,RefreshCw,Search,UserRound,Users} from 'lucide-react';
import styles from './inbox.honeybook.module.css';
import ProposalComposer from './ProposalComposer';
import ClientAcceptance from './ClientAcceptance';
type Lead={id:string;responsible_name:string;institution:string;city:string;phone:string;
 audience:string;attendees:number|null;desired_date:string|null;notes:string;status:string;created_at:string;converted_client_id:string|null;converted_proposal_id:string|null;proposal_status:string|null};
const label:Record<string,string>={pending:'Novo pedido',reviewing:'Em análise',converted:'Proposta criada',archived:'Arquivado'};
function statusLabel(lead:Lead){
 if(lead.status!=='converted')return label[lead.status]||lead.status;
 const statuses:Record<string,string>={draft:'Rascunho da proposta',approved_internal:'Proposta aprovada',legacy_accepted:'Aceite a confirmar',accepted:'Aceite registrado'};
 return statuses[String(lead.proposal_status||'')]||'Proposta criada';
}
function matchesFilter(lead:Lead,key:string){
 if(key==='all')return true;
 if(key==='new')return lead.status==='pending';
 if(key==='reviewing')return lead.status==='reviewing';
 if(key==='draft')return lead.status==='converted'&&lead.proposal_status==='draft';
 if(key==='awaiting')return lead.status==='converted'&&['approved_internal','legacy_accepted'].includes(String(lead.proposal_status));
 if(key==='accepted')return lead.status==='converted'&&lead.proposal_status==='accepted';
 if(key==='archived')return lead.status==='archived';
 return false;
}
const date=(value:string|null)=>value?new Date(value.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'A combinar';
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

export default function Inbox({conversionEnabled}:{conversionEnabled:boolean}){
 const [leads,setLeads]=useState<Lead[]>([]);
 const [clients,setClients]=useState<{id:string;name:string;kind:string}[]>([]);
 const kindOf=(audience:string)=>({Escola:'school',Empresa:'company',Associação:'association','Evento particular':'private'} as Record<string,string>)[audience]||'private';
 const [error,setError]=useState('');const [busy,setBusy]=useState('');const [filter,setFilter]=useState('all');
 const [search,setSearch]=useState('');const [page,setPage]=useState(1);const pageSize=10;
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
 const shown=useMemo(()=>leads.filter(x=>matchesFilter(x,filter)&&
  (!search.trim()||[x.institution,x.responsible_name,x.city,x.audience].some(v=>(typeof v==='string'?v:'').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))))),[leads,filter,search]);
 const totalPages=Math.max(1,Math.ceil(shown.length/pageSize));
 const visible=shown.slice((page-1)*pageSize,page*pageSize);
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
  <header className={styles.hero}>
   <div className={styles.heroTitle}>
    <div>
     <h1>Atendimentos</h1>
     <p>Acompanhe os pedidos e as apresentações do planetário em um só lugar.</p>
    </div>
   </div>
   <div className={styles.headerActions}>
    <label className={styles.search}>
     <span className={styles.searchIcon}><Search size={18} aria-hidden="true"/></span>
     <span className={styles.srOnly}>Buscar escola ou responsável</span>
     <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar escola ou responsável"/>
    </label>
    <button type="button" className={styles.refresh} disabled={loading} onClick={()=>void load()}>
     <RefreshCw size={16} aria-hidden="true"/><span>{loading?'Atualizando...':'Atualizar'}</span>
    </button>
   </div>
  </header>
  <div className={styles.filters} role="group" aria-label="Filtrar atendimentos">
   {([
    {key:'all',name:'Todos'},
    {key:'new',name:'Novos'},
    {key:'reviewing',name:'Em análise'},
    {key:'draft',name:'Propostas'},
    {key:'awaiting',name:'Aguardando aceite'},
    {key:'accepted',name:'Aceites registrados'},
    {key:'archived',name:'Arquivados'}
   ] as const).map(option=><button type="button" key={option.key}
    className={[styles.filter,filter===option.key?styles.filterActive:''].filter(Boolean).join(' ')}
    onClick={()=>{setFilter(option.key);setPage(1);}} aria-pressed={filter===option.key}>
    {option.name}<span className={styles.filterCount}>{leads.filter(l=>matchesFilter(l,option.key)).length}</span>
   </button>)}
  </div>
  {error&&<p role="alert" className={[styles.notification,styles.error].join(' ')}>{error}</p>}
  {notice&&<p role="status" className={styles.notification}>{notice}</p>}
  {loading?<div className={styles.empty} role="status">Carregando solicitações...</div>:
   !error&&shown.length===0?<div className={styles.empty}>Nenhuma solicitação nesta categoria.</div>:null}
  <div className={styles.list}>
   <div className={styles.tableHead} aria-hidden="true">
    <span>Escola / Atendimento</span><span>Data pretendida</span><span>Etapa</span><span>Próximo passo</span>
   </div>
   {!loading&&visible.map(lead=><article key={lead.id} className={styles.lead}>
    <div className={styles.leadHead}>
     <div className={styles.leadIcon}><Building2 size={24} aria-hidden="true"/></div>
     <div className={styles.leadTitle}>
      <h2>{lead.institution}</h2>
      <div className={styles.leadSubtitle}>{lead.attendees??'A combinar'} participantes · {lead.city||'Cidade a combinar'}</div>
     </div>

    </div>
    <div className={styles.quickFacts}>
     <CalendarDays size={16} aria-hidden="true"/><span>{date(lead.desired_date)}</span>
    </div>
     <span className={[styles.status,
      lead.status==='converted'&&lead.proposal_status==='accepted'?styles.statusConverted:
      lead.status==='converted'?styles.statusReviewing:
      lead.status==='archived'?styles.statusArchived:
      lead.status==='reviewing'?styles.statusReviewing:
      lead.status==='pending'?styles.statusPending:''].join(' ')}>
      {lead.status==='converted'&&lead.proposal_status==='accepted'&&<CheckCircle2 size={14} aria-hidden="true"/>}
      {statusLabel(lead)}
     </span>

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
       ? <Link href={'/agenda/reservas?proposalId='+encodeURIComponent(lead.converted_proposal_id)} className={styles.actionPrimary}>
         <CalendarDays size={16}/>Organizar reserva</Link>
       : <Link href={'/vitrine/proposta/'+lead.converted_proposal_id+'?visualizar=1'} className={styles.actionPrimary}>
         <FileText size={16}/>Visualizar / Salvar PDF</Link>)}
     {lead.status==='archived'&&
      <button type="button" disabled={Boolean(busy)} onClick={()=>void review(lead.id,'pending')}
       className={styles.actionPrimary}><Archive size={16}/>Reabrir solicitação</button>}
     {lead.status==='converted'&&lead.converted_proposal_id&&['approved_internal','legacy_accepted'].includes(String(lead.proposal_status))&&
      <button type="button" disabled={Boolean(busy)||!conversionEnabled} onClick={()=>setAcceptLeadId(lead.id)}
       className={styles.actionSecondary}><CheckCircle2 size={16}/>Registrar aceite real</button>}
     <a className={styles.actionWhatsApp}
      href={'https://wa.me/'+lead.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(whatsAppMessage(lead))}
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
       {lead.status==='converted'&&lead.converted_proposal_id&&['draft','approved_internal','legacy_accepted','accepted'].includes(String(lead.proposal_status))&&
        <Link href={'/vitrine/proposta/'+lead.converted_proposal_id+'?visualizar=1'} className={styles.actionSecondary}>
         <FileText size={16}/>Visualizar / Salvar PDF</Link>}
       {lead.status==='converted'&&lead.converted_proposal_id&&lead.proposal_status!=='draft'&&
        <span className={styles.moreHint}>{lead.proposal_status==='accepted'?'Aceite registrado. Proposta liberada para agendamento.':'Aprovação interna não equivale ao aceite da escola.'}</span>}
       {lead.converted_client_id&&<Link href={'/clientes/'+lead.converted_client_id} className={styles.actionSecondary}><Users size={16}/>Ficha da instituição</Link>}
      </div>
     </details>
    </div>
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
   </article>)}
  </div>
  {!loading&&shown.length>0&&<div className={styles.pagination}>
   <span>Exibindo {Math.min((page-1)*pageSize+1,shown.length)}–{Math.min(page*pageSize,shown.length)} de {shown.length} atendimentos</span>
   <div>
    <button type="button" disabled={page<=1} onClick={()=>setPage(v=>Math.max(1,v-1))} aria-label="Página anterior"><ArrowLeft size={15}/></button>
    <span>Página {page} de {totalPages}</span>
    <button type="button" disabled={page>=totalPages} onClick={()=>setPage(v=>Math.min(totalPages,v+1))} aria-label="Próxima página"><ArrowLeft size={15} style={{transform:'rotate(180deg)'}}/></button>
   </div>
  </div>}
  {activeLead&&<ProposalComposer
    key={activeLead.id}
    lead={activeLead}
    clientOptions={clients.filter(c=>c.kind===kindOf(activeLead.audience)).slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(c=>({id:c.id,name:c.name}))}
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
