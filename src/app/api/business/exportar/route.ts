import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
function safeCell(value:unknown){
 const raw=String(value??'').replace(/\r|\n/g,' ').trim();
 const neutral=/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw;
 return '"'+neutral.replace(/"/g,'""')+'"';
}
function csv(columns:string[],rows:unknown[][]){
 return '\uFEFF'+[columns,...rows.map(r=>r.map(v=>String(v??'')))].map(row=>row.map(safeCell).join(';')).join('\r\n');
}
export async function GET(request:NextRequest){
 const owner=await requireOwner();
 if(!owner)return NextResponse.json({error:'Somente proprietário.'},{status:403,headers});
 const type=request.nextUrl.searchParams.get('tipo');
 if(!['financeiro','propostas','agenda'].includes(type||''))
  return NextResponse.json({error:'Relatório inválido.'},{status:400,headers});
 try{
  const sql=getDb();let text='';
  if(type==='financeiro'){
   const r=await sql`SELECT occurred_on,category,description,status,amount,proposal_id
    FROM public.business_ledger WHERE organization_id=${owner.organizationId}
    ORDER BY occurred_on DESC,created_at DESC LIMIT 10000`;
   text=csv(['Data','Tipo','Descrição','Situação','Valor (R$)','Proposta ID'],
    r.map(x=>[x.occurred_on,x.category,x.description,x.status,x.amount,x.proposal_id]));
  }else if(type==='propostas'){
   const r=await sql`SELECT p.created_at,c.name client,p.title,p.pricing_model,p.expected_attendees,
    p.total,p.deposit,p.status,p.valid_until FROM public.business_proposals p
    JOIN public.crm_clients c ON c.id=p.client_id AND c.organization_id=p.organization_id
    WHERE p.organization_id=${owner.organizationId}
    ORDER BY p.created_at DESC LIMIT 10000`;
   text=csv(['Cadastro','Cliente','Proposta','Modelo','Participantes','Total (R$)','Sinal (R$)','Situação','Validade'],
    r.map(x=>[x.created_at,x.client,x.title,x.pricing_model,x.expected_attendees,x.total,x.deposit,x.status,x.valid_until]));
  }else{
   const r=await sql`SELECT b.starts_at,b.ends_at,d.name dome,e.title event,b.status
    FROM public.business_bookings b JOIN public.business_domes d
    ON b.dome_id=d.id AND b.organization_id=d.organization_id
    JOIN public.crm_events e ON b.event_id=e.id AND b.organization_id=e.organization_id
    WHERE b.organization_id=${owner.organizationId} ORDER BY b.starts_at DESC LIMIT 10000`;
   text=csv(['Início','Término','Cúpula','Apresentação','Situação'],
    r.map(x=>[x.starts_at,x.ends_at,x.dome,x.event,x.status]));
  }
  return new NextResponse(text,{headers:{...headers,'Content-Type':'text/csv; charset=utf-8',
   'Content-Disposition':`attachment; filename="antares-${type}.csv"`}});
 }catch{return NextResponse.json({error:'Relatório indisponível até implantação da V1.'},{status:503,headers});}
}
