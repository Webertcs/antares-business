'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
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
 return <main style={{maxWidth:1150,margin:'0 auto',padding:28,fontFamily:'system-ui',color:'#16325b'}}>
 <Link href="/">← Painel</Link><h1 style={{fontSize:30,marginTop:20}}>Alunos e Professores</h1>
 <p>Turmas por escola, quantidade de alunos e professor responsável. Não armazenamos nomes nem identificadores individuais de crianças.</p>
 {!writesEnabled&&<p role="status" style={{padding:15,background:'#fff2d9',borderRadius:9}}>Cadastros temporariamente indisponíveis. As turmas existentes continuam disponíveis para consulta.</p>}
 {loading?<p>Carregando...</p>:error?<p role="alert">{error}</p>:null}
 <div style={{display:'flex',gap:14,flexWrap:'wrap',margin:'20px 0'}}>
 <div style={{padding:18,border:'1px solid #c8d6ed',borderRadius:10}}>Escolas <strong>{schools.length}</strong></div>
 <div style={{padding:18,border:'1px solid #c8d6ed',borderRadius:10}}>Turmas <strong>{groups.length}</strong></div>
 <div style={{padding:18,border:'1px solid #c8d6ed',borderRadius:10}}>Alunos previstos <strong>{groups.reduce((a,g)=>a+Number(g.student_count||0),0)}</strong></div>
 </div>
 <section style={{padding:18,border:'1px solid #c8d6ed',borderRadius:12}}>
 <h2>Turmas cadastradas</h2>
 {groups.length===0?<p>Nenhuma turma cadastrada.</p>:
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
 <thead><tr>{['Escola','Turma','Série','Alunos','Professor','Contato'].map(t=><th key={t} style={{padding:10}}>{t}</th>)}</tr></thead>
 <tbody>{groups.map(g=><tr key={g.id}>{[g.school,g.label,g.grade_level,g.student_count,g.teacher_name,g.teacher_contact].map((v,i)=><td key={i} style={{padding:10,borderTop:'1px solid #dae3f2'}}>{v||'—'}</td>)}</tr>)}</tbody></table></div>}
 </section>
 {writesEnabled&&<section style={{padding:18,border:'1px solid #c8d6ed',borderRadius:12,marginTop:20}}>
 <h2>Nova turma</h2><form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:13}}>
 <label>Escola<select required value={form.schoolId} onChange={e=>change('schoolId',e.target.value)} style={{display:'block',width:'100%',padding:10}}><option value="">Selecione</option>{schools.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 {([['label','Turma'],['grade','Série / ano'],['teacher','Professor responsável'],['contact','Contato institucional'],['notes','Observações']] as const).map(([key,label])=><label key={key}>{label}<input required={key==='label'} maxLength={key==='notes'?1000:120} value={form[key]} onChange={e=>change(key,e.target.value)} style={{display:'block',width:'100%',padding:10}}/></label>)}
 <label>Quantidade de alunos<input type="number" min={0} max={1000} value={form.studentCount} onChange={e=>change('studentCount',Number(e.target.value))} style={{display:'block',width:'100%',padding:10}}/></label>
 <button disabled={saving} style={{padding:12,background:'#2453c6',color:'white',borderRadius:8}}>{saving?'Salvando...':'Cadastrar turma'}</button>
 </form></section>}
 </main>;
}
