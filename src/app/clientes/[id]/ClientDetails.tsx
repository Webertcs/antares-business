'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Client={id:string;kind:string;name:string;email:string|null;phone:string|null;city:string|null;status:string;notes:string|null};
type Contact={id:string;client_id:string;full_name:string;position:string|null;phone:string|null;email:string|null;is_primary:boolean};
type Event={id:string;client_id:string;title:string;event_date:string|null;status:string;expected_attendees:number|null};
type Group={id:string;client_id:string;label:string;grade_level:string;student_count:number;teacher_name:string;teacher_contact:string};
const kinds:Record<string,string>={school:'Escola',company:'Empresa',association:'Associação',private:'Particular',other:'Cliente'};
const statuses:Record<string,string>={prospect:'Prospecto',active:'Ativo',inactive:'Arquivado'};
const eventStatuses:Record<string,string>={lead:'Oportunidade',quoted:'Orçado',reserved:'Reservado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado'};
const dateBR=(value:string|null)=>value?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value)):'Sem data';
export default function ClientDetails({id}:{id:string}){
 const [client,setClient]=useState<Client|null>(null),[contacts,setContacts]=useState<Contact[]>([]),[events,setEvents]=useState<Event[]>([]),[groups,setGroups]=useState<Group[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[educationError,setEducationError]=useState('');
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
 const panel:React.CSSProperties={background:'#f8fbff',border:'1px solid #cbdcf5',borderRadius:12,padding:18,marginBottom:14};
 const heading:React.CSSProperties={fontSize:18,color:'#174987',margin:'0 0 12px'};
 const row:React.CSSProperties={padding:'10px 12px',background:'#eaf3ff',border:'1px solid #d5e5fa',borderRadius:8,marginBottom:7,overflowWrap:'anywhere'};
 return <main style={{maxWidth:1180,margin:'0 auto',padding:'16px 20px 36px',fontFamily:'system-ui',color:'#16325b'}}>
 {loading?<p>Carregando ficha...</p>:error?<p role="alert">{error}</p>:client&&<>
 <header style={{background:'linear-gradient(110deg,#102c63,#1162ba)',color:'#fff',borderRadius:14,padding:'23px 25px',marginBottom:13}}>
 <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#b8dcff'}}>ANTARES · CLIENTES</div>
 <h1 style={{fontSize:27,margin:'7px 0 5px'}}>{client.name}</h1>
 <p style={{margin:0,color:'#e0eeff',fontSize:13}}>{kinds[client.kind]||'Cliente'} · Ficha cadastral</p>
 </header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:14}}>
 {([['Contatos',contacts.length],['Apresentações',events.length],...(client.kind==='school'?[['Turmas',groups.length],['Alunos previstos',groups.reduce((a,g)=>a+Number(g.student_count||0),0)]]:[])] as [string,number][]).map(([label,value])=>
 <div key={label} style={{background:'#eaf3ff',border:'1px solid #c7dcfb',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:12,color:'#42628b'}}>{label}</div><strong style={{fontSize:24,color:'#143e82'}}>{value}</strong></div>)}
 </div>
 <section style={panel}><h2 style={heading}>Dados da instituição</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,fontSize:13}}>
 {([['Tipo',kinds[client.kind]||client.kind],['Situação',statuses[client.status]||client.status],['Cidade',client.city||'—'],['E-mail',client.email||'—'],['Telefone',client.phone||'—']] as [string,string][]).map(([label,value])=><div key={label}><strong style={{color:'#315e94'}}>{label}</strong><div style={{marginTop:4,overflowWrap:'anywhere'}}>{value}</div></div>)}
 </div>{client.notes&&<p style={{fontSize:13,marginBottom:0}}><strong>Observações:</strong> {client.notes}</p>}</section>
 {client.kind==='school'&&<section style={panel}><h2 style={heading}>Turmas e Professores</h2>
 {educationError?<p role="alert">{educationError}</p>:groups.length===0?<p style={{fontSize:13}}>Nenhuma turma vinculada a esta escola.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,textAlign:'left'}}>
 <thead><tr>{['Turma','Série / ano','Alunos','Professor responsável','Contato institucional'].map(t=><th key={t} style={{padding:10,background:'#dceaff',color:'#174987'}}>{t}</th>)}</tr></thead>
 <tbody>{groups.map(g=><tr key={g.id}>{[g.label,g.grade_level,g.student_count,g.teacher_name,g.teacher_contact].map((v,i)=><td key={i} style={{padding:10,borderBottom:'1px solid #d5e5fa'}}>{v??'—'}</td>)}</tr>)}</tbody></table></div>}
 <p style={{fontSize:12,color:'#60799c',marginBottom:0}}>Cadastro de turmas permanece bloqueado até a validação de segurança.</p>
 </section>}
 <section style={panel}><h2 style={heading}>Contatos ({contacts.length})</h2>
 {contacts.length===0?<p>Sem contatos cadastrados.</p>:contacts.map(c=><div key={c.id} style={row}><strong>{c.full_name}</strong>{c.position?' · '+c.position:''}{c.is_primary?' · Principal':''}<div style={{fontSize:12,marginTop:3}}>{c.phone||c.email||'Sem contato informado'}</div></div>)}
 </section>
 <section style={panel}><h2 style={heading}>Histórico de apresentações e oportunidades ({events.length})</h2>
 {events.length===0?<p>Sem eventos registrados.</p>:events.map(e=><div key={e.id} style={row}><strong>{e.title}</strong> · {dateBR(e.event_date)} · {eventStatuses[e.status]||e.status}{e.expected_attendees!=null?' · '+e.expected_attendees+' participantes':''}</div>)}
 </section>
 <p style={{fontSize:12,color:'#60799c'}}>As informações desta ficha são consultadas nos cadastros existentes do CRM.</p>
 </>}
 </main>;
}
