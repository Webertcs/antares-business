import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
const reply=(data:object,status:number)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});

/** Consulta exclusiva do proprietário para reabrir um rascunho na Central de Oportunidades. */
export async function GET(req:NextRequest){
 try{
  const owner=await requireOwner();
  if(!owner)return reply({error:'Somente proprietário.'},403);
  const id=req.nextUrl.searchParams.get('id');
  if(!id||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))return reply({error:'Proposta inválida.'},400);
  const db=getDb();
  const rows=await db`SELECT p.id,p.status,p.approved_at,p.client_accepted_at,p.pricing_model,p.expected_attendees,p.unit_price,p.fixed_price,
    p.discount,p.deposit,p.total,to_char(p.valid_until,'YYYY-MM-DD') AS valid_until,p.payment_terms
    FROM public.business_proposals p
    WHERE p.id=${id}::uuid AND p.organization_id=${owner.organizationId}
    LIMIT 1`;
  const p=rows[0];
  if(!p)return reply({error:'Proposta não encontrada.'},404);
  return reply({proposal:{
   id:String(p.id),status:p.status==='draft'&&p.approved_at?'approved_internal':p.status==='accepted'&&!p.client_accepted_at?'legacy_accepted':String(p.status),pricing_model:String(p.pricing_model),
   expected_attendees:Number(p.expected_attendees??0),unit_price:Number(p.unit_price??0),
   fixed_price:Number(p.fixed_price??0),discount:Number(p.discount??0),
   deposit:Number(p.deposit??0),total:Number(p.total??0),
   valid_until:p.valid_until?String(p.valid_until):null,
   payment_terms:p.payment_terms?String(p.payment_terms):''
  }},200);
 }catch{return reply({error:'Não foi possível carregar a proposta.'},500);}
}

export async function POST(req:NextRequest){
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')
 return reply({error:'Edição indisponível.'},503);
 const origin=process.env.ANTARES_APP_ORIGIN;
 try{if(!origin||req.headers.get('origin')!==new URL(origin).origin)return reply({error:'Origem não autorizada.'},403);}catch{return reply({error:'Configuração incompleta.'},503);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return reply({error:'Formato inválido.'},415);
 const raw=await req.text();if(raw.length>2000)return reply({error:'Requisição grande.'},413);
 try{
 const owner=await requireOwner();if(!owner)return reply({error:'Somente proprietário.'},403);
 const b=JSON.parse(raw);
 if(!b||typeof b!=='object'||Array.isArray(b)||!(/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(b.id)))return reply({error:'Proposta inválida.'},400);
 const money=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10000000&&Math.round(v*100)===v*100?v:null;
 const vals=[b.unit,b.fixed,b.discount,b.deposit].map(money);
 if(!['per_student','fixed','complimentary'].includes(b.model)||!Number.isInteger(b.attendees)||b.attendees<0||b.attendees>100000||vals.some(v=>v===null))return reply({error:'Valores inválidos.'},400);
 const sql=getTeamWriteDb();
 const safe=await sql`SELECT current_user='antares_team_runtime' AND NOT r.rolsuper AND NOT r.rolbypassrls AS role_ok,
 NOT has_table_privilege(current_user,'public.business_proposals','UPDATE') AS table_ok,
 has_function_privilege(current_user,'public.business_update_draft_prices(text,uuid,text,integer,numeric,numeric,numeric,numeric)','EXECUTE') AS function_ok
 FROM pg_roles r WHERE r.rolname=current_user`;
 if(!safe[0]?.role_ok||!safe[0]?.table_ok||!safe[0]?.function_ok)return reply({error:'Permissões de edição não homologadas.'},503);
 const result=await sql`SELECT * FROM public.business_update_draft_prices(${owner.user.id},${b.id}::uuid,${b.model},${b.attendees},${vals[0]},${vals[1]},${vals[2]},${vals[3]})`;
 return reply({ok:true,total:result[0]?.total},200);
 }catch{return reply({error:'Não foi possível salvar o rascunho. Confira os dados e tente novamente.'},409);}
}


/**
 * Renovação auditada da validade de uma proposta já aprovada, sem registrar
 * aceite da escola. Nunca realiza UPDATE direto em tabelas de negócio.
 */
export async function PUT(req:NextRequest){
 if(process.env.ANTARES_CRM_WRITES_ENABLED!=='true'||
    process.env.ANTARES_CRM_SECURITY_APPROVED!=='true')
  return reply({error:'Renovação indisponível no momento.'},503);
 try{
  const origin=process.env.ANTARES_APP_ORIGIN;
  if(!origin||req.headers.get('origin')!==new URL(origin).origin)
   return reply({error:'Origem não autorizada.'},403);
 }catch{return reply({error:'Origem não configurada.'},503);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return reply({error:'Formato inválido.'},415);
 if(Number(req.headers.get('content-length')||0)>700)return reply({error:'Dados excessivos.'},413);
 try{
  const owner=await requireOwner();
  if(!owner)return reply({error:'Apenas o proprietário pode renovar uma proposta.'},403);
  const raw=await req.text();
  if(raw.length>700)return reply({error:'Dados excessivos.'},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body)||
     typeof body.id!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id)||
     typeof body.validUntil!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.validUntil))
   return reply({error:'Informe a proposta e a nova validade.'},400);
  const db=getTeamWriteDb();
  const checks=await db`SELECT current_user='antares_team_runtime'
     AND r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AS safe_role,
     NOT has_table_privilege(current_user,'public.business_proposals','UPDATE') AS no_direct_write,
     (SELECT count(*)=1 FROM pg_proc p
       WHERE p.oid=to_regprocedure('public.antares_renew_proposal_validity(text,uuid,date)')
       AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
       AND has_function_privilege(current_user,p.oid,'EXECUTE')
       AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
         WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS safe_function
     FROM pg_roles r WHERE r.rolname=current_user`;
  if(!checks[0]?.safe_role||!checks[0]?.no_direct_write||!checks[0]?.safe_function)
   return reply({error:'Renovação segura ainda não habilitada no banco.'},503);
  const result=await db`SELECT public.antares_renew_proposal_validity(
   ${owner.user.id},${body.id}::uuid,${body.validUntil}::date) AS valid_until`;
  return reply({ok:true,validUntil:result[0]?.valid_until},200);
 }catch(error){
  const code=typeof error==='object'&&error!==null&&'code' in error&&typeof error.code==='string'
   ?error.code:'UNKNOWN';
  console.error('[ANTARES][RENOVACAO] Operação recusada. Código:',code);
  return reply({error:'Não foi possível renovar. Confira a data, a aprovação interna e se o aceite da escola já foi registrado.'},409);
 }
}
