import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const err=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const ctx=await requireOwner();if(!ctx)return err('Somente proprietário',403);
 try{
 const db=getDb();
 const [schools,groups]=await Promise.all([
 db`SELECT id,name FROM public.crm_clients WHERE organization_id=${ctx.organizationId} AND kind='school' ORDER BY name`,
 db`SELECT g.id,g.client_id,c.name AS school,g.label,g.grade_level,g.student_count,g.teacher_name,g.teacher_contact,g.notes,g.created_at
 FROM public.antares_education_groups g JOIN public.crm_clients c
 ON c.id=g.client_id AND c.organization_id=g.organization_id
 WHERE g.organization_id=${ctx.organizationId} ORDER BY g.created_at DESC LIMIT 500`]);
 return NextResponse.json({schools,groups},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return err('Módulo educacional indisponível até a migração 11',503);}
}
export async function POST(req:NextRequest){
 const ctx=await requireOwner();if(!ctx)return err('Somente proprietário',403);
 if(process.env.ANTARES_EDUCATION_WRITES_ENABLED!=='true')return err('Cadastro educacional bloqueado durante homologação',503);
 try{if(!req.headers.get('origin')||new URL(req.headers.get('origin')!).host!==req.headers.get('host'))return err('Origem inválida',403);}catch{return err('Origem inválida',403);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return err('Formato inválido',415);
 try{
 const v=await req.json();
 if(!v||typeof v!=='object'||typeof v.schoolId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v.schoolId)||
 typeof v.label!=='string'||v.label.trim().length<2||v.label.length>120||
 !Number.isInteger(v.studentCount)||v.studentCount<0||v.studentCount>1000||
 ['grade','teacher','contact','notes'].some(k=>typeof v[k]!=='string'||v[k].length>(k==='notes'?1000:160)))return err('Dados inválidos',400);
 const db=getTeamWriteDb();
 const rows=await db`SELECT public.antares_education_create_group(${ctx.user.id},${ctx.organizationId}::uuid,
 ${v.schoolId}::uuid,${v.label},${v.grade},${v.studentCount},${v.teacher},${v.contact},${v.notes}) AS id`;
 return NextResponse.json({id:rows[0]?.id},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{return err('Cadastro não realizado',409);}
}
