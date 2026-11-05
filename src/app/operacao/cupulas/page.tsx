import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import NovaCupula from './NovaCupula';
import GerenciarCupula from './GerenciarCupula';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Dome={id:string;name:string;code:string|null;capacity:number|null;active:boolean;mapped:boolean};
type Booking={id:string;title:string;dome_name:string;starts_at:string;ends_at:string;status:string};
type Summary={accepted:number;linked_clients:number;linked_domes:number;reservations:number};
const fmt=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});
const safeDate=(value:string)=>{const d=new Date(value);return Number.isFinite(d.getTime())?fmt.format(d):'Data indisponível'};
export default async function CupulasPage(){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 const db=getDb();
 const results=await Promise.allSettled([
  db`SELECT d.id,d.name,d.code,d.capacity,d.active,
    EXISTS(SELECT 1 FROM public.antares_dome_links l
     WHERE l.organization_id=d.organization_id AND l.antares_dome_id=d.id) AS mapped
   FROM public.antares_domes d WHERE d.organization_id=${owner.organizationId}
   ORDER BY d.active DESC,d.name ASC`,
  db`SELECT
    (SELECT count(*)::int FROM public.business_proposals p
     WHERE p.organization_id=${owner.organizationId} AND p.status='accepted') AS accepted,
    (SELECT count(*)::int FROM public.business_proposals p
     JOIN public.antares_client_links l ON l.organization_id=p.organization_id AND l.crm_client_id=p.client_id
     WHERE p.organization_id=${owner.organizationId} AND p.status='accepted') AS linked_clients,
    (SELECT count(*)::int FROM public.antares_dome_links l
     JOIN public.antares_domes d ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
     WHERE l.organization_id=${owner.organizationId} AND d.active) AS linked_domes,
    (SELECT count(*)::int FROM public.antares_proposal_reservations r
     WHERE r.organization_id=${owner.organizationId}) AS reservations`,
  db`SELECT p.id,p.title,COALESCE(d.name,'Cúpula não identificada') AS dome_name,
     p.starts_at,p.ends_at,p.status
     FROM public.antares_proposal_reservations r
     JOIN public.presentations p ON p.id=r.presentation_id AND p.organization_id=r.organization_id
     LEFT JOIN public.antares_dome_links l ON l.organization_id=p.organization_id AND l.equipment_id=p.dome_id
     LEFT JOIN public.antares_domes d ON d.id=l.antares_dome_id AND d.organization_id=l.organization_id
     WHERE r.organization_id=${owner.organizationId}
       AND p.starts_at>=now() AND p.status NOT IN ('cancelled','canceled')
     ORDER BY p.starts_at ASC LIMIT 5`
 ]);
 const domes=results[0].status==='fulfilled'?results[0].value as Dome[]:[];
 const summary=results[1].status==='fulfilled'?(results[1].value[0] as Summary):null;
 const upcoming=results[2].status==='fulfilled'?results[2].value as Booking[]:[];
 const domeError=results[0].status==='rejected';
 const reservationsError=results[1].status==='rejected'||results[2].status==='rejected';
 const active=domes.filter(d=>d.active).length;
 const domeNames=(items:Dome[])=>{const names=items.slice(0,3).map(d=>d.name);return <p className="operation-metric-names">{names.length?names.join(' · '):'Nenhuma'}{items.length>3?` · +${items.length-3} outras`:''}</p>};
 return <main className="operation-detail">
  <Link className="operation-detail-back" href="/?section=operacao">← Voltar</Link>
  <header className="operation-detail-head"><div><h1>Cúpulas</h1><p>Estrutura e programação do planetário.</p></div></header>
  {domeError?<p className="operation-detail-warning" role="alert">Não foi possível consultar as cúpulas neste momento.</p>:<>
   <div className="operation-detail-metrics">
    <div><span>Cúpulas cadastradas</span><strong>{domes.length}</strong>{domeNames(domes)}</div>
    <div><span>Ativas</span><strong>{active}</strong>{domeNames(domes.filter(d=>d.active))}</div>
    <div><span>Vinculadas à operação</span><strong>{domes.filter(d=>d.mapped).length}</strong>{domeNames(domes.filter(d=>d.mapped))}</div>
   </div>
   <section className="operation-detail-panel operation-dome-unified">
    <div className="operation-domes-heading"><h2>Suas cúpulas</h2><NovaCupula enabled={process.env.ANTARES_AGENDA_WRITES_ENABLED==='true'}/></div>
    {domes.length===0?<div className="operation-detail-empty"><p>Nenhuma cúpula cadastrada.</p><small>O cadastro será realizado com os dados definitivos do planetário.</small></div>:
    <div className="operation-dome-grid">{domes.map(d=><article className="operation-dome-card" key={d.id}>
     <div className="operation-dome-top"><h3>{d.name}</h3><span className={d.active?'operation-status-active':'operation-status-inactive'}>{d.active?'Ativa':'Inativa'}</span></div>
     <dl><div><dt>Código</dt><dd>{d.code||'Não informado'}</dd></div>
     <div><dt>Capacidade</dt><dd>{d.capacity?d.capacity+' pessoas':'Não informada'}</dd></div>
     <div><dt>Vínculo operacional</dt><dd>{d.mapped?'Vinculada':'Sem vínculo'}</dd></div></dl><GerenciarCupula dome={d} enabled={process.env.ANTARES_AGENDA_WRITES_ENABLED==='true'}/>
    </article>)}</div>}
    <section className="operation-reservations" aria-labelledby="operation-reservations-title">
     <div className="operation-reservations-head"><h2 id="operation-reservations-title">Reservas vinculadas</h2><span className="operation-reservations-badge">{summary?summary.reservations:'—'} registro(s)</span></div>
     {reservationsError?<p role="alert" className="operation-detail-warning">Não foi possível consultar as reservas neste momento.</p>:<>
      <div className="operation-reservations-metrics">
       <div><span>Propostas aceitas</span><strong>{summary?.accepted??0}</strong></div>
       <div><span>Propostas com cliente vinculado</span><strong>{summary?.linked_clients??0}</strong></div>
       <div><span>Cúpulas aptas e vinculadas</span><strong>{summary?.linked_domes??0}</strong></div>
      </div>
      <h3>Próximas apresentações</h3>
      {upcoming.length===0?<div className="operation-detail-empty operation-reservations-empty"><p>Nenhuma apresentação futura vinculada.</p><small>As reservas aparecerão aqui após sua confirmação.</small></div>:
       <div className="operation-reservations-items">{upcoming.map(item=><article key={item.id} className="operation-reservation-item">
        <div><strong>{item.title}</strong><span>{item.dome_name}</span></div>
        <div><time dateTime={item.starts_at}>{safeDate(item.starts_at)}</time><span>Até {safeDate(item.ends_at)}</span></div>
       </article>)}</div>}
      {summary!==null&&summary.reservations>upcoming.length&&<p className="operation-reservations-more">Exibindo até cinco apresentações futuras. O histórico de reservas permanece disponível na Agenda.</p>}
     </>}
    </section>
   </section>
  </>}
 </main>;
}
