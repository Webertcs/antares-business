import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import AuditDetails from './AuditDetails';

export const dynamic='force-dynamic';
export const runtime='nodejs';

type Entry={id:string;action:string;entity_type:string;entity_id:string|null;created_at:string};
const formatter=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});
const actions:Record<string,string>={
 proposal_approved_internal:'Proposta aprovada',
 proposal_terms_updated:'Condições da proposta atualizadas',
 draft_prices_updated:'Valores do orçamento atualizados',
 vitrine_lead_converted:'Solicitação da vitrine convertida',
 proposal_created:'Proposta criada',
 proposal_updated:'Proposta atualizada',
 proposal_accepted:'Proposta aceita',
 contract_created:'Contrato registrado',
 payment_recorded:'Recebimento registrado',
 payment_reversed:'Recebimento estornado',
 event_created:'Apresentação cadastrada',
 reservation_created:'Reserva cadastrada',
 client_created:'Cliente cadastrado'
};
const areas:Record<string,string>={
 proposal:'Propostas',client:'Clientes',contract:'Contratos',presentation:'Apresentações',
 reservation:'Reservas',payment:'Financeiro',equipment:'Cúpulas',dome:'Cúpulas',vitrine_lead:'Vitrine',
 member:'Equipe',team:'Equipe'
};
function readable(raw:string,dict:Record<string,string>){return dict[raw]||raw.replaceAll('_',' ')}
export default async function HistoricoPage(){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 let entries:Entry[]=[];let error=false;
 try{
  const db=getDb();
  entries=await db`SELECT id,action,entity_type,entity_id,created_at
    FROM public.business_audit WHERE organization_id=${owner.organizationId}
    ORDER BY created_at DESC LIMIT 100` as Entry[];
 }catch{error=true}
 return <main className="operation-detail operation-history">
  <Link className="operation-detail-back" href="/?section=operacao">← Voltar</Link>
  <header className="operation-detail-head"><div><h1>Histórico operacional</h1><p>Acompanhe as alterações registradas no seu planetário.</p></div></header>
  <section className="operation-detail-panel">
   <div className="operation-history-heading"><h2>Atividades recentes</h2><span>{error?'Indisponível':entries.length+' registro(s)'}</span></div>
   {error?<p role="alert" className="operation-detail-warning">Histórico indisponível no momento.</p>:
   entries.length===0?<div className="operation-detail-empty"><p>Nenhuma atividade registrada até o momento.</p></div>:
   <div className="operation-detail-table-scroll"><table><thead><tr><th>Data e hora</th><th>Atividade</th><th>Área</th><th>Detalhes</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}>
    <td className="operation-history-date">{Number.isFinite(new Date(e.created_at).getTime())?formatter.format(new Date(e.created_at)):'—'}</td>
    <td className="operation-history-action">{readable(e.action,actions)}</td>
    <td><span className="operation-history-area">{readable(e.entity_type,areas)}</span></td>
    <td><AuditDetails action={e.action} entityType={e.entity_type} entityId={e.entity_id}/></td>
   </tr>)}</tbody></table></div>}
   {!error&&entries.length>0&&<p className="operation-history-note">Exibindo até 100 atividades mais recentes.</p>}
  </section>
 </main>;
}
