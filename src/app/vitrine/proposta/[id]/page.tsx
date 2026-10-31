import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
export default async function Proposta({params}:{params:Promise<{id:string}>}){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 const {id}=await params;
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))return <main style={{padding:32}}>Proposta inválida. <Link href="/vitrine/inbox">Voltar</Link></main>;
 let proposal:null|Record<string,unknown>=null;
 try {
  const db=getDb();
  const rows=await db`SELECT p.id,p.title,p.status,p.pricing_model,p.expected_attendees,
  p.unit_price,p.fixed_price,p.discount,p.deposit,p.total,p.notes,p.created_at,
  c.name AS client_name,c.kind AS client_kind,
  l.institution AS origin_institution,l.id AS lead_id
  FROM public.business_proposals p
  JOIN public.crm_clients c ON c.id=p.client_id AND c.organization_id=p.organization_id
  LEFT JOIN public.vitrine_leads l ON l.converted_proposal_id=p.id AND l.organization_id=p.organization_id
  WHERE p.id=${id}::uuid AND p.organization_id=${owner.organizationId} LIMIT 1`;
  proposal=(rows[0] as Record<string,unknown>)||null;
 } catch {return <main style={{padding:32}}><Link href="/vitrine/inbox">← Solicitações</Link><p>Não foi possível consultar a proposta.</p></main>;}
 if(!proposal)return <main style={{padding:32}}><Link href="/vitrine/inbox">← Solicitações</Link><p>Proposta não encontrada.</p></main>;
 const t=(v:unknown)=>v==null?'—':String(v);
 const money=(v:unknown)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 return <main style={{maxWidth:900,margin:'0 auto',padding:'32px 20px',fontFamily:'system-ui'}}>
  <Link href="/vitrine/inbox">← Voltar às solicitações</Link>
  <p style={{marginTop:24,opacity:.7}}>ANTARES BUSINESS · CONSULTA DO PROPRIETÁRIO</p>
  <h1 style={{fontSize:30,fontWeight:750}}>{t(proposal.title)}</h1>
  <p><strong>Situação:</strong> {proposal.status==='draft'?'Rascunho':t(proposal.status)}</p>
  <section style={{border:'1px solid #64748b',borderRadius:14,padding:20,marginTop:20}}>
   <h2 style={{fontSize:21,fontWeight:700}}>Cliente e origem</h2>
   <p><b>Cliente:</b> {t(proposal.client_name)}</p>
   <p><b>Instituição solicitante:</b> {t(proposal.origin_institution)}</p>
   <p><b>Solicitação vinculada:</b> {proposal.lead_id?'Sim':'Não identificada'}</p>
  </section>
  <section style={{border:'1px solid #64748b',borderRadius:14,padding:20,marginTop:16}}>
   <h2 style={{fontSize:21,fontWeight:700}}>Resumo comercial</h2>
   <p><b>Modelo:</b> {proposal.pricing_model==='per_student'?'Por aluno':proposal.pricing_model==='fixed'?'Valor fechado':'Cortesia'}</p>
   <p><b>Participantes:</b> {t(proposal.expected_attendees)}</p>
   <p><b>Preço por aluno:</b> {money(proposal.unit_price)}</p>
   <p><b>Preço fixo:</b> {money(proposal.fixed_price)}</p>
   <p><b>Desconto:</b> {money(proposal.discount)}</p>
   <p><b>Sinal:</b> {money(proposal.deposit)}</p>
   <p><b>Total calculado:</b> {money(proposal.total)}</p>
   <p style={{fontWeight:650}}>Valores iniciais em zero: revisar antes de qualquer envio ao cliente.</p>
  </section>
  <section style={{border:'1px solid #64748b',borderRadius:14,padding:20,marginTop:16}}>
   <h2 style={{fontSize:21,fontWeight:700}}>Observações</h2>
   <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{t(proposal.notes)}</p>
  </section>
  <p style={{marginTop:22}}>Consulta somente leitura. Esta tela não envia propostas nem cria contratos, pagamentos ou reservas.</p>
 </main>;
}
