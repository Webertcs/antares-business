import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
const reply=(data:object,status:number)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
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
 }catch{return reply({error:'Não foi possível salvar o rascunho. Verifique migração, limites e permissões.'},409);}
}
