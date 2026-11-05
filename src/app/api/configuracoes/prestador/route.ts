import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';export const runtime='nodejs';
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const owner=await requireOwner();if(!owner)return fail('Acesso exclusivo do proprietário',403);
 try{const db=getDb();const q=await db`SELECT legal_name AS name,tax_id AS document,address,representative
 FROM public.antares_provider_profiles WHERE organization_id=${owner.organizationId}`;
 return NextResponse.json({profile:q[0]||null},{headers:{'Cache-Control':'private, no-store'}});}
 catch{return fail('Execute a migração 14 antes de consultar os dados do prestador',503);}
}
export async function POST(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Acesso exclusivo do proprietário',403);
 if(process.env.ANTARES_PROVIDER_WRITES_ENABLED!=='true')return fail('Cadastro do prestador bloqueado até homologação',503);
 const origin=req.headers.get('origin'),host=req.headers.get('host');
 try{if(!origin||!host||new URL(origin).host!==host)return fail('Origem inválida',403);}catch{return fail('Origem inválida',403);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido',415);
 try{
 const x=await req.json(),fields=['name','document','address','representative'] as const;
 if(!x||fields.some(k=>typeof x[k]!=='string'||x[k].trim().length<2||x[k].length>300)
 ||x.document.trim().length<11||x.document.trim().length>20||x.address.trim().length<5)return fail('Dados inválidos',400);
 const db=getTeamWriteDb();await db`SELECT public.antares_save_provider_profile(${owner.user.id},${owner.organizationId}::uuid,
 ${x.name},${x.document},${x.address},${x.representative})`;
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Não foi possível salvar o cadastro',409);}
}
