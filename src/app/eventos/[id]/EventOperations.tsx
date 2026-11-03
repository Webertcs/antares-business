'use client';
import {useEffect,useState} from 'react';
type Operation={access_instructions:string|null;parking_instructions:string|null;power_requirements:string|null;setup_notes:string|null};
type Task={id:string;label:string;done:boolean;completed_at:string|null};
type Session={id:string;label:string;starts_at:string|null;ends_at:string|null;expected_students:number|null};
type Payload={available:boolean;operations:Operation|null;checklist:Task[];sessions:Session[]};
const card:React.CSSProperties={background:'#f3f7ff',border:'1px solid #c9d9f5',borderRadius:14,padding:18};
export default function EventOperations({eventId}:{eventId:string}){
 const [data,setData]=useState<Payload|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [feedback,setFeedback]=useState('');
 const [saving,setSaving]=useState(false);
 const [access,setAccess]=useState('');const [parking,setParking]=useState('');const [power,setPower]=useState('');const [setup,setSetup]=useState('');
 const [task,setTask]=useState('');const [session,setSession]=useState('');const [start,setStart]=useState('');const [end,setEnd]=useState('');const [students,setStudents]=useState('');
 const [writesEnabled,setWritesEnabled]=useState(false);
 async function save(payload:Record<string,unknown>){if(!writesEnabled)return;setSaving(true);setFeedback('');try{const response=await fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao/salvar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw Error(result.error||'Falha ao salvar');setFeedback('Registro salvo. Atualize a página para conferir.');}catch(e){setFeedback(e instanceof Error?e.message:'Erro ao salvar')}finally{setSaving(false)}}
 useEffect(()=>{const ctrl=new AbortController();setLoading(true);fetch('/api/eventos/'+encodeURIComponent(eventId)+'/operacao',{signal:ctrl.signal,cache:'no-store'}).then(async r=>{const json=await r.json();if(!r.ok)throw Error(json.error||'Consulta indisponível');return json as Payload;}).then(v=>{if(!ctrl.signal.aborted){setData(v);setAccess(v.operations?.access_instructions||'');setParking(v.operations?.parking_instructions||'');setPower(v.operations?.power_requirements||'');setSetup(v.operations?.setup_notes||'');}}).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Consulta indisponível')}).finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});return()=>ctrl.abort()},[eventId]);
 if(loading)return <section style={card} role="status">Carregando preparação operacional…</section>;
 if(error)return <section style={card} role="status"><h2>Preparação operacional</h2><p>{error}</p><small>Os dados existentes do evento permanecem preservados.</small></section>;
 if(!data)return null;
 const op=data.operations;
 const inputStyle:React.CSSProperties={width:'100%',border:'1px solid #b7c9e9',borderRadius:8,padding:9,background:'#fff',color:'#183c70'};
 const disabledMessage=<p style={{fontSize:13,color:'#6b7280'}}>Edição será habilitada após a migração e auditoria de permissões no Neon.</p>;
 return <div style={{display:'grid',gap:14}}>
 <section style={card}><h2>Infraestrutura</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
 {([['Acesso e entrada',op?.access_instructions],['Estacionamento',op?.parking_instructions],['Energia elétrica',op?.power_requirements],['Montagem',op?.setup_notes]] as const).map(([label,value])=><div key={label}><strong>{label}</strong><p style={{whiteSpace:'pre-wrap'}}>{value||'Não informado'}</p></div>)}</div>{disabledMessage}</section>
 <section style={card}><h2>Checklist operacional</h2>{data.checklist.length?<ul style={{display:'grid',gap:10,paddingLeft:20}}>{data.checklist.map(t=><li key={t.id}>{t.done?'✓ ':'○ '}{t.label}{t.done?' — Concluído':''}</li>)}</ul>:<p>Nenhuma tarefa cadastrada para este evento.</p>}{disabledMessage}</section>
 <section style={card}><h2>Sessões e turmas</h2>{data.sessions.length?<div style={{display:'grid',gap:10}}>{data.sessions.map(s=><div key={s.id} style={{borderBottom:'1px solid #c9d9f5',paddingBottom:8}}><strong>{s.label}</strong><p>{s.starts_at?String(s.starts_at).slice(0,5):'Horário a definir'}{s.ends_at?'–'+String(s.ends_at).slice(0,5):''} · {s.expected_students==null?'Alunos a definir':s.expected_students+' alunos'}</p></div>)}</div>:<p>Nenhuma sessão cadastrada para este evento.</p>}{disabledMessage}</section>
 </div>;
}
