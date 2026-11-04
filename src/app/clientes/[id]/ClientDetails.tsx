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
 const panel:React.CSSProperties={background:'linear-gradient(145deg,#ffffff 0%,#f4f8ff 100%)',border:'1px solid #d3e1f6',borderRadius:14,padding:18,marginBottom:14,boxShadow:'0 5px 16px rgba(22,64,122,.065)'};
 const heading:React.CSSProperties={fontSize:17,fontWeight:700,lineHeight:1.35,color:'#174987',margin:'0 0 12px'};
 const row:React.CSSProperties={padding:'11px 13px',background:'linear-gradient(100deg,#edf5ff,#f6faff)',border:'1px solid #d5e5fa',borderLeft:'3px solid #73a9f3',borderRadius:9,marginBottom:8,overflowWrap:'anywhere',fontSize:13,lineHeight:1.5};
 return <main style={{maxWidth:1180,margin:'0 auto',padding:'16px 20px 36px',fontFamily:'system-ui',color:'#16325b'}}>
 {loading?<p>Carregando ficha...</p>:error?<p role="alert">{error}</p>:client&&<>
 <header style={{background:'linear-gradient(110deg,#102c63,#1162ba)',color:'#fff',borderRadius:14,padding:'19px 24px',marginBottom:14,boxShadow:'0 8px 22px rgba(14,62,130,.18)'}}>
 <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#b8dcff'}}>ANTARES · CLIENTES</div>
 <h1 style={{fontSize:25,lineHeight:1.25,margin:'7px 0 0'}}>{client.name}</h1>
 
 </header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:14}}>
 {([['Contatos',contacts.length],['Apresentações',events.length],...(client.kind==='school'?[['Turmas',groups.length],['Alunos previstos',groups.reduce((a,g)=>a+Number(g.student_count||0),0)]]:[])] as [string,number][]).map(([label,value])=>
 <div key={label} style={{background:'linear-gradient(135deg,#e7f1ff,#f4f8ff)',border:'1px solid #c7dcfb',borderTop:'3px solid #478ce3',borderRadius:11,padding:'11px 14px',boxShadow:'0 4px 12px rgba(21,69,132,.07)'}}><div style={{fontSize:12,fontWeight:600,color:'#42628b'}}>{label}</div><strong style={{fontSize:23,color:'#143e82'}}>{value}</strong></div>)}
 </div>
 <section style={panel}><h2 style={heading}>Dados da instituição</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,fontSize:13}}>
 {([['Tipo',kinds[client.kind]||client.kind],['Situação',statuses[client.status]||client.status],['Cidade',client.city||'—'],['E-mail',client.email||'—'],['Telefone',client.phone||'—']] as [string,string][]).map(([label,value])=><div key={label}><strong style={{color:'#315e94'}}>{label}</strong><div style={{marginTop:4,overflowWrap:'anywhere'}}>{value}</div></div>)}
 </div>{client.notes&&<p style={{fontSize:13,marginBottom:0}}><strong>Observações:</strong> {client.notes}</p>}</section>
 {client.kind==='school'&&<section style={panel}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:12}}><h2 style={{...heading,margin:0}}>Turmas e Professores</h2>{writesEnabled&&<button type="button" onClick={()=>{setGroupForm(emptyGroup);setNewGroup(true);}} style={{border:'1px solid #2b62b7',borderRadius:8,background:'linear-gradient(135deg,#367bdc,#174fa8)',color:'#fff',padding:'6px 11px',fontSize:12,fontWeight:700,lineHeight:1.4,boxShadow:'0 3px 8px rgba(28,80,160,.22)',cursor:'pointer'}}>+ Nova turma</button>}</div>
 {educationError?<p role="alert">{educationError}</p>:groups.length===0?<p style={{fontSize:13}}>Nenhuma turma vinculada a esta escola.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,textAlign:'left'}}>
 <thead><tr>{['Turma','Série / ano','Alunos','Professor responsável','Contato institucional'].map(t=><th key={t} style={{padding:10,background:'#dceaff',color:'#174987'}}>{t}</th>)}</tr></thead>
 <tbody>{groups.map(g=><tr key={g.id}>{[g.label,g.grade_level,g.student_count,g.teacher_name,g.teacher_contact].map((v,i)=><td key={i} style={{padding:10,borderBottom:'1px solid #d5e5fa'}}>{v??'—'}</td>)}</tr>)}</tbody></table></div>}
 {!writesEnabled&&<p style={{fontSize:12,color:'#60799c',marginBottom:0}}>Cadastro de turmas permanece bloqueado até a validação de segurança.</p>}
 </section>}
 <section style={panel}><h2 style={heading}>Contatos ({contacts.length})</h2>
 {contacts.length===0?<p>Sem contatos cadastrados.</p>:contacts.map(c=><div key={c.id} style={row}><strong>{c.full_name}</strong>{c.position?' · '+c.position:''}{c.is_primary?' · Principal':''}<div style={{fontSize:12,marginTop:3}}>{c.phone||c.email||'Sem contato informado'}</div></div>)}
 </section>
 <section style={panel}><h2 style={heading}>Histórico de apresentações e oportunidades ({events.length})</h2>
 {events.length===0?<p>Sem eventos registrados.</p>:events.map(e=><div key={e.id} style={row}><strong>{e.title}</strong> · {dateBR(e.event_date)} · {eventStatuses[e.status]||e.status}{e.expected_attendees!=null?' · '+e.expected_attendees+' participantes':''}</div>)}
 </section>
 {newGroup&&<dialog ref={groupDialog} aria-modal="true" aria-labelledby="new-group-title" onCancel={e=>{e.preventDefault();closeGroup();}} style={{width:'min(560px,calc(100vw - 32px))',maxHeight:'88vh',overflowY:'auto',border:'1px solid #b7cfee',borderRadius:14,padding:0,boxShadow:'0 20px 70px #001a4466',color:'#173966'}}>
 <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(110deg,#102c63,#1162ba)',color:'#fff',padding:'15px 20px'}}>
 <h2 id="new-group-title" style={{margin:0,fontSize:20}}>Nova turma</h2><button type="button" onClick={closeGroup} disabled={saving} aria-label="Fechar formulário" style={{background:'#ffffff25',border:'1px solid #ffffff60',borderRadius:8,color:'#fff',padding:'6px 12px'}}>×</button></div>
 <form onSubmit={saveGroup} style={{padding:20,display:'grid',gap:12}}>
 <div style={{background:'#eaf3ff',padding:12,borderRadius:8,fontSize:13}}><strong>Escola vinculada:</strong> {client.name}</div>
 {([['label','Turma'],['grade','Série / ano'],['teacher','Professor responsável'],['contact','Contato institucional'],['notes','Observações']] as const).map(([key,label])=><label key={key} style={{display:'grid',gap:5,fontSize:13,fontWeight:600}}>{label}<input value={groupForm[key]} required={key==='label'} maxLength={key==='notes'?1000:160} onChange={e=>setGroupForm(v=>({...v,[key]:e.target.value}))} style={{width:'100%',padding:10,border:'1px solid #b6cfee',borderRadius:7,color:'#173966',background:'#fff'}}/></label>)}
 <label style={{display:'grid',gap:5,fontSize:13,fontWeight:600}}>Quantidade de alunos<input type="number" min={0} max={1000} required value={groupForm.studentCount} onChange={e=>setGroupForm(v=>({...v,studentCount:Number(e.target.value)}))} style={{padding:10,border:'1px solid #b6cfee',borderRadius:7,color:'#173966'}}/></label>
 {groupError&&<p role="alert" style={{color:'#b91c1c'}}>{groupError}</p>}
 <div style={{display:'flex',justifyContent:'flex-end',gap:9}}><button type="button" disabled={saving} onClick={closeGroup}>Cancelar</button><button type="submit" disabled={saving||!writesEnabled} style={{background:'#2058c5',color:'#fff',border:0,borderRadius:8,padding:'10px 15px'}}>{saving?'Salvando...':'Cadastrar turma'}</button></div>
 </form></dialog>}
 
 </>}
 </main>;
}
