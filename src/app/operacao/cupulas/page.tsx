import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import NovaCupula from './NovaCupula';
import GerenciarCupula from './GerenciarCupula';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Dome={id:string;name:string;code:string|null;capacity:number|null;active:boolean;mapped:boolean};
export default async function CupulasPage(){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 const db=getDb();
 const domesResult=await Promise.allSettled([db`SELECT d.id,d.name,d.code,d.capacity,d.active,
    EXISTS(SELECT 1 FROM public.antares_dome_links l
     WHERE l.organization_id=d.organization_id AND l.antares_dome_id=d.id) AS mapped
   FROM public.antares_domes d WHERE d.organization_id=${owner.organizationId}
   ORDER BY d.active DESC,d.name ASC`]);
 const domes=domesResult[0].status==='fulfilled'?domesResult[0].value as Dome[]:[];
 const domeError=domesResult[0].status==='rejected';
 const active=domes.filter(d=>d.active).length;
 const domeNames=(items:Dome[])=>{const names=items.slice(0,3).map(d=>d.name);return <p className="operation-metric-names">{names.length?names.join(' · '):'Nenhuma'}{items.length>3?` · +${items.length-3} outras`:''}</p>};
 return <main className="operation-detail">
  <style>{`\n.operation-detail:has(.operation-dome-unified) .operation-detail-metrics>div{background:linear-gradient(145deg,#f8fbff,#dcecff);border:1px solid #b8d2f6;border-radius:14px;box-shadow:0 7px 20px rgba(25,83,161,.12);padding:18px}\n.operation-detail .operation-dome-unified{background:linear-gradient(145deg,#f1f7ff,#e2eeff);border:1px solid #b9d3f6;border-radius:16px;box-shadow:0 12px 28px rgba(25,83,161,.12)}\n.operation-detail .operation-dome-card{background:linear-gradient(150deg,#fff,#eaf3ff);border:1px solid #c4d9f5;border-radius:14px;box-shadow:0 6px 16px rgba(20,72,145,.11)}\n.operation-detail .operation-domes-heading{border-bottom:2px solid #c9ddf9;padding-bottom:12px}\n`}</style>
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
   </section>
  </>}
 </main>;
}
