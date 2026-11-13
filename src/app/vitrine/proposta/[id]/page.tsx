import Link from 'next/link';
import Editor from '../Editor';
import Premium from '../Premium';
import {redirect} from 'next/navigation';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import {ArrowLeft,Building2,CheckCircle2,ClipboardList,FileText,Info,Receipt,Users,Wallet} from 'lucide-react';
import styles from '../proposta.module.css';
export const dynamic='force-dynamic';
export default async function Proposta({params}:{params:Promise<{id:string}>}){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 const {id}=await params;
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))return <main style={{padding:32}}>Proposta inválida. <Link href="/vitrine/inbox">Voltar</Link></main>;
 let proposal:null|Record<string,unknown>=null;
 let history:Array<{id:string;changed_at:string;before_values:Record<string,unknown>;after_values:Record<string,unknown>}> = [];
 try {
  const db=getDb();
  const rows=await db`SELECT p.id,p.title,p.status,p.pricing_model,p.expected_attendees,
  p.unit_price,p.fixed_price,p.discount,p.deposit,p.total,p.notes,p.created_at,to_char(p.valid_until, 'YYYY-MM-DD') AS valid_until,p.payment_terms,
  c.name AS client_name,c.kind AS client_kind,
  l.institution AS origin_institution,l.id AS lead_id,
  l.responsible_name AS origin_responsible,l.city AS origin_city,l.phone AS origin_phone,
  l.audience AS origin_audience,l.attendees AS origin_attendees,l.desired_date AS origin_desired_date
  FROM public.business_proposals p
  JOIN public.crm_clients c ON c.id=p.client_id AND c.organization_id=p.organization_id
  LEFT JOIN public.vitrine_leads l ON l.converted_proposal_id=p.id AND l.organization_id=p.organization_id
  WHERE p.id=${id}::uuid AND p.organization_id=${owner.organizationId} LIMIT 1`;
  proposal=(rows[0] as Record<string,unknown>)||null;
  try {const changes=await db`SELECT id,changed_at,before_values,after_values FROM public.business_proposal_changes WHERE proposal_id=${id}::uuid AND organization_id=${owner.organizationId} ORDER BY changed_at DESC LIMIT 30`;history=changes as typeof history;} catch {history=[];}
 } catch {return <main style={{padding:32}}><Link href="/vitrine/inbox">← Solicitações</Link><p>Não foi possível consultar a proposta.</p></main>;}
 if(!proposal)return <main style={{padding:32}}><Link href="/vitrine/inbox">← Solicitações</Link><p>Proposta não encontrada.</p></main>;
 const t=(v:unknown)=>v==null?'—':String(v);
 const money=(v:unknown)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const proposalStatus=String(proposal.status);
 const statusLabel:Record<string,string>={draft:'Rascunho',accepted:'Aceita',approved:'Aprovada',sent:'Enviada',rejected:'Recusada',archived:'Arquivada'};
 const status=statusLabel[proposalStatus]||proposalStatus;
 const sourceDate=proposal.origin_desired_date?String(proposal.origin_desired_date).slice(0,10).split('-').reverse().join('/'):'A combinar';
 const linked=Boolean(proposal.lead_id);
 const origin=proposal.origin_institution?String(proposal.origin_institution):'Não identificada';
 const client=String(proposal.client_name);
 const different=linked&&origin.localeCompare(client,'pt-BR',{sensitivity:'base'})!==0;
 return <main className={styles.page}>
  <Link href="/vitrine/inbox" className={styles.back}><ArrowLeft size={15}/>Voltar às solicitações</Link>
  <header className={styles.hero}>
   <div className={styles.heroLeft}>
    <div className={styles.heroIcon}><FileText size={26}/></div>
    <div>
     <span className={styles.eyebrow}>ANTARES BUSINESS · PROPOSTA COMERCIAL</span>
     <h1>{t(proposal.title)}</h1>
     <p>Consulta interna · Informações vinculadas à solicitação de orçamento</p>
    </div>
   </div>
   <span className={[styles.status,proposalStatus==='draft'?styles.statusDraft:proposalStatus==='accepted'?styles.statusAccepted:''].filter(Boolean).join(' ')}>
    <CheckCircle2 size={15}/>{status}
   </span>
  </header>

  <div className={styles.kpis}>
   <div className={styles.kpi}><span className={styles.kpiIcon}><Building2 size={20}/></span><div className={styles.kpiBody}><small>Instituição solicitante</small><strong>{linked?origin:client}</strong></div></div>
   <div className={styles.kpi}><span className={styles.kpiIcon}><Users size={20}/></span><div className={styles.kpiBody}><small>Participantes previstos</small><strong>{t(proposal.expected_attendees)}</strong></div></div>
   <div className={styles.kpi}><span className={styles.kpiIcon}><Wallet size={20}/></span><div className={styles.kpiBody}><small>Investimento total</small><strong>{money(proposal.total)}</strong></div></div>
   <div className={styles.kpi}><span className={styles.kpiIcon}><ClipboardList size={20}/></span><div className={styles.kpiBody}><small>Origem</small><strong>{linked?'Vitrine vinculada':'Cadastro comercial'}</strong></div></div>
  </div>

  <section className={styles.section}>
   <div className={styles.sectionHead}><h2><Building2 size={17}/>Cliente e origem da solicitação</h2></div>
   <div className={styles.sectionBody}>
    <div className={styles.identityGrid}>
     <div className={styles.identityCard}>
      <small>Instituição solicitante · Vitrine</small><strong>{origin}</strong>
      <span>Responsável: {t(proposal.origin_responsible)}</span>
      <span>Localidade: {t(proposal.origin_city)}</span>
      <span>Contato: {t(proposal.origin_phone)}</span>
     </div>
     <div className={styles.identityCard}>
      <small>Cliente vinculado ao cadastro</small><strong>{client}</strong>
      <span>Tipo de cadastro: {t(proposal.client_kind)}</span>
      <span>Solicitação vinculada: {linked?'Sim':'Não identificada'}</span>
     </div>
    </div>
    <div className={[styles.connection,different?styles.connectionWarn:''].join(' ')}>
     {different?<Info size={16}/>:<CheckCircle2 size={16}/>}
     <span>{different?'A instituição solicitante e o cliente vinculado têm nomes diferentes. Confirme essa associação antes de emitir a proposta definitiva.':linked?'Solicitação da vitrine identificada e associada a esta proposta.':'Esta proposta não possui uma solicitação da vitrine identificada.'}</span>
    </div>
    {linked&&<div className={styles.commercialRows} style={{marginTop:12}}>
     <div className={styles.commercialRow}><span>Público informado na vitrine</span><strong>{t(proposal.origin_audience)}</strong></div>
     <div className={styles.commercialRow}><span>Participantes solicitados</span><strong>{t(proposal.origin_attendees)}</strong></div>
     <div className={styles.commercialRow}><span>Data desejada</span><strong>{sourceDate}</strong></div>
     <div className={styles.commercialRow}><span>Proposta comercial</span><strong>{status}</strong></div>
    </div>}
   </div>
  </section>

  <section className={styles.section}>
   <div className={styles.sectionHead}><h2><Receipt size={17}/>Resumo comercial</h2></div>
   <div className={styles.sectionBody}>
    <div className={styles.valueGrid}>
     <div className={styles.valueCard}><small>Valor total</small><strong>{money(proposal.total)}</strong></div>
     <div className={styles.valueCard}><small>Sinal previsto</small><strong>{money(proposal.deposit)}</strong></div>
     <div className={styles.valueCard}><small>Saldo previsto</small><strong>{money(Math.max(0,Number(proposal.total||0)-Number(proposal.deposit||0)))}</strong></div>
    </div>
    <div className={styles.commercialRows}>
     <div className={styles.commercialRow}><span>Modelo de cobrança</span><strong>{proposal.pricing_model==='per_student'?'Por aluno':proposal.pricing_model==='fixed'?'Valor fechado':'Cortesia'}</strong></div>
     <div className={styles.commercialRow}><span>Participantes previstos</span><strong>{t(proposal.expected_attendees)}</strong></div>
     <div className={styles.commercialRow}><span>Preço por aluno</span><strong>{money(proposal.unit_price)}</strong></div>
     <div className={styles.commercialRow}><span>Preço fixo</span><strong>{money(proposal.fixed_price)}</strong></div>
     <div className={styles.commercialRow}><span>Desconto</span><strong>{money(proposal.discount)}</strong></div>
     <div className={styles.commercialRow}><span>Data de criação</span><strong>{proposal.created_at?new Date(String(proposal.created_at)).toLocaleDateString('pt-BR'):'—'}</strong></div>
    </div>
    {Number(proposal.total)<=0&&<div className={styles.caution}><Info size={16}/>Valores não definidos. Revise antes de enviar ao cliente.</div>}
   </div>
  </section>

  <div className={styles.editorFrame}>
   <Editor proposal={{id:String(proposal.id),status:String(proposal.status),pricing_model:String(proposal.pricing_model),expected_attendees:Number(proposal.expected_attendees??0),unit_price:Number(proposal.unit_price),fixed_price:Number(proposal.fixed_price),discount:Number(proposal.discount),deposit:Number(proposal.deposit)}}/>
  </div>
  <Premium proposal={{id:String(proposal.id),status:String(proposal.status),valid_until:proposal.valid_until?String(proposal.valid_until):null,payment_terms:proposal.payment_terms?String(proposal.payment_terms):null,title:String(proposal.title),client_name:String(proposal.client_name),expected_attendees:Number(proposal.expected_attendees??0),total:Number(proposal.total),deposit:Number(proposal.deposit)}} history={history}/>

  <section className={styles.section}>
   <div className={styles.sectionHead}><h2><Info size={17}/>Observações da proposta</h2></div>
   <div className={styles.sectionBody}><p className={styles.observation}>{t(proposal.notes)}</p></div>
  </section>
  <p className={styles.footer}>A edição de valores está disponível apenas para rascunhos. Após salvar, confirme os dados apresentados. Não há envio automático de mensagens, contratos, pagamentos ou reservas.</p>
 </main>;
}
