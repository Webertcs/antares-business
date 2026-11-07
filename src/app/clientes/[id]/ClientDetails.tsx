'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
type Client={id:string;kind:string;name:string;email:string|null;phone:string|null;city:string|null;status:string;notes:string|null};
type Contact={id:string;client_id:string;full_name:string;position:string|null;phone:string|null;email:string|null;is_primary:boolean};
type Event={id:string;client_id:string;title:string;event_date:string|null;status:string;expected_attendees:number|null};
type Group={id:string;client_id:string;label:string;grade_level:string;student_count:number;teacher_name:string;teacher_contact:string};
const kinds:Record<string,string>={school:'Escola',company:'Empresa',association:'Associação',private:'Particular',other:'Cliente'};
const statuses:Record<string,string>={prospect:'Prospecto',active:'Ativo',inactive:'Arquivado'};
const eventStatuses:Record<string,string>={lead:'Oportunidade',quoted:'Orçado',reserved:'Reservado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado'};
const dateBR=(value:string|null)=>value?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value)):'Sem data';
export default function ClientDetails({id,writesEnabled}:{id:string;writesEnabled:boolean}){
 const [activeTab,setActiveTab]=useState<'apresentacoes'|'propostas'|'contratos'|'alunos'|'eventos'|'contatos'|'historico'|'observacoes'>('apresentacoes');
 const [commercial,setCommercial]=useState<{proposals:Record<string,unknown>[];contracts:Record<string,unknown>[];unavailable:string[]}|null>(null);
 const [commercialError,setCommercialError]=useState('');
 const [client,setClient]=useState<Client|null>(null),[contacts,setContacts]=useState<Contact[]>([]),[events,setEvents]=useState<Event[]>([]),[groups,setGroups]=useState<Group[]>([]);
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
 const proposals=commercial?.proposals.filter(p=>String(p.client_id)===id)||[];
 const proposalIds=new Set(proposals.map(p=>String(p.id)));
 const contracts=commercial?.contracts.filter(c=>proposalIds.has(String(c.proposal_id)))||[];
 const money=(value:unknown)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
 const panel:React.CSSProperties={background:'linear-gradient(125deg,#f3f8ff 0%,#ffffff 60%,#edf5ff 100%)',border:'1px solid #c6d9f4',borderLeft:'4px solid #4d8de2',borderRadius:14,padding:13,marginBottom:12,boxShadow:'0 9px 23px rgba(18,62,132,.12),0 2px 5px rgba(18,62,132,.06)'};
 const heading:React.CSSProperties={fontSize:17,fontWeight:700,lineHeight:1.35,color:'#174987',margin:'0 0 12px'};
 const row:React.CSSProperties={padding:'11px 13px',background:'linear-gradient(100deg,#e1efff,#f4f9ff)',border:'1px solid #c5dcfa',borderLeft:'4px solid #4b8ce5',borderRadius:9,marginBottom:8,overflowWrap:'anywhere',fontSize:13,lineHeight:1.5};
 return <main style={{maxWidth:1180,margin:'0 auto',padding:'16px 20px 36px',fontFamily:'system-ui',color:'#16325b'}}>
 {loading?<p>Carregando ficha...</p>:error?<p role="alert">{error}</p>:client&&<>
 <header style={{background:'linear-gradient(110deg,#102c63,#1162ba)',color:'#fff',borderRadius:14,padding:'14px 20px',marginBottom:12,boxShadow:'0 8px 22px rgba(14,62,130,.18)'}}>
 <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#b8dcff'}}>ANTARES · CLIENTES</div>
 <h1 style={{fontSize:23,lineHeight:1.25,margin:'7px 0 0'}}>{client.name}</h1>
 
 </header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:14}}>
 {([['Contatos',contacts.length],['Apresentações',events.length],...([['Propostas',proposals.length],['Contratos',contracts.length]] as [string,number][])] as [string,number][]).map(([label,value])=>
 <div key={label} style={{background:'linear-gradient(135deg,#e0eeff 0%,#f4f8ff 65%,#ffffff 100%)',border:'1px solid #bdd3f3',borderTop:`4px solid ${label==='Contatos'?'#397fda':label==='Apresentações'?'#d69b3a':label==='Turmas'?'#169caa':'#6c73d9'}`,borderRadius:12,padding:'12px 15px',boxShadow:'0 8px 18px rgba(25,76,150,.13),0 2px 4px rgba(25,76,150,.06)'}}><div style={{fontSize:12,fontWeight:600,color:'#42628b'}}>{label}</div><strong style={{fontSize:23,color:'#143e82'}}>{value}</strong></div>)}
 </div>
 <section style={{...panel,borderLeftColor:'#397fda'}}><h2 style={heading}>Dados da instituição</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:8,fontSize:12}}>
 {([['Tipo',kinds[client.kind]||client.kind],['Situação',statuses[client.status]||client.status],['Cidade',client.city||'—'],['E-mail',client.email||'—'],['Telefone',client.phone||'—']] as [string,string][]).map(([label,value])=><div key={label}><strong style={{color:'#315e94'}}>{label}</strong><div style={{marginTop:4,overflowWrap:'anywhere'}}>{value}</div></div>)}
 </div>{client.notes&&<p style={{fontSize:13,marginBottom:0}}><strong>Observações:</strong> {client.notes}</p>}</section>
 <nav aria-label="Seções do cliente" style={{display:'flex',flexWrap:'wrap',gap:8,margin:'14px 0'}}>{([['apresentacoes','Apresentações'],['propostas','Propostas'],['contratos','Contratos'],['alunos','Alunos'],['eventos','Eventos'],['contatos','Contatos'],['historico','Histórico'],['observacoes','Observações']] as const).map(([key,label])=><button key={key} type="button" aria-current={activeTab===key?'page':undefined} onClick={()=>setActiveTab(key)} style={{cursor:'pointer',border:'1px solid #a9c7ee',borderRadius:10,padding:'10px 15px',fontWeight:700,background:activeTab===key?'linear-gradient(110deg,#0862cf,#16458e)':'#eaf3ff',color:activeTab===key?'#fff':'#174987'}}>{label}</button>)}</nav>
 {activeTab==='apresentacoes'&&<section style={{...panel,borderLeftColor:'#d69b3a'}}><h2 style={heading}>Apresentações ({events.length})</h2>{events.length===0?<p>Nenhuma apresentação registrada.</p>:events.map(e=><div key={e.id} style={row}><strong>{e.title}</strong> · {dateBR(e.event_date)} · {eventStatuses[e.status]||e.status}<div><Link href={`/eventos/${e.id}`} style={{fontWeight:700,color:'#1556ae'}}>Abrir operação do evento</Link></div></div>)}</section>}
 {activeTab==='propostas'&&<section style={{...panel,borderLeftColor:'#169caa'}}><h2 style={heading}>Propostas e orçamentos ({proposals.length})</h2>
 {commercialError?<p role="alert">{commercialError}</p>:!commercial?<p>Carregando informações comerciais…</p>:commercial.unavailable.includes('proposals')?<p>Propostas temporariamente indisponíveis.</p>:proposals.length===0?<p>Nenhuma proposta vinculada a esta instituição.</p>:proposals.map(p=><div key={String(p.id)} style={row}><strong>{String(p.title||'Proposta')}</strong> · {money(p.total)} · {String(p.status||'Sem situação')}<div style={{fontSize:12}}>Criada em {dateBR(p.created_at?String(p.created_at):null)}</div></div>)}
 <Link href="/operacoes?area=comercial" style={{fontSize:13,color:'#1556ae',fontWeight:700}}>Consultar todas as propostas</Link></section>}
 {activeTab==='contratos'&&<section style={{...panel,borderLeftColor:'#3c7ad4'}}><h2 style={heading}>Contratos ({contracts.length})</h2>
 {commercialError?<p role="alert">{commercialError}</p>:!commercial?<p>Carregando contratos…</p>:commercial.unavailable.includes('contracts')||commercial.unavailable.includes('proposals')?<p>Contratos temporariamente indisponíveis.</p>:contracts.length===0?<p>Nenhum contrato vinculado a esta instituição.</p>:contracts.map(c=><div key={String(c.id)} style={row}><strong>{String(c.proposal_title||'Contrato')}</strong> · {String(c.status||'Sem situação')}<div style={{fontSize:12}}>Confirmado em {dateBR(c.confirmed_at?String(c.confirmed_at):null)}</div></div>)}
 <Link href="/operacoes?area=contratos" style={{fontSize:13,color:'#1556ae',fontWeight:700}}>Consultar todos os contratos</Link></section>}
 {activeTab==='alunos'&&<section style={{...panel,borderLeftColor:'#169caa'}}><h2 style={heading}>Participação de alunos</h2><p style={{fontSize:13}}>O público previsto é informado antes da apresentação. O total real de alunos será registrado uma única vez, no encerramento do evento, após a implantação segura do controle. Esse registro também servirá de referência para o ciclo de fidelização, sem duplicar lembretes.</p></section>}
 {activeTab==='contatos'&&<section style={{...panel,borderLeftColor:'#6c73d9',background:'linear-gradient(125deg,#f3f3ff 0%,#ffffff 60%,#eef5ff 100%)'}}><h2 style={heading}>Contatos ({contacts.length})</h2>
 {contacts.length===0?<p>Sem contatos cadastrados.</p>:contacts.map(c=><div key={c.id} style={row}><strong>{c.full_name}</strong>{c.position?' · '+c.position:''}{c.is_primary?' · Principal':''}<div style={{fontSize:12,marginTop:3}}>{c.phone||c.email||'Sem contato informado'}</div></div>)}
 </section>}
 {activeTab==='eventos'&&<section style={{...panel,borderLeftColor:'#d69b3a',background:'linear-gradient(125deg,#fff8ec 0%,#ffffff 60%,#edf5ff 100%)'}}><h2 style={heading}>Histórico de apresentações e oportunidades ({events.length})</h2>
 {events.length===0?<p>Sem eventos registrados.</p>:events.map(e=><div key={e.id} style={row}><strong>{e.title}</strong> · {dateBR(e.event_date)} · {eventStatuses[e.status]||e.status}{e.expected_attendees!=null?' · '+e.expected_attendees+' participantes':''}</div>)}
 </section>}
 {activeTab==='historico'&&<section style={panel}><h2 style={heading}>Histórico do cliente</h2><p>Consulte as apresentações na aba Eventos e os registros comerciais nas abas Propostas e Contratos. O histórico de contatos será integrado sem duplicar dados.</p></section>}
 {activeTab==='observacoes'&&<section style={panel}><h2 style={heading}>Observações da instituição</h2><p>{client.notes||'Nenhuma observação cadastrada.'}</p></section>}
 </>}
 </main>;
}
