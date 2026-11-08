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
 const [activeTab,setActiveTab]=useState<'propostas'|'contratos'|'alunos'|'eventos'|'financeiro'|'fidelizacao'|'historico'|'observacoes'>('eventos');
 const [commercial,setCommercial]=useState<{proposals:Record<string,unknown>[];contracts:Record<string,unknown>[];unavailable:string[]}|null>(null);
 const [commercialError,setCommercialError]=useState('');
 const [finance,setFinance]=useState<{entries:Record<string,unknown>[];income:number;expenses:number}|null>(null);
 const [financeError,setFinanceError]=useState('');
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
 useEffect(()=>{const ctrl=new AbortController();fetch('/api/financeiro',{cache:'no-store',signal:ctrl.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Consulta financeira indisponível');if(!ctrl.signal.aborted)setFinance({entries:Array.isArray(data.entries)?data.entries:[],income:Number(data.income)||0,expenses:Number(data.expenses)||0});}).catch(e=>{if(!ctrl.signal.aborted&&e?.name!=='AbortError')setFinanceError('Não foi possível consultar o financeiro.');});return()=>ctrl.abort();},[]);
 const proposals=commercial?.proposals.filter(p=>String(p.client_id)===id)||[];
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
 <button type="button" onClick={()=>setActiveTab('financeiro')} aria-label="Abrir financeiro desta instituição" style={{textAlign:'left',cursor:'pointer',background:'#edf5ff',border:'1px solid #bdd3f3',borderTop:'4px solid #347fe0',borderRadius:12,padding:'12px 15px'}}><div style={{fontSize:12,fontWeight:600,color:'#42628b'}}>Financeiro da instituição</div><strong style={{display:'block',marginTop:5,fontSize:16,color:'#143e82'}}>Aguardando dados</strong><div style={{fontSize:11,color:'#42628b',marginTop:4}}>Valores individuais ainda não validados</div></button>
 </div>
 <section style={{...panel,borderLeftColor:'#397fda'}}><h2 style={heading}>Dados da instituição</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:8,fontSize:12}}>
 {([['Tipo',kinds[client.kind]||client.kind],['Situação',statuses[client.status]||client.status],['Cidade',client.city||'—'],['E-mail',client.email||'—'],['Telefone',client.phone||'—']] as [string,string][]).map(([label,value])=><div key={label}><strong style={{color:'#315e94'}}>{label}</strong><div style={{marginTop:4,overflowWrap:'anywhere'}}>{value}</div></div>)}
 </div><div style={{marginTop:12}}><Link href={`/clientes?editId=${encodeURIComponent(id)}`} style={actionLink}>Editar dados da instituição</Link></div></section>
 <nav aria-label="Seções do cliente" style={{display:'flex',flexWrap:'wrap',gap:8,margin:'14px 0'}}>{([['eventos','Eventos'],['propostas','Propostas'],['contratos','Contratos'],['alunos','Alunos'],['fidelizacao','Fidelização'],['financeiro','Financeiro'],['historico','Histórico'],['observacoes','Observações']] as const).map(([key,label])=><button key={key} type="button" aria-current={activeTab===key?'page':undefined} onClick={()=>setActiveTab(key)} style={{cursor:'pointer',border:'1px solid #a9c7ee',borderRadius:10,padding:'10px 15px',fontWeight:700,background:activeTab===key?'linear-gradient(110deg,#0862cf,#16458e)':'#eaf3ff',color:activeTab===key?'#fff':'#174987'}}>{label}</button>)}</nav>
 {activeTab==='propostas'&&<section style={{...panel,borderLeftColor:'#169caa'}}><h2 style={heading}>Propostas e orçamentos ({proposals.length})</h2>
 {commercialError?<p role="alert">{commercialError}</p>:!commercial?<p>Carregando informações comerciais…</p>:commercial.unavailable.includes('proposals')?<p>Propostas temporariamente indisponíveis.</p>:proposals.length===0?<p>Nenhuma proposta vinculada a esta instituição.</p>:proposals.map(p=><div key={String(p.id)} style={row}><strong>{String(p.title||'Proposta')}</strong> · {money(p.total)} · {String(p.status||'Sem situação')}<div style={{fontSize:12}}>Criada em {dateBR(p.created_at?String(p.created_at):null)}</div></div>)}
 <Link href="/operacoes?area=comercial" style={{fontSize:13,color:'#1556ae',fontWeight:700}}>Consultar todas as propostas</Link></section>}
 {activeTab==='contratos'&&<section style={{...panel,borderLeftColor:'#3c7ad4'}}><h2 style={heading}>Contratos ({contracts.length})</h2>
 {commercialError?<p role="alert">{commercialError}</p>:!commercial?<p>Carregando contratos…</p>:commercial.unavailable.includes('contracts')||commercial.unavailable.includes('proposals')?<p>Contratos temporariamente indisponíveis.</p>:contracts.length===0?<p>Nenhum contrato vinculado a esta instituição.</p>:contracts.map(c=><div key={String(c.id)} style={row}><strong>{String(c.proposal_title||'Contrato')}</strong> · {String(c.status||'Sem situação')}<div style={{fontSize:12}}>Confirmado em {dateBR(c.confirmed_at?String(c.confirmed_at):null)}</div></div>)}
 <Link href="/operacoes?area=contratos" style={{fontSize:13,color:'#1556ae',fontWeight:700}}>Consultar todos os contratos</Link></section>}
 {activeTab==='alunos'&&<section style={{...panel,borderLeftColor:'#169caa'}}><h2 style={heading}>Participação de alunos</h2><p style={{fontSize:13}}>O público previsto é informado antes da apresentação. O total real de alunos é registrado uma única vez no encerramento de cada evento.</p>{educationError?<p role="alert">{educationError}</p>:<p style={{fontSize:13}}>Turmas cadastradas: <strong>{groups.length}</strong></p>}{events.map(e=><div key={e.id} style={row}>{e.title} · Previsão: {e.expected_attendees??'não informada'} · <Link href={`/eventos/${e.id}`} style={{color:'#1556ae',fontWeight:700}}>Consultar atendimento</Link></div>)}<Link href="/educacional" style={actionLink}>Abrir Educacional</Link></section>}
 {activeTab==='eventos'&&<section style={panel}><h2 style={heading}>Eventos ({events.length})</h2><div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap'}}><Link href={`/clientes?newEventFor=${encodeURIComponent(id)}`} style={actionLink}>+ Novo evento para este cliente</Link><Link href="/eventos" style={{...actionLink,background:'#eaf3ff',color:'#174987',border:'1px solid #a9c7ee'}}>Consultar agenda</Link></div>{events.length===0?<p>Nenhum evento registrado para esta instituição.</p>:events.map(e=><div key={e.id} style={row}><strong>{e.title}</strong> · {dateBR(e.event_date)} · {eventStatuses[e.status]||e.status}<div><Link href={`/eventos/${e.id}`} style={{fontWeight:700,color:'#1556ae'}}>Abrir evento e operação</Link></div></div>)}</section>}
 {activeTab==='fidelizacao'&&<section style={panel}><h2 style={heading}>Fidelização</h2><p>Os níveis e os alertas são calculados a partir das visitas encerradas; consulte a Central de Fidelização para acompanhar este cliente.</p><Link href="/fidelizacao" style={actionLink}>Abrir Central de Fidelização</Link></section>}
 {activeTab==='financeiro'&&<section style={panel}><h2 style={heading}>Financeiro da instituição</h2>{financeError?<p role="alert">{financeError}</p>:!finance?<p>Carregando consulta financeira…</p>:<><p style={{fontSize:13}}>O extrato geral está disponível, mas os lançamentos ainda não possuem vínculo comprovado com esta instituição nesta consulta. Para evitar atribuir valores de outros clientes, não exibimos totais individuais até validar esse relacionamento.</p><p style={{fontSize:13}}>Lançamentos no extrato geral: {finance.entries.length}</p></>}<Link href="/financeiro" style={actionLink}>Abrir Financeiro geral</Link></section>}
 {activeTab==='historico'&&<section style={panel}><h2 style={heading}>Histórico do cliente</h2><p style={{fontSize:13}}>Registros vinculados a esta instituição:</p><p style={{fontSize:13}}><strong>{events.length}</strong> eventos · <strong>{proposals.length}</strong> propostas · <strong>{contracts.length}</strong> contratos · <strong>{contacts.length}</strong> contatos cadastrados</p>{events.length===0?<p>Nenhum evento registrado.</p>:events.map(e=><div key={e.id} style={row}><strong>{e.title}</strong> · {dateBR(e.event_date)} · {eventStatuses[e.status]||e.status} <Link href={`/eventos/${e.id}`} style={{color:'#1556ae',fontWeight:700}}>Ver evento</Link></div>)}<Link href={`/clientes?clientId=${encodeURIComponent(id)}`} style={actionLink}>Consultar ficha e contatos</Link></section>}
 {activeTab==='observacoes'&&<section style={panel}><h2 style={heading}>Observações da instituição</h2><p style={{whiteSpace:'pre-wrap'}}>{client.notes||'Nenhuma observação cadastrada.'}</p><Link href={`/clientes?editId=${encodeURIComponent(id)}`} style={actionLink}>Editar observações</Link></section>}
 </>}
 </main>;
}
