import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(process.env.ANTARES_EVENT_OPERATIONS_WRITES_ENABLED!=='true')return NextResponse.json({error:'Gravação operacional ainda não liberada.'},{status:503});
 const ctx=await requireOwner();if(!ctx)return NextResponse.json({error:'Somente proprietário.'},{status:403});
 const origin=process.env.ANTARES_APP_ORIGIN;
 let allowed='';try{allowed=new URL(origin||'').origin}catch{return NextResponse.json({error:'Origem não configurada.'},{status:503})}
 if(req.headers.get('origin')!==allowed||req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
 return NextResponse.json({error:'Origem ou conteúdo inválido.'},{status:403});
 if(Number(req.headers.get('content-length')||'0')>12000)return NextResponse.json({error:'Requisição muito grande.'},{status:413});
 const {id}=await params;if(!uuid.test(id))return NextResponse.json({error:'Evento inválido.'},{status:400});
 try{
  const body=await req.json();const sql=getTeamWriteDb();
  if(body.action==='infrastructure'){
   const access=clean(body.access,2000),parking=clean(body.parking,2000),power=clean(body.power,2000),setup=clean(body.setup,4000);
   await sql`SELECT public.antares_save_event_operation(${ctx.user.id},${id}::uuid,${access},${parking},${power},${setup})`;
  }else if(body.action==='task'){
   const label=clean(body.label,180),taskId=body.taskId==null?null:String(body.taskId);
   if(!label||taskId&&!uuid.test(taskId)||typeof body.done!=='boolean')return NextResponse.json({error:'Tarefa inválida.'},{status:400});
   await sql`SELECT public.antares_save_event_task(${ctx.user.id},${id}::uuid,${taskId}::uuid,${label},${body.done})`;
  }else if(body.action==='session'){
   const label=clean(body.label,160),sessionId=body.sessionId==null?null:String(body.sessionId);
   const start=clean(body.start,5)||null,end=clean(body.end,5)||null;
   const validTime=(v:string|null)=>!v||/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
   const students=body.students==null||body.students===''?null:Number(body.students);
   if(!label||sessionId&&!uuid.test(sessionId)||!validTime(start)||!validTime(end)||start&&end&&end<=start||students!==null&&(!Number.isInteger(students)||students<0||students>10000))
   return NextResponse.json({error:'Sessão inválida.'},{status:400});
   await sql`SELECT public.antares_save_event_session(${ctx.user.id},${id}::uuid,${sessionId}::uuid,${label},${start}::time,${end}::time,${students})`;
  }else return NextResponse.json({error:'Ação inválida.'},{status:400});
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível salvar. Verifique implantação e permissões.'},{status:409})}
}
