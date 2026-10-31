import {NextRequest,NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {createHmac} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const fail=(message:string,status:number)=>NextResponse.json({ok:false,message},{status,headers:{'Cache-Control':'no-store'}});
const str=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max+1):'';
export async function POST(request:NextRequest){
 if(process.env.ANTARES_PUBLIC_LEADS_ENABLED!=='true')return fail('Integração com CRM ainda não ativada.',503);
 const dbUrl=process.env.DATABASE_URL_PUBLIC_INBOX;
 const org=process.env.ANTARES_PUBLIC_ORGANIZATION_ID;
 const secret=process.env.ANTARES_LEAD_HASH_SECRET;
 const appOrigin=process.env.ANTARES_APP_ORIGIN;
 if(!dbUrl||!org||!secret||secret.length<32||!appOrigin||!/^https?:\/\//.test(appOrigin))return fail('Configuração de recebimento incompleta.',503);
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(org))return fail('Organização não configurada.',503);
 if(request.headers.get('origin')!==new URL(appOrigin).origin)return fail('Origem não autorizada.',403);
 if(request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')return fail('Formato inválido.',415);
 if(Number(request.headers.get('content-length')||0)>5000)return fail('Pedido muito grande.',413);
 let body:Record<string,unknown>;
 try {
  const raw=await request.text();
  if(raw.length>5000)return fail('Pedido muito grande.',413);
  body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('Pedido inválido.',400);
 }catch{return fail('Pedido inválido.',400);}
 if(body.website)return fail('Pedido não aceito.',400); // honeypot
 const name=str(body.name,120),institution=str(body.institution,150),city=str(body.city,100);
 const phone=str(body.phone,30).replace(/\D/g,''),audience=str(body.audience,40);
 const notes=str(body.notes,800),date=str(body.date,10);
 const attendees=body.attendees==null||body.attendees===''?null:Number(body.attendees);
 if(name.length<2||name.length>120||institution.length<2||institution.length>150||
 city.length<2||city.length>100||phone.length<10||phone.length>13||
 !['Escola','Associação','Empresa','Evento particular'].includes(audience)||
 notes.length>800||(attendees!==null&&(!Number.isInteger(attendees)||attendees<1||attendees>100000))||
 (date!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(date)))return fail('Confira os campos do formulário.',400);
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const abuseKey=createHmac('sha256',secret).update(ip).digest('hex');
 try {
  const db=neon(dbUrl);
  const rows=await db`SELECT public.vitrine_receive_lead(${org}::uuid,${name},${institution},
   ${city},${phone},${audience},${attendees},${date||null}::date,${notes},${abuseKey}) AS id`;
  return NextResponse.json({ok:true,id:rows[0]?.id,message:'Solicitação recebida para análise.'},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{
  return fail('Não foi possível registrar o pedido agora. Use o WhatsApp ou copie a mensagem.',503);
 }
}
