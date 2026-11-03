import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Dome={id:string;name:string;code:string|null;capacity:number|null;active:boolean;mapped:boolean};
export default async function CupulasPage(){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 let domes:Dome[]=[];let error=false;
 try{
  const db=getDb();
  const result=await db`SELECT d.id,d.name,d.code,d.capacity,d.active,
    EXISTS(SELECT 1 FROM public.antares_dome_links l
     WHERE l.organization_id=d.organization_id AND l.antares_dome_id=d.id) AS mapped
   FROM public.antares_domes d
   WHERE d.organization_id=${owner.organizationId}
   ORDER BY d.active DESC,d.name ASC`;
  domes=result as Dome[];
 }catch{error=true}
 const active=domes.filter(d=>d.active).length;
 return <main className="operation-detail">
  <Link className="operation-detail-back" href="/?section=operacao">← Voltar</Link>
  <header className="operation-detail-head"><div><h1>Cúpulas e equipamentos</h1><p>Estrutura e capacidade do seu planetário.</p></div>
   <Link className="operation-detail-action" href="/agenda/reservas">Ver reservas ↗</Link></header>
  {error?<p className="operation-detail-warning" role="alert">Não foi possível consultar as cúpulas neste momento.</p>:<>
   <div className="operation-detail-metrics">
    <div><span>Cúpulas cadastradas</span><strong>{domes.length}</strong></div>
    <div><span>Ativas</span><strong>{active}</strong></div>
    <div><span>Vinculadas à operação</span><strong>{domes.filter(d=>d.mapped).length}</strong></div>
   </div>
   <section className="operation-detail-panel">
    <h2>Suas cúpulas</h2>
    {domes.length===0?<div className="operation-detail-empty"><p>Nenhuma cúpula cadastrada.</p><small>O cadastro será realizado com os dados definitivos do planetário.</small></div>:
    <div className="operation-dome-grid">{domes.map(d=><article className="operation-dome-card" key={d.id}>
     <div className="operation-dome-top"><h3>{d.name}</h3><span className={d.active?'operation-status-active':'operation-status-inactive'}>{d.active?'Ativa':'Inativa'}</span></div>
     <dl><div><dt>Código</dt><dd>{d.code||'Não informado'}</dd></div>
     <div><dt>Capacidade</dt><dd>{d.capacity?d.capacity+' pessoas':'Não informada'}</dd></div>
     <div><dt>Reserva operacional</dt><dd>{d.mapped?'Vinculada':'Sem vínculo'}</dd></div></dl>
    </article>)}</div>}
   </section>
  </>}
 </main>;
}
