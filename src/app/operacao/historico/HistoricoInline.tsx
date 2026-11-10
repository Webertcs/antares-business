'use client';
import {useCallback,useEffect,useState} from 'react';
import AuditDetails from './AuditDetails';

type Entry={id:string;action:string;entity_type:string;entity_id:string|null;created_at:string};
const formatter=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});
const actions:Record<string,string>={
 proposal_approved_internal:'Proposta aprovada',proposal_terms_updated:'Condições da proposta atualizadas',
 draft_prices_updated:'Valores do orçamento atualizados',vitrine_lead_converted:'Solicitação da vitrine convertida',
 proposal_created:'Proposta criada',proposal_updated:'Proposta atualizada',proposal_accepted:'Proposta aceita',
 contract_created:'Contrato registrado',payment_recorded:'Recebimento registrado',payment_reversed:'Recebimento estornado',
 event_created:'Apresentação cadastrada',reservation_created:'Reserva cadastrada',client_created:'Cliente cadastrado',
 dome_updated:'Cúpula atualizada',dome_deactivated:'Cúpula desativada',dome_activated:'Cúpula reativada',dome_deleted:'Cúpula excluída'
};
const areas:Record<string,string>={
 proposal:'Propostas',client:'Clientes',contract:'Contratos',presentation:'Apresentações',
 reservation:'Reservas',payment:'Financeiro',equipment:'Cúpulas',dome:'Cúpulas',vitrine_lead:'Vitrine',
 member:'Equipe',team:'Equipe'
};
const readable=(raw:string,dict:Record<string,string>)=>dict[raw]||raw.replaceAll('_',' ');
export default function HistoricoInline(){
 const [entries,setEntries]=useState<Entry[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const response=await fetch('/api/operacao/historico',{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Histórico indisponível.');
   setEntries(data.entries);
  }catch(e){setError(e instanceof Error?e.message:'Histórico indisponível.')}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 return <div className="operation-detail operation-history" style={{maxWidth:'100%',margin:0,padding:0}}>
  <section className="operation-detail-panel">
   <div className="operation-history-heading"><h2>Atividades recentes</h2><span>{loading?'Carregando...':error?'Indisponível':entries.length+' registro(s)'}</span></div>
   {loading?<p role="status">Carregando histórico...</p>:error?<p role="alert" className="operation-detail-warning">{error} <button type="button" onClick={()=>void load()}>Tentar novamente</button></p>:
   entries.length===0?<div className="operation-detail-empty"><p>Nenhuma atividade registrada até o momento.</p></div>:
   <div className="operation-detail-table-scroll"><table><thead><tr><th>Data e hora</th><th>Atividade</th><th>Área</th><th>Detalhes</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}>
    <td className="operation-history-date">{Number.isFinite(new Date(e.created_at).getTime())?formatter.format(new Date(e.created_at)):'—'}</td>
    <td className="operation-history-action">{readable(e.action,actions)}</td>
    <td><span className="operation-history-area">{readable(e.entity_type,areas)}</span></td>
    <td><AuditDetails action={e.action} entityType={e.entity_type} entityId={e.entity_id}/></td>
   </tr>)}</tbody></table></div>}
   {!loading&&!error&&entries.length>0&&<p className="operation-history-note">Exibindo até 100 atividades mais recentes.</p>}
  </section>
 </div>;
}
