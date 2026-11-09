import {redirect} from 'next/navigation';
import Link from 'next/link';
import RelationshipShell from '../RelationshipShell';
import {requireMember,getDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
type Search={ano?:string;instituicao?:string};
const fmt=(n:number)=>new Intl.NumberFormat('pt-BR').format(n);
export default async function Page({searchParams}:{searchParams:Promise<Search>}){
 const ctx=await requireMember();if(!ctx)redirect('/sem-acesso');
 const filters=await searchParams;
 const year=/^20\d{2}$/.test(filters.ano||'')?filters.ano!:'';
 const client=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(filters.instituicao||'')?filters.instituicao!:'';
 const db=getDb();
 const ready=await db`SELECT to_regclass('public.antares_event_attendance') IS NOT NULL AS ok`;
 const clients=await db`SELECT id,name FROM public.crm_clients WHERE organization_id=${ctx.organizationId}::uuid ORDER BY name`;
 const rows=ready[0]?.ok?await db`SELECT e.id,e.title,e.event_date,e.expected_attendees,c.id AS client_id,c.name AS client_name,a.actual_students
 FROM public.antares_event_attendance a
 JOIN public.crm_events e ON e.id=a.event_id AND e.organization_id=a.organization_id
 JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id
 WHERE a.organization_id=${ctx.organizationId}::uuid ORDER BY e.event_date DESC NULLS LAST,e.title`:[];
 const eventYear=(value:unknown)=>{if(!value)return '';if(value instanceof Date)return String(value.getUTCFullYear());const raw=String(value);const iso=raw.match(/^(20\d{2})-/);if(iso)return iso[1];const parsed=new Date(raw);return Number.isNaN(parsed.getTime())?'':String(parsed.getUTCFullYear());};
 const filtered=rows.filter(r=>(!year||eventYear(r.event_date)===year)&&(!client||String(r.client_id)===client));
 const total=filtered.reduce((s,r)=>s+Number(r.actual_students||0),0);
 const years=[...new Set(rows.map(r=>eventYear(r.event_date)).filter(v=>/^20\d{2}$/.test(v)))].sort().reverse();
 const card:React.CSSProperties={padding:18,borderRadius:12,background:'#eef5ff',border:'1px solid #bcd3fa'};
 const summary=[...new Map(filtered.map(r=>[String(r.client_id),String(r.client_name)])).entries()].map(([id,name])=>({id,name,events:filtered.filter(r=>String(r.client_id)===id).length,students:filtered.filter(r=>String(r.client_id)===id).reduce((n,r)=>n+Number(r.actual_students||0),0)})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 return <RelationshipShell title="Controle de Público"><main style={{maxWidth:1100,margin:'0 auto',padding:'24px clamp(14px,2.5vw,26px)',display:'grid',gap:16,color:'#173668'}}> 
 <header style={{padding:22,borderRadius:14,color:'#fff',background:'linear-gradient(110deg,#08265d,#1768c2)'}}>
 <div style={{fontSize:12,letterSpacing:1.5,fontWeight:700}}>ANTARES · RELATÓRIOS</div><h1 style={{margin:'6px 0'}}>Controle de Público</h1></header>
 <form method="get" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:14,padding:18,background:'#fff',border:'1px solid #c8dcf8',borderRadius:14,boxShadow:'0 5px 15px rgba(17,63,131,.06)'}}>
 <label style={{display:'grid',gap:7,minWidth:0,fontSize:13,fontWeight:700,color:'#16427f'}}>Ano
 <select name="ano" defaultValue={year} style={{width:'100%',minWidth:0,padding:'12px 14px',borderRadius:10,border:'1px solid #a9c7f2',background:'#edf5ff',color:'#16427f',fontSize:14,fontWeight:600,cursor:'pointer'}}><option value="">Todos os anos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
 <label style={{display:'grid',gap:7,minWidth:0,fontSize:13,fontWeight:700,color:'#16427f'}}>Instituição
 <select name="instituicao" defaultValue={client} style={{width:'100%',minWidth:0,padding:'12px 14px',borderRadius:10,border:'1px solid #a9c7f2',background:'#edf5ff',color:'#16427f',fontSize:14,fontWeight:600,cursor:'pointer'}}><option value="">Todas as instituições</option>{clients.map(c=><option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
 <button type="submit" style={{width:'100%',padding:'12px 16px',border:0,borderRadius:10,background:'linear-gradient(110deg,#174eab,#2875d9)',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Filtrar</button>
 <Link href="/controle-publico" style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',padding:'12px 16px',border:'1px solid #a9c7f2',borderRadius:10,background:'#e9f2ff',color:'#16427f',fontSize:14,fontWeight:700,textDecoration:'none',boxSizing:'border-box'}}>Limpar filtros</Link></form>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
 <div style={card}><div>Alunos atendidos</div><strong style={{fontSize:30}}>{fmt(total)}</strong></div>
 <div style={card}><div>Eventos contabilizados</div><strong style={{fontSize:30}}>{fmt(filtered.length)}</strong></div>
 <div style={card}><div>Instituições atendidas</div><strong style={{fontSize:30}}>{fmt(new Set(filtered.map(r=>String(r.client_id))).size)}</strong></div></div>
 <section style={{padding:18,border:'1px solid #c8dcf8',borderLeft:'4px solid #2675d6',borderRadius:12,background:'#fff',overflowX:'auto'}}><h2 style={{fontSize:19,margin:'0 0 12px'}}>Resumo por instituição</h2>{summary.length===0?<p>Nenhuma instituição com atendimento registrado neste período.</p>:<table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}><thead><tr><th style={{padding:10,borderBottom:'2px solid #bcd3fa'}}>Instituição</th><th style={{padding:10,borderBottom:'2px solid #bcd3fa'}}>Eventos</th><th style={{padding:10,borderBottom:'2px solid #bcd3fa'}}>Alunos atendidos</th></tr></thead><tbody>{summary.map(r=><tr key={r.id}><td style={{padding:10,borderBottom:'1px solid #e3ebf6'}}>{r.name}</td><td>{fmt(r.events)}</td><td><strong>{fmt(r.students)}</strong></td></tr>)}</tbody></table>}</section>
 <section style={{padding:18,border:'1px solid #c8dcf8',borderLeft:'4px solid #2675d6',borderRadius:12,background:'#fff',overflowX:'auto'}}><h2 style={{fontSize:19,margin:'0 0 12px'}}>Histórico por evento</h2>
 {!ready[0]?.ok?<p>Controle aguardando implantação da tabela de atendimentos no Neon.</p>:filtered.length===0?<p>Nenhum atendimento registrado para os filtros selecionados.</p>:
 <table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}><thead><tr>{['Data','Instituição','Evento','Previstos','Atendidos'].map(h=><th key={h} style={{padding:10,borderBottom:'2px solid #bcd3fa'}}>{h}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={String(r.id)}><td style={{padding:10,borderBottom:'1px solid #e3ebf6'}}>{r.event_date?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(String(r.event_date))):'—'}</td><td>{String(r.client_name)}</td><td><Link href={`/eventos/${r.id}`}>{String(r.title)}</Link></td><td>{r.expected_attendees==null?'—':fmt(Number(r.expected_attendees))}</td><td><strong>{fmt(Number(r.actual_students||0))}</strong></td></tr>)}</tbody></table>}</section></main></RelationshipShell>;
}