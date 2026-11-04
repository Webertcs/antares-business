'use client';
import {useEffect,useState} from 'react';
type School={id:string;name:string};
type Group={id:string;school:string;label:string;grade_level:string;student_count:number;teacher_name:string;teacher_contact:string;notes:string};
export default function EducacionalClient({writesEnabled}:{writesEnabled:boolean}){
 const [schools,setSchools]=useState<School[]>([]),[groups,setGroups]=useState<Group[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [form,setForm]=useState({schoolId:'',label:'',grade:'',studentCount:0,teacher:'',contact:'',notes:''});
 const [saving,setSaving]=useState(false);
 async function refresh(){const r=await fetch('/api/educacional',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Erro ao consultar');
 setSchools(d.schools||[]);setGroups(d.groups||[]);}
 useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 async function save(e:React.FormEvent){e.preventDefault();if(!writesEnabled||saving)return;setSaving(true);setError('');
 try{const r=await fetch('/api/educacional',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
 const d=await r.json();if(!r.ok)throw Error(d.error||'Cadastro indisponível');
 await refresh();setForm({schoolId:'',label:'',grade:'',studentCount:0,teacher:'',contact:'',notes:''});
 }catch(e){setError(e instanceof Error?e.message:'Falha de cadastro');}finally{setSaving(false);}}
 const change=(key:keyof typeof form,value:string|number)=>setForm(v=>({...v,[key]:value}));
 return <main style={{maxWidth:1150,margin:'0 auto',padding:'16px 20px 32px',fontFamily:'system-ui',color:'#16325b'}}>
 <header style={{background:'linear-gradient(110deg,#102c63,#1162ba)',borderRadius:14,padding:'23px 25px',color:'#fff',boxShadow:'0 3px 9px #143c7020'}}>
 <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#b8dcff'}}>ANTARES · GESTÃO PEDAGÓGICA</div>
 <h1 style={{fontSize:26,margin:'7px 0 6px',fontWeight:750}}>Alunos e Professores</h1>
 <p style={{margin:0,fontSize:13,color:'#e0eeff'}}>Organize as turmas, os professores responsáveis e o público previsto para cada visita.</p>
 </header>
 <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10,margin:'12px 0 14px'}}>
 {([['Escolas cadastradas',schools.length,'🏫'],['Turmas cadastradas',groups.length,'📚'],['Alunos previstos',groups.reduce((a,g)=>a+Number(g.student_count||0),0),'👥']] as const).map(([label,value,emoji])=>
 <div key={label} style={{background:'#eaf3ff',border:'1px solid #c7dcfb',borderRadius:11,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,minWidth:0}}>
 <span aria-hidden="true" style={{background:'#d5e7ff',borderRadius:9,padding:9,fontSize:18}}>{emoji}</span>
 <div style={{minWidth:0}}><div style={{fontSize:12,color:'#42628b'}}>{label}</div><strong style={{display:'block',fontSize:23,color:'#143e82'}}>{value}</strong></div>
 </div>)}
 </div>
 <section style={{background:'#f8fbff',border:'1px solid #cbdcf5',borderRadius:13,overflow:'hidden'}}>
 <div style={{background:'#e4efff',padding:'13px 16px',borderBottom:'1px solid #c8dbf7',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
 <div><h2 style={{fontSize:17,margin:0,color:'#174987'}}>Turmas cadastradas</h2><p style={{margin:'4px 0 0',fontSize:12,color:'#52719b'}}>Escolas, séries, professores e quantidade de alunos</p></div>
 <span style={{background:'#2058c5',color:'#fff',borderRadius:20,padding:'5px 10px',fontSize:12,whiteSpace:'nowrap'}}>{groups.length} na lista</span>
 </div>
 <div style={{padding:14}}>
 {!writesEnabled&&<p role="status" style={{padding:'10px 12px',margin:'0 0 12px',background:'#fff3dd',border:'1px solid #f2d99e',borderRadius:8,fontSize:12,color:'#76551e'}}>Cadastros temporariamente indisponíveis. As turmas existentes continuam disponíveis para consulta.</p>}
 {loading?<p>Carregando...</p>:error?<p role="alert">{error}</p>:null}
 {groups.length===0?<div style={{textAlign:'center',padding:'25px 12px',background:'#edf5ff',border:'1px dashed #b9d3f6',borderRadius:10}}>
 <div aria-hidden="true" style={{fontSize:28}}>📚</div><strong style={{display:'block',marginTop:6,color:'#164985'}}>Nenhuma turma cadastrada</strong>
 <p style={{margin:'5px 0 0',fontSize:13,color:'#52719b'}}>Quando houver turmas registradas, elas aparecerão aqui.</p>
 </div>:
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'separate',borderSpacing:'0 5px',textAlign:'left',fontSize:13}}>
 <thead><tr>{['Escola','Turma','Série','Alunos','Professor','Contato'].map(t=><th key={t} style={{padding:'9px 10px',background:'#dceaff',color:'#174987',fontSize:12}}>{t}</th>)}</tr></thead>
 <tbody>{groups.map(g=><tr key={g.id}>{[g.school,g.label,g.grade_level,g.student_count,g.teacher_name,g.teacher_contact].map((v,i)=><td key={i} style={{padding:'11px 10px',background:'#eaf3ff',borderTop:'1px solid #d5e5fa',borderBottom:'1px solid #d5e5fa',overflowWrap:'anywhere'}}>{v||'—'}</td>)}</tr>)}</tbody></table></div>}
 </div></section>
 {writesEnabled&&<section style={{padding:18,background:'#f8fbff',border:'1px solid #c8d6ed',borderRadius:12,marginTop:16}}>
 <h2 style={{fontSize:17,color:'#174987'}}>Nova turma</h2><form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:13}}>
 <label>Escola<select required value={form.schoolId} onChange={e=>change('schoolId',e.target.value)} style={{display:'block',width:'100%',padding:10}}><option value="">Selecione</option>{schools.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 {([['label','Turma'],['grade','Série / ano'],['teacher','Professor responsável'],['contact','Contato institucional'],['notes','Observações']] as const).map(([key,label])=><label key={key}>{label}<input required={key==='label'} maxLength={key==='notes'?1000:120} value={form[key]} onChange={e=>change(key,e.target.value)} style={{display:'block',width:'100%',padding:10}}/></label>)}
 <label>Quantidade de alunos<input type="number" min={0} max={1000} value={form.studentCount} onChange={e=>change('studentCount',Number(e.target.value))} style={{display:'block',width:'100%',padding:10}}/></label>
 <button disabled={saving} style={{padding:12,background:'#2453c6',color:'white',borderRadius:8}}>{saving?'Salvando...':'Cadastrar turma'}</button>
 </form></section>}
 </main>;
}
