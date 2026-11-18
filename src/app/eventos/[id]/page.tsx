import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireMember,getDb} from '@/lib/equipe/auth';

export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const infoCard:React.CSSProperties={background:'#f3f7ff',border:'1px solid #c8d9f5',borderRadius:13,padding:'14px 16px',minWidth:0};
const formatDate=(date:unknown):string=>{
 if(!date)return 'A definir';
 const parsed=date instanceof Date?date:new Date(String(date));
 return Number.isNaN(parsed.getTime())?'A definir':new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'}).format(parsed);
};

export default async function Page({params}:{params:Promise<{id:string}>}){
 const ctx=await requireMember();
 if(!ctx)redirect('/sem-acesso');
 const {id}=await params;
 if(!uuid.test(id))notFound();
 const db=getDb();
 const rows=await db`SELECT e.id,e.title,e.event_date,e.start_time,e.end_time,e.status,e.expected_attendees,e.dome_id,e.archived_at,
 c.name AS client_name,d.name AS dome_name,a.actual_students AS actual_students
 FROM public.crm_events e
 JOIN public.crm_clients c ON c.id=e.client_id AND c.organization_id=e.organization_id
 LEFT JOIN public.antares_domes d ON d.id=e.dome_id AND d.organization_id=e.organization_id
 LEFT JOIN public.antares_event_attendance a ON a.event_id=e.id AND a.organization_id=e.organization_id
 WHERE e.id=${id} AND e.organization_id=${ctx.organizationId} LIMIT 1`;
 if(!rows.length)notFound();
 const event=rows[0];
 const status=String(event.status);
 const statusText:Record<string,string>={
  lead:'A organizar',quoted:'Proposta',reserved:'Reservado',confirmed:'Confirmado',
  completed:'Concluído',cancelled:'Cancelado',canceled:'Cancelado'
 };
 const date=formatDate(event.event_date);
 const hour=String(event.start_time||'').slice(0,5);
 const end=String(event.end_time||'').slice(0,5);
 const period=hour?(hour+(end?' às '+end:'')):'Horário a definir';
 return <main className="antares-event-center" style={{display:'grid',gap:14,color:'#173668',paddingBottom:24}}>
  <nav aria-label="Navegação do evento" style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
   <Link href="/eventos" style={{color:'#195db3',fontSize:13,fontWeight:750,textDecoration:'none'}}>← Voltar aos eventos</Link>
  </nav>
  <header style={{borderRadius:16,padding:'20px clamp(16px,3vw,26px)',background:'linear-gradient(110deg,#092a67,#1356b4)',color:'#fff',display:'grid',gap:9}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
    <span style={{fontWeight:800,fontSize:12,letterSpacing:1,color:'#bedfff'}}>EVENTO · ANTARES</span>
    <span style={{padding:'5px 10px',borderRadius:30,background:'rgba(255,255,255,.18)',fontSize:12,fontWeight:800}}>{statusText[status]||status}</span>
   </div>
   <h1 style={{fontSize:'clamp(21px,3vw,29px)',lineHeight:1.2,margin:0,color:'#fff'}}>{String(event.title)}</h1>
   <div style={{fontSize:15,fontWeight:650}}>{date} · {period}</div>
  </header>

  <section aria-label="Resumo do evento" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:10}}>
   {([
    ['Instituição',String(event.client_name)],
    ['Cúpula',String(event.dome_name||'A definir')],
    ['Alunos previstos',event.expected_attendees==null?'A definir':String(event.expected_attendees)]
   ] as const).map(([label,value])=><div key={label} style={infoCard}>
     <div style={{fontSize:12,color:'#50709c',fontWeight:750,marginBottom:5}}>{label}</div>
     <strong style={{fontSize:18,color:'#153e7c',overflowWrap:'anywhere'}}>{value}</strong>
   </div>)}
  </section>


  {event.actual_students!=null&&<section aria-label="Público atendido" style={{border:'1px solid #b7dfc9',background:'#eaf8f0',borderRadius:12,padding:'14px 16px'}}>
   <span style={{color:'#176647',fontSize:12,fontWeight:750}}>Alunos atendidos</span>
   <strong style={{display:'block',color:'#145a3e',fontSize:26}}>{Number(event.actual_students)}</strong>
  </section>}
  <p style={{fontSize:13,color:'#4c668b',margin:0}}>
   Para reservas, alterações e conclusão do atendimento, acesse a <Link href="/vitrine/inbox" style={{color:'#175bb1',fontWeight:750}}>Central de Atendimento</Link>.
  </p>
 </main>;
}
