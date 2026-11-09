'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
type Client={id:string;kind:string;name:string;email:string|null;phone:string|null;phone_secondary:string|null;city:string|null;status:string;notes:string|null};
type Contact={id:string;client_id:string;full_name:string;position:string|null;phone:string|null;email:string|null;is_primary:boolean};
type Event={id:string;client_id:string;title:string;event_date:string|null;status:string;expected_attendees:number|null};
type Attendance={id:string;title:string;event_date:string|null;expected_attendees:number|null;actual_students:number};
type Group={id:string;client_id:string;label:string;grade_level:string;student_count:number;teacher_name:string;teacher_contact:string};
const kinds:Record<string,string>={school:'Escola',company:'Empresa',association:'Associação',private:'Particular',other:'Cliente'};
const statuses:Record<string,string>={prospect:'Prospecto',active:'Ativo',inactive:'Arquivado'};
const eventStatuses:Record<string,string>={lead:'Oportunidade',quoted:'Orçado',reserved:'Reservado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado'};
const dateBR=(value:string|null)=>value?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value)):'Sem data';
export default function ClientDetails({id,writesEnabled,proposalWritesEnabled,contractWritesEnabled,attendance,domes}:{id:string;writesEnabled:boolean;proposalWritesEnabled:boolean;contractWritesEnabled:boolean;attendance:Attendance[];domes:{id:string;name:string;capacity:number|null}[]}){
 const [relationship,setRelationship]=useState<{events:{id:string;title:string;event_date:string|null;status:string}[];actions:{id:string;due_date:string|null;status:string;note:string;action_kind:string;archived?:boolean}[];error:string;loading:boolean}>({events:[],actions:[],error:'',loading:true});
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const [eventsResult,actionsResult]=await Promise.allSettled([
     fetch('/api/crm/clientes',{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Consulta de visitas indisponível.');const data=await response.json();if(!Array.isArray(data.events))throw Error('Dados de visitas inválidos.');return data.events as {client_id:string;id:string;title:string;event_date:string|null;status:string}[];}),
     fetch('/api/fidelizacao/acoes',{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Consulta de lembretes indisponível.');const data=await response.json();if(!Array.isArray(data.actions))throw Error('Dados de lembretes inválidos.');return data.actions as {client_id:string;id:string;due_date:string|null;status:string;note:string;action_kind:string;archived?:boolean}[];})
    ]);
    if(!active)return;
    setRelationship(previous=>({
     events:eventsResult.status==='fulfilled'?eventsResult.value.filter(e=>e.client_id===id):previous.events,
     actions:actionsResult.status==='fulfilled'?actionsResult.value.filter(a=>a.client_id===id):previous.actions,
     error:eventsResult.status==='rejected'?'Não foi possível atualizar as visitas. Verifique a conexão e tente novamente.':actionsResult.status==='rejected'?'Visitas carregadas; lembretes temporariamente indisponíveis.':'',
     loading:false
    }));
   }catch(e){if(active)setRelationship(v=>({...v,error:e instanceof Error?e.message:'Falha na consulta.',loading:false}));}
  };
  void load();
  const refresh=()=>{if(document.visibilityState==='visible')void load();};
  window.addEventListener('focus',refresh);
  return()=>{active=false;window.removeEventListener('focus',refresh);};
 },[id]);
 const todayRelationship=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
 const completedRelationship=relationship.events.filter(e=>e.status==='completed'&&e.event_date&&e.event_date.slice(0,10)<=todayRelationship).sort((a,b)=>(b.event_date||'').localeCompare(a.event_date||''));
 const totalRelationshipVisits=completedRelationship.length;
 const relationshipTier=totalRelationshipVisits>=8?'Diamante':totalRelationshipVisits>=4?'Ouro':totalRelationshipVisits>=2?'Prata':totalRelationshipVisits===1?'Bronze':'Sem categoria';
 const relationshipBenefits:Record<string,string>={'Bronze':'5% na segunda visita e acompanhamento','Prata':'10% e prioridade de agenda','Ouro':'15%, sessão extra a cada 5 visitas e material exclusivo','Diamante':'20%, sessão gratuita anual e selo Escola Parceira'};
 const pendingRelationship=relationship.actions.filter(a=>!a.archived&&a.status!=='completed'&&a.status!=='dismissed'&&a.due_date).sort((a,b)=>(a.due_date||'').localeCompare(b.due_date||''));
 const [activeTab,setActiveTab]=useState<'propostas'|'contratos'|'alunos'|'eventos'|'financeiro'|'fidelizacao'|'historico'|'observacoes'>('eventos');
 const [commercial,setCommercial]=useState<{proposals:Record<string,unknown>[];contracts:Record<string,unknown>[];unavailable:string[]}|null>(null);
 const [commercialError,setCommercialError]=useState('');
 const [proposalFilter,setProposalFilter]=useState<'active'|'archived'|'all'>('active');
 const [commercialForm,setCommercialForm]=useState<'proposal'|'contract'|null>(null);
 const [commercialBusy,setCommercialBusy]=useState(false);
 const [commercialFeedback,setCommercialFeedback]=useState('');
 const [proposalDraft,setProposalDraft]=useState({title:'',model:'per_student',attendees:'30',unitPrice:'10',fixedPrice:'0',discount:'0',deposit:'0',validUntil:'',notes:''});
 const [contractDraft,setContractDraft]=useState({proposalId:'',mode:'written',terms:''});
 const commercialDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(commercialForm)commercialDialog.current?.showModal();else commercialDialog.current?.close()},[commercialForm]);
 async function refreshCommercial(){
  const response=await fetch('/api/business',{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Não foi possível atualizar propostas e contratos');
  setCommercial({proposals:Array.isArray(data.proposals)?data.proposals:[],contracts:Array.isArray(data.contracts)?data.contracts:[],unavailable:Array.isArray(data.unavailable)?data.unavailable:[]});
 }
 async function saveCommercial(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(commercialBusy)return;
  const action=activeTab==='propostas'?'proposal':commercialForm;
  if(!action)return;
  if(action==='proposal'&&!proposalWritesEnabled)return;
  if(action==='contract'&&!contractWritesEnabled)return;
  setCommercialBusy(true);setCommercialFeedback('');
  try{
   const body=action==='proposal'?{action:'proposal',clientId:id,...proposalDraft,
    attendees:Number(proposalDraft.attendees),unitPrice:Number(proposalDraft.unitPrice),fixedPrice:Number(proposalDraft.fixedPrice),
    discount:Number(proposalDraft.discount),deposit:Number(proposalDraft.deposit)}:
    {action:'contract',...contractDraft};
   const response=await fetch(action==='proposal'?'/api/clientes/propostas':'/api/business/gravar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Não foi possível salvar');
   setCommercialForm(null);await refreshCommercial();
   setCommercialFeedback(action==='proposal'?'Proposta cadastrada com sucesso.':'Contrato cadastrado com sucesso.');
  }catch(err){setCommercialFeedback(err instanceof Error?err.message:'Operação não concluída');}
  finally{setCommercialBusy(false);}
 }
 const formInput:React.CSSProperties={display:'block',width:'100%',padding:10,border:'1px solid #abc7ed',borderRadius:9,marginTop:5,color:'#16325b',background:'#fff'};
 const formLabel:React.CSSProperties={fontSize:13,fontWeight:650,color:'#174987'};

 const [contractFor,setContractFor]=useState<string|null>(null);
 const [confirmContractId,setConfirmContractId]=useState<string|null>(null);
 const [contractResponsible,setContractResponsible]=useState('');
 const [confirmBusy,setConfirmBusy]=useState(false);
 async function confirmContract(contractId:string){
  if(confirmBusy||contractResponsible.trim().length<3)return;
  if(!window.confirm('Confirma que o cliente efetivamente formalizou este contrato? O registro ficará auditado.'))return;
  setConfirmBusy(true);setCommercialFeedback('');
  try{const r=await fetch('/api/clientes/contratos/confirmar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contractId,responsible:contractResponsible.trim(),confirm:true})});const d=await r.json();if(!r.ok)throw Error(d.error||'Confirmação não concluída');await refreshCommercial();setConfirmContractId(null);setContractResponsible('');setCommercialFeedback('Contrato confirmado e registrado no histórico de auditoria.');}
  catch(e){setCommercialFeedback(e instanceof Error?e.message:'Confirmação não concluída');}finally{setConfirmBusy(false);}
 }

 const [commercialActionBusy,setCommercialActionBusy]=useState(false);
 const [contractInline,setContractInline]=useState({mode:'written',terms:''});
 const statusNames:Record<string,string>={draft:'Rascunho',sent:'Enviada',accepted:'Aceita',rejected:'Recusada'};
 async function commercialAction(proposalId:string,action:'sent'|'accepted'|'rejected'|'contract'|'archive'|'restore'){
  if(commercialActionBusy)return;
  if(action==='archive'&&!window.confirm('Arquivar esta proposta? Ela poderá ser reativada a qualquer momento.'))return;
  if(action==='restore'&&!window.confirm('Reativar esta proposta?'))return;
  if(action==='rejected'&&!window.confirm('Registrar esta proposta como recusada?'))return;
  if(action==='accepted'&&!window.confirm('Confirmar que o cliente aceitou esta proposta?'))return;
  setCommercialActionBusy(true);setCommercialFeedback('');
  try{
   const response=await fetch('/api/clientes/comercial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proposalId,action,...(action==='contract'?contractInline:{})})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Operação não concluída');
   await refreshCommercial();setContractFor(null);setCommercialFeedback(action==='contract'?'Contrato registrado com sucesso.':action==='archive'?'Proposta arquivada.':action==='restore'?'Proposta reativada.':'Situação da proposta atualizada.');
  }catch(e){setCommercialFeedback(e instanceof Error?e.message:'Operação não concluída');}
  finally{setCommercialActionBusy(false);}
 }
 function proposalPdf(p:Record<string,unknown>){
  const proposalId=String(p.id||'');
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(proposalId)){setCommercialFeedback('Identificador da proposta inválido.');return;}
  const win=window.open('/comercial/documentos/'+encodeURIComponent(proposalId),'_blank','noopener,noreferrer');
  if(!win)setCommercialFeedback('Permita pop-ups para abrir o documento.');
 }
  function openProposalWhatsapp(p:Record<string,unknown>){
  if(!client)return;
  const phone=(client.phone||client.phone_secondary||'').replace(/\D/g,'');
  if(phone.length<10){setCommercialFeedback('Cadastre um telefone válido para enviar a proposta.');return;}
  const dest=phone.startsWith('55')?phone:'55'+phone;
  const msg=`Olá! Segue a proposta ${String(p.title||'ANTARES')} para ${client.name}, no valor de ${money(p.total)}. Encaminharei o PDF para sua avaliação. Aguardo seu retorno!`;
  window.open('https://wa.me/'+dest+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
  setCommercialFeedback('WhatsApp aberto. Anexe o PDF e confirme o envio; depois clique em Confirmar envio.');
 }
 const [finance,setFinance]=useState<{titles:{id:string;client_id:string;description:string;total:number;paid:number;due_on:string}[];payments:{id:string;client_id:string;description:string;amount:number;occurred_on:string}[]}|null>(null);
 const [financeError,setFinanceError]=useState('');
 const [financeWrites,setFinanceWrites]=useState(false);
 const [financeBusy,setFinanceBusy]=useState(false),[financeNotice,setFinanceNotice]=useState('');
 const [financeDescription,setFinanceDescription]=useState(''),[financeAmount,setFinanceAmount]=useState(''),[financeDue,setFinanceDue]=useState('');
 const [financePay,setFinancePay]=useState<Record<string,string>>({});
 const [financeDraftId,setFinanceDraftId]=useState<string|null>(null);
 const [financePaymentIds,setFinancePaymentIds]=useState<Record<string,string>>({});
 const [client,setClient]=useState<Client|null>(null),[contacts,setContacts]=useState<Contact[]>([]),[events,setEvents]=useState<Event[]>([]),[groups,setGroups]=useState<Group[]>([]);
 const emptyEventDraft={domeId:'',title:'',kind:'presentation',date:'',attendees:'',pricing:'per_student',price:'',fixed:'',status:'lead',venue:'',notes:''};
 const [eventDraft,setEventDraft]=useState(emptyEventDraft);
 const [eventSaving,setEventSaving]=useState(false);
 const [eventFeedback,setEventFeedback]=useState('');
 const eventDirty=Object.entries(eventDraft).some(([key,value])=>value!==emptyEventDraft[key as keyof typeof emptyEventDraft]);
 useEffect(()=>{if(!eventDirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[eventDirty]);
 async function saveEvent(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!writesEnabled||eventSaving||!client)return;
  setEventSaving(true);setEventFeedback('');
  try{
   const response=await fetch('/api/crm/clientes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...eventDraft,action:'event',clientId:id})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível salvar o evento.');
   const refresh=await fetch('/api/crm/clientes',{cache:'no-store'});const data=await refresh.json();
   if(!refresh.ok)throw Error(data.error||'Evento salvo, mas não foi possível atualizar a lista.');
   setEvents((data.events||[]).filter((item:Event)=>item.client_id===id));
   setEventDraft(emptyEventDraft);setEventFeedback('Evento cadastrado com sucesso.');
  }catch(err){setEventFeedback(err instanceof Error?err.message:'Falha ao cadastrar evento.');}
  finally{setEventSaving(false);}
 }
 const [notesDraft,setNotesDraft]=useState<string|null>(null);
 const [notesSaving,setNotesSaving]=useState(false);
 const [notesFeedback,setNotesFeedback]=useState('');
 const notesValue=notesDraft??client?.notes??'';
 const notesDirty=notesValue!==(client?.notes??'');
 async function saveNotes(){
  if(!client||!notesDirty||notesSaving)return;
  setNotesSaving(true);setNotesFeedback('');
  try{
   const response=await fetch('/api/crm/clientes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'client',id:client.id,kind:client.kind,name:client.name,email:client.email||'',phone:client.phone||'',phoneSecondary:client.phone_secondary||'',city:client.city||'',status:client.status,notes:notesValue})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível salvar as observações.');
   setClient(previous=>previous?{...previous,notes:notesValue}:previous);
   setNotesDraft(null);setNotesFeedback('Observações salvas com sucesso.');
  }catch(e){setNotesFeedback(e instanceof Error?e.message:'Falha ao salvar observações.');}
  finally{setNotesSaving(false);}
 }
 useEffect(()=>{
  const warn=(event:BeforeUnloadEvent)=>{if(notesDirty){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[notesDirty]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[educationError,setEducationError]=useState('');
 const [newGroup,setNewGroup]=useState(false),[saving,setSaving]=useState(false),[groupError,setGroupError]=useState('');
 const groupDialog=useRef<HTMLDialogElement>(null);
 const emptyGroup={label:'',grade:'',studentCount:0,teacher:'',contact:'',notes:''};
 const [groupForm,setGroupForm]=useState(emptyGroup);
 const groupDirty=Object.entries(groupForm).some(([key,value])=>value!==emptyGroup[key as keyof typeof emptyGroup]);
 useEffect(()=>{if(newGroup)groupDialog.current?.showModal();},[newGroup]);
 useEffect(()=>{if(!newGroup||!groupDirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[newGroup,groupDirty]);
 const closeGroup=()=>{if(saving)return;if(groupDirty&&!window.confirm('Descartar as alterações não salvas?'))return;setNewGroup(false);setGroupError('');};
 async function saveGroup(e:React.FormEvent<HTMLFormElement>){
 e.preventDefault();if(!writesEnabled||saving||client?.kind!=='school')return;
 setSaving(true);setGroupError('');
 try{const response=await fetch('/api/educacional',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...groupForm,schoolId:id})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao cadastrar turma');
 const refresh=await fetch('/api/educacional',{cache:'no-store'});const result=await refresh.json();if(!refresh.ok)throw Error(result.error||'Falha ao atualizar consulta');
 setGroups((result.groups||[]).filter((g:Group)=>g.client_id===id));setGroupForm(emptyGroup);setNewGroup(false);
 }catch(e){setGroupError(e instanceof Error?e.message:'Cadastro indisponível');}finally{setSaving(false);}
 }
 useEffect(()=>{const ctrl=new AbortController();(async()=>{
 try{
 const r=await fetch('/api/crm/clientes',{cache:'no-store',signal:ctrl.signal});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível carregar o cliente');
 const found=(data.clients||[]).find((c:Client)=>c.id===id) as Client|undefined;
 if(!found)throw Error('Cliente não encontrado ou sem permissão de consulta.');
 setClient(found);
 setContacts((data.contacts||[]).filter((c:Contact)=>c.client_id===id));
 setEvents((data.events||[]).filter((e:Event)=>e.client_id===id));
 if(found.kind==='school'){
 try{const er=await fetch('/api/educacional',{cache:'no-store',signal:ctrl.signal});const ed=await er.json();
 if(!er.ok)throw Error(ed.error||'Consulta indisponível');
 setGroups((ed.groups||[]).filter((g:Group)=>g.client_id===id));
 }catch(e){if(!ctrl.signal.aborted)setEducationError(e instanceof Error?e.message:'Turmas indisponíveis');}
 }
 }catch(e){if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Erro de consulta');}
 finally{if(!ctrl.signal.aborted)setLoading(false);}
 })();return()=>ctrl.abort();},[id]);
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/business',{cache:'no-store',signal:ctrl.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Consulta comercial indisponível');if(!ctrl.signal.aborted)setCommercial({proposals:Array.isArray(data.proposals)?data.proposals:[],contracts:Array.isArray(data.contracts)?data.contracts:[],unavailable:Array.isArray(data.unavailable)?data.unavailable:[]});}).catch(e=>{if(!ctrl.signal.aborted&&e?.name!=='AbortError')setCommercialError('Consulta comercial indisponível no momento.')});return()=>ctrl.abort()},[]);
 useEffect(()=>{const ctrl=new AbortController();setFinanceError('');fetch('/api/financeiro/receber',{cache:'no-store',signal:ctrl.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Consulta indisponível');if(!ctrl.signal.aborted){setFinance({titles:Array.isArray(data.titles)?data.titles:[],payments:Array.isArray(data.payments)?data.payments:[]});setFinanceWrites(data.writesEnabled===true);}}).catch(e=>{if(!ctrl.signal.aborted&&e?.name!=='AbortError')setFinanceError('Não foi possível consultar os valores desta instituição.');});return()=>ctrl.abort();},[activeTab]);
 const reloadFinance=async()=>{const r=await fetch('/api/financeiro/receber',{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Consulta financeira indisponível');setFinance({titles:Array.isArray(data.titles)?data.titles:[],payments:Array.isArray(data.payments)?data.payments:[]});setFinanceWrites(data.writesEnabled===true);};
 const postFinance=async(payload:Record<string,unknown>)=>{const r=await fetch('/api/financeiro/receber',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível registrar.');return data;};
 const createFinanceTitle=async()=>{if(financeBusy||!financeWrites)return;const amount=Number(financeAmount.trim().replace(',','.'));if(!financeDescription.trim()||!Number.isFinite(amount)||amount<=0||!financeDue){setFinanceNotice('Informe descrição, valor e vencimento.');return;}if(!window.confirm('Criar conta a receber de '+money(amount)+' para esta instituição? Isso não registra dinheiro recebido.'))return;const uuid=financeDraftId||crypto.randomUUID();setFinanceDraftId(uuid);setFinanceBusy(true);setFinanceNotice('');try{await postFinance({action:'create',id:uuid,client_id:id,description:financeDescription.trim(),total:amount,due_on:financeDue});await reloadFinance();setFinanceDescription('');setFinanceAmount('');setFinanceDraftId(null);setFinanceNotice('Conta a receber registrada. Nenhuma receita foi lançada.');}catch(e){setFinanceNotice(e instanceof Error?e.message:'Falha ao registrar.');}finally{setFinanceBusy(false);}};
 const payFinanceTitle=async(t:{id:string;total:number;paid:number})=>{if(financeBusy||!financeWrites)return;const amount=Number((financePay[t.id]||'').trim().replace(',','.'));const pending=Math.max(0,Number(t.total)-Number(t.paid));if(!Number.isFinite(amount)||amount<=0||amount>pending){setFinanceNotice('Informe um valor válido, até o saldo pendente.');return;}if(!window.confirm('Confirmar que recebeu '+money(amount)+'? Esse valor será lançado no caixa geral.'))return;const uuid=financePaymentIds[t.id]||crypto.randomUUID();setFinancePaymentIds(v=>({...v,[t.id]:uuid}));setFinanceBusy(true);setFinanceNotice('');try{const result=await postFinance({action:'pay',id:uuid,receivable_id:t.id,amount,paid_on:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})});await reloadFinance();setFinancePay(v=>({...v,[t.id]:''}));setFinancePaymentIds(v=>{const n={...v};delete n[t.id];return n;});setFinanceNotice(result.alreadyExists?'Recebimento já registrado, sem duplicação.':'Pagamento registrado no Financeiro geral.');}catch(e){setFinanceNotice(e instanceof Error?e.message:'Falha ao registrar pagamento.');}finally{setFinanceBusy(false);}};
 const proposals=commercial?.proposals.filter(p=>String(p.client_id)===id)||[];
 const visibleProposals=proposals.filter(p=>proposalFilter==='all'||(proposalFilter==='archived'?Boolean(p.archived_at):!p.archived_at));
 const archivedCount=proposals.filter(p=>Boolean(p.archived_at)).length;
 const proposalIds=new Set(proposals.map(p=>String(p.id)));
 const contracts=commercial?.contracts.filter(c=>proposalIds.has(String(c.proposal_id)))||[];
 const actionLink:React.CSSProperties={display:'inline-block',padding:'9px 14px',background:'#145ac3',color:'#fff',borderRadius:9,fontWeight:700,textDecoration:'none',fontSize:13};
 const money=(value:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
 const panel:React.CSSProperties={background:'linear-gradient(125deg,#f3f8ff 0%,#ffffff 60%,#edf5ff 100%)',border:'1px solid #c6d9f4',borderLeft:'4px solid #4d8de2',borderRadius:14,padding:13,marginBottom:12,boxShadow:'0 9px 23px rgba(18,62,132,.12),0 2px 5px rgba(18,62,132,.06)'};
 const heading:React.CSSProperties={fontSize:17,fontWeight:700,lineHeight:1.35,color:'#174987',margin:'0 0 12px'};
 const row:React.CSSProperties={padding:'11px 13px',background:'linear-gradient(100deg,#e1efff,#f4f9ff)',border:'1px solid #c5dcfa',borderLeft:'4px solid #4b8ce5',borderRadius:9,marginBottom:8,overflowWrap:'anywhere',fontSize:13,lineHeight:1.5};
 return <main style={{maxWidth:1180,margin:'0 auto',padding:'16px 20px 36px',fontFamily:'system-ui',color:'#16325b'}}>
 {loading?<p>Carregando ficha...</p>:error?<p role="alert">{error}</p>:client&&<>
 <header style={{background:'linear-gradient(110deg,#102c63,#1162ba)',color:'#fff',borderRadius:14,padding:'14px 20px',marginBottom:12,boxShadow:'0 8px 22px rgba(14,62,130,.18)'}}>
 <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#b8dcff'}}>ANTARES · CLIENTES</div>
 <h1 style={{fontSize:23,lineHeight:1.25,margin:'7px 0 0'}}>{client.name}</h1><div style={{fontSize:12,marginTop:7}}>{kinds[client.kind]||client.kind} · {client.city||'Cidade não informada'} · {statuses[client.status]||client.status}</div>
 
 </header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:14}}>
 {([['Eventos',events.length,'eventos'],['Propostas',proposals.length,'propostas'],['Contratos',contracts.length,'contratos']] as [string,number,'eventos'|'propostas'|'contratos'][]).map(([label,value,tab])=><button type="button" key={label} onClick={()=>setActiveTab(tab)} aria-label={`Abrir ${label.toLowerCase()} deste cliente`} style={{textAlign:'left',cursor:'pointer',background:'#edf5ff',border:'1px solid #bdd3f3',borderTop:'4px solid #347fe0',borderRadius:12,padding:'12px 15px'}}><div style={{fontSize:12,fontWeight:600,color:'#42628b'}}>{label}</div><strong style={{fontSize:23,color:'#143e82'}}>{value}</strong></button>)}
 <button type="button" onClick={()=>setActiveTab('financeiro')} aria-label="Abrir financeiro desta instituição" style={{textAlign:'left',cursor:'pointer',background:'#edf5ff',border:'1px solid #bdd3f3',borderTop:'4px solid #347fe0',borderRadius:12,padding:'12px 15px'}}><div style={{fontSize:12,fontWeight:600,color:'#42628b'}}>Financeiro da instituição</div><strong style={{display:'block',marginTop:5,fontSize:16,color:'#143e82'}}>{finance?money(finance.titles.filter(t=>t.client_id===id).reduce((n,t)=>n+Math.max(0,Number(t.total)-Number(t.paid)),0)):'Consultar valores'}</strong><div style={{fontSize:11,color:'#42628b',marginTop:4}}>{finance?'Saldo pendente da instituição':'Clique para consultar o financeiro'}</div></button>
 </div>
 <section style={{...panel,borderLeftColor:'#397fda'}}><h2 style={heading}>Dados da instituição</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:8,fontSize:12}}>
 {([['Tipo',kinds[client.kind]||client.kind],['Situação',statuses[client.status]||client.status],['Cidade',client.city||'—'],['E-mail',client.email||'—'],['Telefone',client.phone||'—'],...(client.phone_secondary?[['Telefone secundário',client.phone_secondary]]:[])] as [string,string][]).map(([label,value])=><div key={label}><strong style={{color:'#315e94'}}>{label}</strong><div style={{marginTop:4,overflowWrap:'anywhere'}}>{value}</div></div>)}
 </div></section>
 <nav aria-label="Seções do cliente" style={{display:'flex',flexWrap:'wrap',gap:8,margin:'14px 0'}}>{([['eventos','Eventos'],['propostas','Propostas'],['contratos','Contratos'],['alunos','Alunos'],['fidelizacao','Fidelização'],['financeiro','Financeiro'],['historico','Histórico'],['observacoes','Observações']] as const).map(([key,label])=><button key={key} type="button" aria-current={activeTab===key?'page':undefined} onClick={()=>setActiveTab(key)} style={{cursor:'pointer',border:'1px solid #a9c7ee',borderRadius:10,padding:'10px 15px',fontWeight:700,background:activeTab===key?'linear-gradient(110deg,#0862cf,#16458e)':'#eaf3ff',color:activeTab===key?'#fff':'#174987'}}>{label}</button>)}</nav>
 {activeTab==='propostas'&&<section style={{...panel,borderLeftColor:'#169caa'}}><h2 style={heading}>Propostas e orçamentos ({proposals.length})</h2><p style={{fontSize:13}}>Propostas comerciais vinculadas a {client.name}.</p>
 {proposalWritesEnabled&&<form onSubmit={saveCommercial} style={{display:'grid',gap:12,maxWidth:680,padding:'14px 0 20px'}}><p style={{fontSize:13,margin:0}}>Instituição: <strong>{client.name}</strong> (vínculo fixo)</p>
 <label style={formLabel}>Título<input required maxLength={180} style={formInput} value={proposalDraft.title} onChange={e=>setProposalDraft(v=>({...v,title:e.target.value}))}/></label>
 <label style={formLabel}>Cobrança<select style={formInput} value={proposalDraft.model} onChange={e=>setProposalDraft(v=>({...v,model:e.target.value}))}><option value="per_student">Por aluno</option><option value="fixed">Valor fechado</option><option value="complimentary">Gratuito</option></select></label>
 <label style={formLabel}>Participantes previstos<input required type="number" min={0} step={1} style={formInput} value={proposalDraft.attendees} onChange={e=>setProposalDraft(v=>({...v,attendees:e.target.value}))}/></label>
 {proposalDraft.model==='per_student'&&<label style={formLabel}>Preço por aluno (R$)<input required type="number" min={0} step="0.01" style={formInput} value={proposalDraft.unitPrice} onChange={e=>setProposalDraft(v=>({...v,unitPrice:e.target.value}))}/></label>}
 {proposalDraft.model==='fixed'&&<label style={formLabel}>Valor fechado (R$)<input required type="number" min={0} step="0.01" style={formInput} value={proposalDraft.fixedPrice} onChange={e=>setProposalDraft(v=>({...v,fixedPrice:e.target.value}))}/></label>}
 <label style={formLabel}>Desconto (R$)<input type="number" min={0} step="0.01" style={formInput} value={proposalDraft.discount} onChange={e=>setProposalDraft(v=>({...v,discount:e.target.value}))}/></label>
 <label style={formLabel}>Sinal (R$)<input type="number" min={0} step="0.01" style={formInput} value={proposalDraft.deposit} onChange={e=>setProposalDraft(v=>({...v,deposit:e.target.value}))}/></label>
 <label style={formLabel}>Validade<input type="date" style={formInput} value={proposalDraft.validUntil} onChange={e=>setProposalDraft(v=>({...v,validUntil:e.target.value}))}/></label>
 <label style={formLabel}>Observações<textarea maxLength={4000} rows={3} style={formInput} value={proposalDraft.notes} onChange={e=>setProposalDraft(v=>({...v,notes:e.target.value}))}/></label>
 <p style={{margin:0}}>Total estimado: <strong>{money(Math.max(0,(proposalDraft.model==='per_student'?Number(proposalDraft.attendees)*Number(proposalDraft.unitPrice):proposalDraft.model==='fixed'?Number(proposalDraft.fixedPrice):0)-Number(proposalDraft.discount)))}</strong></p>
<button type="submit" disabled={commercialBusy} style={{...actionLink,border:0,justifySelf:'start'}}>{commercialBusy?'Salvando…':'Salvar proposta'}</button></form>}
 <div role="group" aria-label="Filtrar propostas" style={{display:'flex',flexWrap:'wrap',gap:7,alignItems:'center',margin:'4px 0 12px'}}>
 {([['active','Ativas',proposals.length-archivedCount],['archived','Arquivadas',archivedCount],['all','Todas',proposals.length]] as const).map(([value,label,count])=><button key={value} type="button" aria-pressed={proposalFilter===value} onClick={()=>setProposalFilter(value)} style={{...actionLink,border:'1px solid #91b7e8',background:proposalFilter===value?'#145ac3':'#e6f1ff',color:proposalFilter===value?'#fff':'#174987'}}>{label} ({count})</button>)}
 </div>
 {commercialError?<p role="alert">{commercialError}</p>:!commercial?<p>Carregando informações comerciais…</p>:commercial.unavailable.includes('proposals')?<p>Propostas temporariamente indisponíveis.</p>:visibleProposals.length===0?<p>{proposalFilter==='archived'?'Nenhuma proposta arquivada.':proposalFilter==='active'?'Nenhuma proposta ativa.':'Nenhuma proposta vinculada a esta instituição.'}</p>:visibleProposals.map(p=><div key={String(p.id)} style={row}><strong>{String(p.title||'Proposta')}</strong> · {money(p.total)} · <strong>{statusNames[String(p.status)]||String(p.status||'Sem situação')}</strong>{Boolean(p.archived_at)&&<span style={{marginLeft:8,color:'#526e96',fontWeight:700}}>· Arquivada</span>}<div style={{fontSize:12}}>Criada em {dateBR(p.created_at?String(p.created_at):null)}</div>
 <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:10}}>
 <button type="button" onClick={()=>proposalPdf(p)} style={actionLink}>PDF / Imprimir</button>
 <button type="button" onClick={()=>openProposalWhatsapp(p)} style={actionLink}>WhatsApp</button>
 {proposalWritesEnabled&&!p.archived_at&&['draft','sent'].includes(String(p.status))&&<>
 <button type="button" disabled={commercialActionBusy} onClick={()=>commercialAction(String(p.id),'sent')} style={actionLink}>Confirmar envio</button>
 <button type="button" disabled={commercialActionBusy} onClick={()=>commercialAction(String(p.id),'accepted')} style={actionLink}>Aceita</button>
 <button type="button" disabled={commercialActionBusy} onClick={()=>commercialAction(String(p.id),'rejected')} style={{...actionLink,background:'#526e96'}}>Recusada</button>
 </>}
 {proposalWritesEnabled&&<button type="button" disabled={commercialActionBusy} onClick={()=>commercialAction(String(p.id),p.archived_at?'restore':'archive')} style={{...actionLink,background:p.archived_at?'#166e9e':'#526e96'}}>{p.archived_at?'Reativar':'Arquivar'}</button>}
 {proposalWritesEnabled&&!p.archived_at&&String(p.status)==='accepted'&&!contracts.some(c=>String(c.proposal_id)===String(p.id))&&<button type="button" onClick={()=>setContractFor(String(p.id))} style={actionLink}>Criar contrato</button>}
 </div>
 {contractFor===String(p.id)&&<form onSubmit={e=>{e.preventDefault();void commercialAction(String(p.id),'contract')}} style={{display:'grid',gap:9,maxWidth:540,marginTop:12}}>
 <label style={formLabel}>Modalidade<select style={formInput} value={contractInline.mode} onChange={e=>setContractInline(v=>({...v,mode:e.target.value}))}><option value="written">Formal por escrito</option><option value="verbal">Acordo verbal</option><option value="whatsapp">WhatsApp</option></select></label>
 <label style={formLabel}>Condições acordadas<textarea required minLength={8} maxLength={8000} rows={4} style={formInput} value={contractInline.terms} onChange={e=>setContractInline(v=>({...v,terms:e.target.value}))}/></label>
 <div style={{display:'flex',gap:8}}><button type="submit" disabled={commercialActionBusy} style={actionLink}>Salvar contrato</button><button type="button" onClick={()=>setContractFor(null)} style={{...actionLink,background:'#526e96'}}>Cancelar</button></div>
 </form>}
 </div>)}
</section>}
 {activeTab==='contratos'&&<section style={{...panel,borderLeftColor:'#3c7ad4'}}><h2 style={heading}>Contratos ({contracts.length})</h2><p style={{fontSize:13}}>Contratos vinculados a propostas aceitas de {client.name}. O cadastro não equivale à confirmação do cliente.</p>
 {commercialError?<p role="alert">{commercialError}</p>:!commercial?<p>Carregando contratos…</p>:commercial.unavailable.includes('contracts')||commercial.unavailable.includes('proposals')?<p>Contratos temporariamente indisponíveis.</p>:contracts.length===0?<p>Nenhum contrato vinculado a esta instituição.</p>:contracts.map(c=>{
 const status=String(c.status||'pending');const contractId=String(c.id);
 const modeNames:Record<string,string>={written:'Formal por escrito',formal:'Formal por escrito',verbal:'Acordo verbal',whatsapp:'WhatsApp'};
 return <div key={contractId} style={row}><strong>{String(c.proposal_title||'Contrato')}</strong> · <strong>{status==='pending'?'Pendente de confirmação':status==='confirmed'?'Confirmado':status==='cancelled'?'Cancelado':status}</strong>
 <div style={{fontSize:12}}>Modalidade: {modeNames[String(c.confirmation_mode)]||String(c.confirmation_mode||'Não informada')}</div>
 <div style={{fontSize:12}}>{status==='confirmed'?'Confirmado em '+dateBR(c.confirmed_at?String(c.confirmed_at):null):'Ainda não confirmado pelo cliente'}</div>
 {Boolean(c.confirmed_by_name)&&<div style={{fontSize:12}}>Responsável informado: {String(c.confirmed_by_name)}</div>}
 {status==='pending'&&<div style={{marginTop:10}}>
 {confirmContractId===contractId?<form onSubmit={e=>{e.preventDefault();void confirmContract(contractId)}} style={{display:'grid',gap:10,maxWidth:540}}>
 <label style={formLabel}>Nome de quem confirmou o acordo<input required minLength={3} maxLength={180} style={formInput} value={contractResponsible} onChange={e=>setContractResponsible(e.target.value)} placeholder="Nome do responsável pela confirmação"/></label>
 <p style={{fontSize:12,margin:0}}>A data e a hora serão registradas pelo servidor. Confirme somente após o aceite real do cliente.</p>
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="submit" disabled={confirmBusy||contractResponsible.trim().length<3} style={{...actionLink,border:0}}>{confirmBusy?'Confirmando…':'Confirmar contrato'}</button><button type="button" disabled={confirmBusy} onClick={()=>setConfirmContractId(null)} style={{...actionLink,background:'#526e96',border:0}}>Cancelar</button></div></form>:
 <button type="button" onClick={()=>{setConfirmContractId(contractId);setContractResponsible('');setCommercialFeedback('')}} style={{...actionLink,border:0}}>Registrar confirmação</button>}</div>}
 </div>})}
 </section>}
 {commercialFeedback&&<p role="status" style={{...panel,borderLeftColor:'#169caa'}}>{commercialFeedback}</p>}
 <dialog ref={commercialDialog} onCancel={e=>{if(commercialBusy){e.preventDefault();return}setCommercialForm(null)}} style={{border:'1px solid #a8c6f0',borderRadius:16,padding:0,width:'min(590px,94vw)',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 18px 60px #12356766'}}>
 {commercialForm&&<><div style={{background:'linear-gradient(110deg,#12386f,#1769c7)',padding:'17px 22px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>{commercialForm==='proposal'?'Nova proposta':'Novo contrato'}</strong><button type="button" disabled={commercialBusy} onClick={()=>setCommercialForm(null)} aria-label="Fechar" style={{color:'white',fontSize:22}}>×</button></div>
 <form onSubmit={saveCommercial} style={{padding:22,display:'grid',gap:12}}>
 <p style={{margin:0,fontSize:13}}>Instituição: <strong>{client.name}</strong> (vínculo fixo)</p>
 {commercialForm==='contract'&&<>

 <label style={formLabel}>Proposta aceita<select required style={formInput} value={contractDraft.proposalId} onChange={e=>setContractDraft(v=>({...v,proposalId:e.target.value}))}><option value="">Selecione uma proposta aceita</option>{proposals.filter(p=>p.status==='accepted'&&!contracts.some(c=>String(c.proposal_id)===String(p.id))).map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.title)}</option>)}</select></label>
 <label style={formLabel}>Modalidade<select style={formInput} value={contractDraft.mode} onChange={e=>setContractDraft(v=>({...v,mode:e.target.value}))}><option value="written">Formal por escrito</option><option value="verbal">Acordo verbal</option><option value="whatsapp">WhatsApp</option></select></label>
 <label style={formLabel}>Condições acordadas<textarea required minLength={8} maxLength={8000} rows={4} style={formInput} value={contractDraft.terms} onChange={e=>setContractDraft(v=>({...v,terms:e.target.value}))}/></label>
 <p style={{fontSize:12}}>Registre apenas acordos efetivamente autorizados pelo cliente.</p>
 </>}
 <div style={{display:'flex',justifyContent:'flex-end',gap:10}}><button type="button" disabled={commercialBusy} onClick={()=>setCommercialForm(null)} style={{...actionLink,background:'#eaf3ff',color:'#174987'}}>Cancelar</button><button type="submit" disabled={commercialBusy||commercialForm==='contract'&&!proposals.some(p=>p.status==='accepted'&&!contracts.some(c=>String(c.proposal_id)===String(p.id)))} style={actionLink}>{commercialBusy?'Salvando…':'Salvar'}</button></div>
 </form></>}
 </dialog>
 {activeTab==='alunos'&&<section style={{...panel,borderLeftColor:'#169caa'}}><h2 style={heading}>Alunos atendidos</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:14}}><div style={row}><div style={{fontWeight:700}}>Total de alunos atendidos</div><strong style={{fontSize:24}}>{attendance.reduce((sum,e)=>sum+e.actual_students,0).toLocaleString('pt-BR')}</strong></div><div style={row}><div style={{fontWeight:700}}>Eventos contabilizados</div><strong style={{fontSize:24}}>{attendance.length}</strong></div></div><h3 style={{...heading,fontSize:15}}>Histórico de atendimentos</h3><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,textAlign:'left'}}><thead><tr>{['Data','Evento','Previstos','Atendidos'].map(label=><th key={label} style={{padding:10,borderBottom:'2px solid #bcd3fa'}}>{label}</th>)}</tr></thead><tbody>{attendance.map(e=><tr key={e.id}><td style={{padding:10,borderBottom:'1px solid #dce8f7'}}>{dateBR(e.event_date)}</td><td style={{padding:10,borderBottom:'1px solid #dce8f7'}}>{e.title}</td><td style={{padding:10,borderBottom:'1px solid #dce8f7'}}>{e.expected_attendees??'—'}</td><td style={{padding:10,borderBottom:'1px solid #dce8f7'}}><strong>{e.actual_students.toLocaleString('pt-BR')}</strong></td></tr>)}</tbody></table></div>{attendance.length===0&&<p style={{fontSize:13}}>Nenhum atendimento encerrado e contabilizado para esta instituição.</p>}</section>}
 {activeTab==='eventos'&&<section style={panel}>
  <h2 style={heading}>Eventos ({events.length})</h2>
  {writesEnabled&&<form onSubmit={saveEvent} style={{background:'#edf5ff',border:'1px solid #c3dafa',borderRadius:12,padding:14,marginBottom:14}}>
   <h3 style={{margin:'0 0 10px',color:'#174987',fontSize:15}}>Novo evento para {client?.name||'esta instituição'}</h3>
   <fieldset disabled={eventSaving} style={{border:0,padding:0,margin:0,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,160px),1fr))',gap:12}}>
    {([['title','Título'],['kind','Tipo de evento'],['date','Data'],['attendees','Participantes'],['domeId','Cúpula'],['pricing','Cobrança'],['price','Valor por participante'],['fixed','Valor fechado'],['status','Situação'],['venue','Local'],['notes','Observações']] as const).map(([key,label])=><label key={key} style={formLabel}>{label}
     {key==='kind'||key==='pricing'||key==='status'?
      <select value={eventDraft[key]} onChange={e=>setEventDraft(previous=>({...previous,[key]:e.target.value}))} style={formInput}>
       {(key==='kind'?[['presentation','Apresentação'],['corporate','Corporativo'],['private','Particular'],['other','Outro']]:key==='pricing'?[['per_student','Por participante'],['fixed','Valor fechado'],['complimentary','Gratuito']]:Object.entries(eventStatuses)).map(([value,text])=><option key={value} value={value}>{text}</option>)}
      </select>:
      <input value={eventDraft[key]} onChange={e=>setEventDraft(previous=>({...previous,[key]:e.target.value}))} type={key==='date'?'date':key==='attendees'||key==='price'||key==='fixed'?'number':'text'} step={key==='price'||key==='fixed'?'0.01':undefined} min={key==='attendees'||key==='price'||key==='fixed'?'0':undefined} required={key==='title'} style={formInput}/>}
    </label>)}
   </fieldset>
   <button type="submit" disabled={eventSaving} style={{...actionLink,border:0,marginTop:12,cursor:'pointer'}}>{eventSaving?'Salvando...':'Salvar evento'}</button>
   {eventFeedback&&<p role="status" style={{margin:'9px 0 0',color:'#174987'}}>{eventFeedback}</p>}
  </form>}
  {events.length===0?<p>Nenhum evento registrado para esta instituição.</p>:events.map(e=><div key={e.id} style={row}><strong>{e.title}</strong> · {dateBR(e.event_date)} · {eventStatuses[e.status]||e.status}<div><Link href={`/eventos/${e.id}`} style={{fontWeight:700,color:'#1556ae'}}>Abrir evento e operação</Link></div></div>)}
 </section>}
 {activeTab==='fidelizacao'&&<section style={{...panel,borderLeftColor:'#2468c5'}}><h2 style={heading}>Fidelização da instituição</h2>{relationship.loading?<p>Carregando relacionamento…</p>:relationship.error?<p role="alert">{relationship.error}</p>:<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:10,marginBottom:16}}><div style={row}><strong>Visitas realizadas</strong><div style={{fontSize:24,fontWeight:700}}>{completedRelationship.length}</div></div><div style={row}><strong>Categoria acumulada</strong><div style={{fontSize:20,fontWeight:700}}>{relationshipTier}</div></div><div style={row}><strong>Próximo contato</strong><div style={{fontSize:16,fontWeight:700}}>{pendingRelationship[0]?.due_date?dateBR(pendingRelationship[0].due_date):'Não programado'}</div></div></div><div style={{...row,marginBottom:12}}><strong>Benefícios da categoria</strong><p style={{margin:'6px 0 0',fontSize:13}}>{relationshipBenefits[relationshipTier]||'Disponíveis após a primeira visita concluída.'}</p></div><div style={{...row,marginBottom:12}}><strong>Histórico de visitas</strong>{completedRelationship.length===0?<p style={{fontSize:13}}>Nenhuma visita concluída registrada.</p>:completedRelationship.map(e=><div key={e.id} style={{padding:'8px 0',borderBottom:'1px solid #dce8f7',fontSize:13}}>{dateBR(e.event_date)} · {e.title}</div>)}</div><div style={row}><strong>Contatos e lembretes</strong>{relationship.actions.length===0?<p style={{fontSize:13}}>Nenhum contato registrado.</p>:relationship.actions.filter(a=>!a.archived).slice().sort((a,b)=>(b.due_date||'').localeCompare(a.due_date||'')).slice(0,10).map(a=><div key={a.id} style={{padding:'8px 0',borderBottom:'1px solid #dce8f7',fontSize:13}}>{dateBR(a.due_date)} · {a.status==='completed'?'Concluído':a.status==='dismissed'?'Dispensado':'Programado'}{a.note?' · '+a.note:''}</div>)}</div></>}</section>}
 {activeTab==='financeiro'&&<section style={{...panel,borderLeftColor:'#347fe0'}}><h2 style={heading}>Financeiro da instituição</h2>{financeError?<p role="alert">{financeError}</p>:!finance?<p>Carregando valores da instituição…</p>:(()=>{const titles=finance.titles.filter(t=>t.client_id===id);const total=titles.reduce((n,t)=>n+Number(t.total||0),0);const paid=titles.reduce((n,t)=>n+Number(t.paid||0),0);return <><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:16}}>{[['A receber',total],['Recebido',paid],['Pendente',Math.max(0,total-paid)]].map(([label,value])=><div key={String(label)} style={{background:'#edf5ff',border:'1px solid #c5daf5',borderRadius:10,padding:13}}><strong style={{display:'block',fontSize:12,color:'#28558f'}}>{label}</strong><strong style={{display:'block',fontSize:20,marginTop:6,color:'#143e82'}}>{money(value)}</strong></div>)}</div>{financeNotice&&<p role="status" style={{background:'#e8f1ff',padding:10,borderRadius:8}}>{financeNotice}</p>}{financeWrites&&<div style={{background:'#f0f6ff',border:'1px solid #c8daf4',padding:14,borderRadius:10,marginBottom:16}}><h3 style={{fontSize:15,margin:'0 0 12px'}}>Novo valor a receber</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}><label style={{fontSize:12,fontWeight:700}}>Descrição<input aria-label="Descrição do título" value={financeDescription} onChange={e=>{setFinanceDescription(e.target.value);setFinanceDraftId(null);}} maxLength={300} style={{width:'100%',padding:9,marginTop:5,border:'1px solid #c4d6f0',borderRadius:7}}/></label><label style={{fontSize:12,fontWeight:700}}>Valor (R$)<input aria-label="Valor a receber" value={financeAmount} onChange={e=>{setFinanceAmount(e.target.value);setFinanceDraftId(null);}} inputMode="decimal" placeholder="0,00" style={{width:'100%',padding:9,marginTop:5,border:'1px solid #c4d6f0',borderRadius:7}}/></label><label style={{fontSize:12,fontWeight:700}}>Vencimento<input aria-label="Vencimento" type="date" value={financeDue} onChange={e=>{setFinanceDue(e.target.value);setFinanceDraftId(null);}} style={{width:'100%',padding:9,marginTop:5,border:'1px solid #c4d6f0',borderRadius:7}}/></label></div><button type="button" disabled={financeBusy} onClick={createFinanceTitle} style={{marginTop:12,background:'#195ac2',color:'white',border:0,borderRadius:8,padding:'10px 16px',fontWeight:700}}>Registrar valor a receber</button></div>}<h3 style={{fontSize:15,color:'#17457f'}}>Contas a receber</h3>{titles.length===0?<p style={{fontSize:13}}>Nenhum título financeiro cadastrado para esta instituição. Propostas e contratos não são contabilizados como recebimentos.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,textAlign:'left'}}><thead><tr>{['Descrição','Vencimento','Total','Recebido','Pendente',...(financeWrites?['Pagamento']:[])].map(h=><th key={h} style={{padding:'9px 7px',borderBottom:'1px solid #bdd3f3'}}>{h}</th>)}</tr></thead><tbody>{titles.map(t=>{const pending=Math.max(0,Number(t.total)-Number(t.paid));return <tr key={t.id}><td style={{padding:'9px 7px',borderBottom:'1px solid #e0eafa'}}>{t.description}</td><td style={{padding:'9px 7px'}}>{dateBR(t.due_on)}</td><td style={{padding:'9px 7px'}}>{money(t.total)}</td><td style={{padding:'9px 7px'}}>{money(t.paid)}</td><td style={{padding:'9px 7px',fontWeight:700}}>{money(pending)}</td>{financeWrites&&<td style={{padding:'9px 7px'}}>{pending>0?<div style={{display:'flex',gap:6}}><input aria-label={'Pagamento de '+t.description} value={financePay[t.id]||''} onChange={e=>{setFinancePay(v=>({...v,[t.id]:e.target.value}));setFinancePaymentIds(v=>{const n={...v};delete n[t.id];return n;});}} inputMode="decimal" placeholder="R$" style={{width:85,padding:7,border:'1px solid #bdd3f3',borderRadius:6}}/><button type="button" disabled={financeBusy} onClick={()=>payFinanceTitle(t)} style={{background:'#195ac2',color:'white',border:0,borderRadius:7,padding:8}}>Receber</button></div>:'Quitado'}</td>}</tr>})}</tbody></table></div>}<h3 style={{fontSize:15,color:'#17457f',marginTop:22}}>Extrato de recebimentos da instituição</h3>{finance.payments.filter(p=>p.client_id===id).length===0?<p style={{fontSize:13}}>Nenhum pagamento confirmado registrado.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,textAlign:'left'}}><thead><tr>{['Data','Descrição','Recebido'].map(h=><th key={h} style={{padding:'9px 7px',borderBottom:'1px solid #bdd3f3'}}>{h}</th>)}</tr></thead><tbody>{finance.payments.filter(p=>p.client_id===id).map(p=><tr key={p.id}><td style={{padding:'9px 7px',borderBottom:'1px solid #e0eafa'}}>{dateBR(p.occurred_on)}</td><td style={{padding:'9px 7px',borderBottom:'1px solid #e0eafa'}}>{p.description}</td><td style={{padding:'9px 7px',borderBottom:'1px solid #e0eafa',fontWeight:700,color:'#16724a'}}>+ {money(p.amount)}</td></tr>)}</tbody></table></div>}{!financeWrites&&<p style={{fontSize:12,color:'#7a4d1c'}}>Registros de pagamento indisponíveis até a liberação segura do módulo financeiro.</p>}<p style={{fontSize:12,color:'#48678e',marginTop:12}}>Somente pagamentos confirmados entram no caixa geral. Lançamentos vinculados a esta escola; sem duplicar receitas.</p></>})()}</section>}
 {activeTab==='historico'&&<section style={panel}><h2 style={heading}>Histórico da instituição</h2><p style={{fontSize:13,color:'#48678e'}}>Tudo em um só lugar, em ordem cronológica. Os registros são atualizados automaticamente.</p>{(()=>{const entries:{key:string;date:string;label:string;detail:string;link?:string}[]=[
 ...events.map(e=>({key:'evento-'+e.id,date:e.event_date||'',label:'Evento',detail:e.title+' · '+(eventStatuses[e.status]||e.status),link:'/eventos/'+encodeURIComponent(e.id)})),
 ...proposals.map(p=>({key:'proposta-'+String(p.id),date:String(p.created_at||''),label:'Proposta',detail:String(p.title||'Proposta')+' · '+money(p.total)+' · '+(statusNames[String(p.status)]||String(p.status||'Sem situação'))})),
 ...contracts.map(c=>({key:'contrato-'+String(c.id),date:String(c.confirmed_at||c.created_at||''),label:'Contrato',detail:String(c.status)==='confirmed'?'Contrato confirmado':'Contrato · '+String(c.status||'Pendente')})),
 ...(finance?.titles||[]).filter(t=>t.client_id===id).map(t=>({key:'cobranca-'+t.id,date:t.due_on||'',label:'Cobrança · vencimento',detail:t.description+' · '+money(t.total)+' · pendente '+money(Math.max(0,Number(t.total)-Number(t.paid)))})),
 ...(finance?.payments||[]).filter(p=>p.client_id===id).map(p=>({key:'pagamento-'+p.id,date:p.occurred_on||'',label:'Recebimento',detail:p.description+' · '+money(p.amount)})),
 ...relationship.actions.map(a=>({key:'contato-'+a.id,date:a.due_date||'',label:'Relacionamento',detail:(a.note||a.action_kind||'Contato')+' · '+(a.status==='completed'?'Concluído':'Programado')}))
 ];entries.sort((a,b)=>b.date.localeCompare(a.date));return entries.length===0?<p style={{fontSize:13}}>Nenhum registro encontrado para esta instituição.</p>:<div style={{display:'grid',gap:9,marginTop:15}}>{entries.map(e=><div key={e.key} style={{border:'1px solid #d2e2f8',borderLeft:'3px solid #2771d5',borderRadius:9,padding:'11px 13px',background:'#f6f9ff'}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{color:'#17457f',fontSize:13}}>{e.label}</strong><span style={{fontSize:12,color:'#58739b'}}>{dateBR(e.date||null)}</span></div><div style={{fontSize:13,marginTop:5,overflowWrap:'anywhere'}}>{e.detail}{e.link&&<> · <Link href={e.link} style={{color:'#1556ae',fontWeight:700}}>Ver evento</Link></>}</div></div>)}</div>})()}</section>}

 {activeTab==='observacoes'&&<section style={panel}><h2 style={heading}>Observações da instituição</h2><p style={{fontSize:13,color:'#48678e'}}>Anotações gerais sobre o atendimento desta instituição.</p><textarea aria-label="Observações da instituição" maxLength={4000} rows={6} value={notesValue} onChange={e=>{setNotesDraft(e.target.value);setNotesFeedback('');}} style={{...formInput,resize:'vertical',lineHeight:1.6}}/><div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:12}}><button type="button" disabled={!notesDirty||notesSaving} onClick={()=>void saveNotes()} style={{...actionLink,border:0,cursor:notesDirty?'pointer':'not-allowed',opacity:!notesDirty||notesSaving?0.55:1}}>{notesSaving?'Salvando...':'Salvar observações'}</button>{notesDirty&&<span style={{fontSize:12,color:'#a05a12'}}>Alterações ainda não salvas</span>}</div>{notesFeedback&&<p role="status" style={{fontSize:13,color:notesFeedback.includes('sucesso')?'#16724a':'#a33b25'}}>{notesFeedback}</p>}</section>}
 </>}
 </main>;
}
