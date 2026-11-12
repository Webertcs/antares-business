import {redirect} from 'next/navigation';
import AutoPrint from './AutoPrint';
import {requireMember,getDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
type Search={ano?:string;instituicao?:string};
const fmt=(n:number)=>new Intl.NumberFormat('pt-BR').format(n);
const date=(value:unknown)=>{if(!value)return '—';const raw=String(value);const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(raw));};
export default async function Page({searchParams}:{searchParams:Promise<Search>}){
 const ctx=await requireMember();if(!ctx)redirect('/sem-acesso');
 const params=await searchParams;
 const year=/^20\d{2}$/.test(params.ano||'')?params.ano!:'';
 const client=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(params.instituicao||'')?params.instituicao!:'';
 const db=getDb();
 const rows=await db`SELECT e.id,e.title,e.event_date,e.expected_attendees,c.id AS client_id,c.name AS client_name,a.actual_students FROM public.antares_event_attendance a JOIN public.crm_events e ON e.id=a.event_id AND e.organization_id=a.organization_id JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id WHERE a.organization_id=${ctx.organizationId}::uuid ORDER BY e.event_date DESC NULLS LAST,e.title`;
 const filtered=rows.filter(r=>(!year||(r.event_date instanceof Date?String(r.event_date.getUTCFullYear()):String(r.event_date||'').slice(0,4))===year)&&(!client||String(r.client_id)===client));
 const total=filtered.reduce((n,r)=>n+Number(r.actual_students||0),0);
 const summary=[...new Map(filtered.map(r=>[String(r.client_id),String(r.client_name)])).entries()].map(([id,name])=>({id,name,events:filtered.filter(r=>String(r.client_id)===id).length,students:filtered.filter(r=>String(r.client_id)===id).reduce((n,r)=>n+Number(r.actual_students||0),0)})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const selected=client?summary.find(r=>r.id===client)?.name||'Instituição selecionada':'Todas as instituições';
 return <><AutoPrint/><style>{`@page{size:A4;margin:13mm}
*{box-sizing:border-box}body{font:12px Arial,Helvetica,sans-serif;color:#183b70;margin:0;background:#edf3fc}
.sheet{max-width:880px;width:100%;margin:20px auto;background:white;padding:26px;min-height:100vh;box-shadow:0 10px 25px #0e408020}
.header{display:flex;align-items:center;gap:18px;background:linear-gradient(110deg,#092e69,#134f9b 65%,#2172c8);color:white;padding:18px;border-radius:12px;min-height:101px}
.logo-tile{flex:0 0 140px;display:flex;align-items:center;justify-content:center;padding:7px 9px;border:1px solid #d0e6fc;background:white;border-radius:9px;min-height:60px}
.logo-tile img{display:block;width:100%;height:auto;max-height:54px;object-fit:contain}
.header-copy{flex:1;min-width:0}.eyebrow{font-size:9px;font-weight:800;color:#c4e3ff;letter-spacing:1.2px}
.header h1{font-size:22px;margin:6px 0 4px;font-weight:800;letter-spacing:-.2px}.header p{font-size:10px;margin:0;color:#dbeeff}
.issue{font-size:9px;color:#ebf7ff;text-align:right;white-space:nowrap;align-self:flex-start;padding-top:4px}
.filters{background:linear-gradient(110deg,#f0f7ff,#e7f1ff);border:1px solid #c3daf8;border-radius:9px;padding:10px 13px;margin:15px 0;color:#295b94;font-size:10px}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}
.stat{background:linear-gradient(130deg,#fbfdff,#edf5ff);border:1px solid #bfd6f7;border-top:3px solid #2b7ddd;border-radius:10px;padding:12px 13px;min-height:75px;color:#28588d;font-size:10px;font-weight:700}
.stat:nth-child(2){border-top-color:#16a88b}.stat:nth-child(3){border-top-color:#9270d8}
.stat strong{display:block;color:#124182;font-size:22px;margin-top:6px;font-weight:800}
h2{font-size:13px;margin:17px 0 0;padding:11px 13px;color:white;background:linear-gradient(110deg,#0c387b,#2371c8);border-radius:9px 9px 0 0;break-after:avoid}
table{width:100%;border-collapse:collapse;font-size:10px;border:1px solid #c5daf6;border-top:0}
thead{display:table-header-group}th{text-align:left;background:#dfeeff;color:#164980;border-bottom:2px solid #aacaf0;white-space:nowrap;font-size:9px}
th,td{padding:8px 9px;border-bottom:1px solid #d7e4f5;vertical-align:middle}
tbody tr:nth-child(even){background:#edf5ff}tbody tr:nth-child(odd){background:#fafcff}
tr{break-inside:avoid;page-break-inside:avoid}td strong{color:#174887}
footer{margin-top:20px;border-top:1px solid #b7d0f2;padding-top:10px;font-size:9px;color:#55759c;text-align:center}
.actions{max-width:880px;margin:16px auto;display:flex;align-items:center;gap:10px;justify-content:space-between;padding:0 8px}
.actions span{font-size:12px;color:#1a477f}.actions a{background:linear-gradient(110deg,#286fd1,#0e468e);color:#fff;border:1px solid #1956a5;border-radius:9px;padding:11px 17px;font-weight:800;text-decoration:none;box-shadow:0 3px 10px #144b9333}
@media(max-width:600px){.sheet{padding:12px}.header{flex-wrap:wrap}.issue{margin-left:auto}.logo-tile{flex-basis:120px}.stat strong{font-size:18px}th,td{padding:6px 4px}}
@media print{body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{margin:0;max-width:none;padding:0;min-height:auto;box-shadow:none}.actions{display:none}.header,.stat,.filters,h2,th,tbody tr:nth-child(even){-webkit-print-color-adjust:exact;print-color-adjust:exact}.header,.stats{break-inside:avoid}}`}</style>
 <div className="actions"><span style={{padding:"12px 0",fontWeight:700}}>Para salvar em PDF, use Ctrl+P e escolha “Salvar como PDF”</span><a href="/controle-publico">Voltar</a></div>
 <main className="sheet"><header className="header"><div className="logo-tile"><img src="/antares-logo-horizontal.png" alt="ANTARES Business" /></div><div className="header-copy"><div className="eyebrow">ANTARES BUSINESS · RELATÓRIO OFICIAL</div><h1>Controle de Público</h1><p>Alunos atendidos e eventos contabilizados</p></div><div className="issue">Emissão<br/>{new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}</div></header>
 <p className="filters"><strong>Período:</strong> {year||'Todos os anos'} &nbsp; | &nbsp; <strong>Instituição:</strong> {selected}</p>
 <div className="stats"><div className="stat">Alunos atendidos<strong>{fmt(total)}</strong></div><div className="stat">Eventos contabilizados<strong>{fmt(filtered.length)}</strong></div><div className="stat">Instituições atendidas<strong>{fmt(new Set(filtered.map(r=>String(r.client_id))).size)}</strong></div></div>
 <h2>Resumo por instituição</h2><table><thead><tr><th>Instituição</th><th>Eventos</th><th>Alunos atendidos</th></tr></thead><tbody>{summary.map(r=><tr key={r.id}><td>{r.name}</td><td>{fmt(r.events)}</td><td><strong>{fmt(r.students)}</strong></td></tr>)}{!summary.length&&<tr><td colSpan={3}>Nenhum atendimento registrado.</td></tr>}</tbody></table>
 <h2>Histórico por evento</h2><table><thead><tr><th>Data</th><th>Instituição</th><th>Evento</th><th>Previstos</th><th>Atendidos</th></tr></thead><tbody>{filtered.map(r=><tr key={String(r.id)}><td>{date(r.event_date)}</td><td>{String(r.client_name)}</td><td>{String(r.title)}</td><td>{r.expected_attendees==null?'—':fmt(Number(r.expected_attendees))}</td><td><strong>{fmt(Number(r.actual_students||0))}</strong></td></tr>)}{!filtered.length&&<tr><td colSpan={5}>Nenhum atendimento registrado.</td></tr>}</tbody></table>
 <footer>ANTARES · Relatório de público. Somente atendimentos efetivamente registrados são contabilizados.</footer></main></>;
}