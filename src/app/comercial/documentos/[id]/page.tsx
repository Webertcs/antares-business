import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import DocumentoClient from './DocumentoClient';
export const dynamic='force-dynamic';
export default async function Documento({params}:{params:Promise<{id:string}>}){
 const owner=await requireOwner();if(!owner)redirect('/sem-acesso');
 const {id}=await params;
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
  return <main style={{padding:32}}>Documento inválido. <Link href="/operacoes">Voltar</Link></main>;
 try{
 const db=getDb();
 const rows=await db`SELECT p.id,p.title,p.status,p.pricing_model,p.expected_attendees,
 p.unit_price,p.fixed_price,p.discount,p.deposit,p.total,p.notes,p.payment_terms,
 to_char(p.valid_until,'DD/MM/YYYY') AS valid_until,
 c.name AS client_name,c.kind AS client_kind
 FROM public.business_proposals p
 JOIN public.crm_clients c ON c.id=p.client_id AND c.organization_id=p.organization_id
 WHERE p.id=${id}::uuid AND p.organization_id=${owner.organizationId} LIMIT 1`;
 if(!rows.length)return <main style={{padding:32}}>Proposta não encontrada. <Link href="/operacoes">Voltar</Link></main>;
 const p=rows[0];
 return <DocumentoClient doc={{id:String(p.id),title:String(p.title||''),status:String(p.status||''),
  pricingModel:String(p.pricing_model||''),attendees:Number(p.expected_attendees||0),
  unitPrice:Number(p.unit_price||0),fixedPrice:Number(p.fixed_price||0),
  discount:Number(p.discount||0),deposit:Number(p.deposit||0),total:Number(p.total||0),
  notes:String(p.notes||''),paymentTerms:String(p.payment_terms||''),validUntil:String(p.valid_until||''),
  clientName:String(p.client_name||''),clientKind:String(p.client_kind||'')}}/>;
 }catch{return <main style={{padding:32}}>Documento indisponível. <Link href="/operacoes">Voltar</Link></main>}
}
