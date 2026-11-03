import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Entry={id:string;action:string;entity_type:string;entity_id:string;created_at:string};
const formatter=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});
export default async function HistoricoPage(){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 let entries:Entry[]=[];let error=false;
 try{
  const db=getDb();
  entries=await db`SELECT id,action,entity_type,entity_id,created_at
    FROM public.business_audit WHERE organization_id=${owner.organizationId}
    ORDER BY created_at DESC LIMIT 100` as Entry[];
 }catch{error=true}
 return <main className="operation-detail">
  <Link className="operation-detail-back" href="/?section=operacao">← Voltar</Link>
  <header className="operation-detail-head"><div><h1>Histórico operacional</h1><p>Registros e alterações da organização.</p></div></header>
  <section className="operation-detail-panel">
   <h2>Atividades recentes</h2>
   {error?<p role="alert" className="operation-detail-warning">Histórico indisponível no momento.</p>:
   entries.length===0?<div className="operation-detail-empty"><p>Nenhum registro de auditoria encontrado.</p></div>:
   <div className="operation-detail-table-scroll"><table><thead><tr><th>Data</th><th>Ação</th><th>Área</th><th>Identificador</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}>
    <td>{Number.isFinite(new Date(e.created_at).getTime())?formatter.format(new Date(e.created_at)):'—'}</td>
    <td>{e.action}</td><td>{e.entity_type}</td><td className="operation-detail-id">{e.entity_id}</td>
   </tr>)}</tbody></table></div>}
  </section>
 </main>;
}
