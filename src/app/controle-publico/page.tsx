import {redirect} from 'next/navigation';
import Link from 'next/link';
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
 const filtered=rows.filter(r=>(!year||String(r.event_date||'').slice(0,4)===year)&&(!client||String(r.client_id)===client));
 const total=filtered.reduce((s,r)=>s+Number(r.actual_students||0),0);
 const years=[...new Set(rows.map(r=>String(r.event_date||'').slice(0,4)).filter(v=>/^20\d{2}$/.test(v)))].sort().reverse();
 const card:React.CSSProperties={padding:18,borderRadius:12,background:'#eef5ff',border:'1px solid #bcd3fa'};
 return <main style={{display:'grid',gap:16,color:'#173668'}}>
 <header style={{padding:22,borderRadius:14,color:'#fff',background:'linear-gradient(110deg,#08265d,#1768c2)'}}>
 <div style={{fontSize:12,letterSpacing:1.5,fontWeight:700}}>ANTARES · RELATÓRIOS</div><h1 style={{margin:'6px 0'}}>Controle de Público</h1><p style={{margin:0}}>Alunos efetivamente atendidos pelo planetário. Previsões não entram no acumulado.</p></header>
 <form method="get" style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end',padding:14,background:'#fff',borderRadius:12}}>
 <label>Ano<br/><select name="ano" defaultValue={year} style={{padding:10,borderRadius:8,border:'1px solid #bcd3fa'}}><option value="">Todos os anos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
 <label>Instituição<br/><select name="instituicao" defaultValue={client} style={{padding:10,borderRadius:8,border:'1px solid #bcd3fa',maxWidth:300}}><option value="">Todas as instituições</option>{clients.map(c=><option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
 <button type="submit" style={{padding:'11px 18px',border:0,borderRadius:8,background:'#1556ae',color:'#fff',fontWeight:700,cursor:'pointer'}}>Filtrar</button><Link href="/controle-publico">Limpar filtros</Link></form>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
 <div style={card}><div>Alunos atendidos</div><strong style={{fontSize:30}}>{fmt(total)}</strong></div>
 <div style={card}><div>Eventos contabilizados</div><strong style={{fontSize:30}}>{fmt(filtered.length)}</strong></div>
 <div style={card}><div>Instituições atendidas</div><strong style={{fontSize:30}}>{fmt(new Set(filtered.map(r=>String(r.client_id))).size)}</strong></div></div>
 <section style={{padding:16,borderRadius:12,background:'#fff',overflowX:'auto'}}><h2>Histórico por evento</h2>
 {!ready[0]?.ok?<p>Controle aguardando implantação da tabela de atendimentos no Neon.</p>:filtered.length===0?<p>Nenhum atendimento registrado para os filtros selecionados.</p>:
 <table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}><thead><tr>{['Data','Instituição','Evento','Previstos','Atendidos'].map(h=><th key={h} style={{padding:10,borderBottom:'2px solid #bcd3fa'}}>{h}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={String(r.id)}><td style={{padding:10,borderBottom:'1px solid #e3ebf6'}}>{r.event_date?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(String(r.event_date))):'—'}</td><td>{String(r.client_name)}</td><td><Link href={`/eventos/${r.id}`}>{String(r.title)}</Link></td><td>{r.expected_attendees==null?'—':fmt(Number(r.expected_attendees))}</td><td><strong>{fmt(Number(r.actual_students||0))}</strong></td></tr>)}</tbody></table>}</section></main>;
}