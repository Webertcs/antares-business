import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.',403);
 const clientId=new URL(req.url).searchParams.get('clientId');
 if(!clientId||!uuid.test(clientId))return fail('Cliente inválido.');
 try{
 const db=getDb();
 const rows=await db`SELECT p.client_id,p.legal_name,p.document_number,p.full_address,p.representative
 FROM public.antares_legal_profiles p
 WHERE p.organization_id=${owner.organizationId}
 AND (p.client_id IS NULL OR p.client_id=${clientId}::uuid)
 AND (p.client_id IS NULL OR EXISTS(SELECT 1 FROM public.crm_clients c WHERE c.id=p.client_id AND c.organization_id=p.organization_id))`;
 return NextResponse.json({provider:rows.find(r=>r.client_id===null)||null,contractor:rows.find(r=>String(r.client_id)===clientId)||null},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return fail('Não foi possível consultar os dados jurídicos.',503);}
}
export async function POST(req:NextRequest){
 const owner=await requireOwner();if(!owner)return fail('Somente proprietário.',403);
 let origin:string;try{origin=new URL(process.env.ANTARES_APP_ORIGIN||'').origin;}catch{return fail('Origem não configurada.',503);}
 if(req.headers.get('origin')!==origin)return fail('Origem não autorizada.',403);
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido.',415);
 if(Number(req.headers.get('content-length')||0)>8000)return fail('Requisição muito grande.',413);
 try{
 const b=await req.json();
 if(!b||typeof b!=='object'||!['provider','contractor'].includes(b.kind)||typeof b.clientId!=='string'||!uuid.test(b.clientId)||
 ![['legal_name',240],['document_number',30],['full_address',500],['representative',180]].every(([k,max])=>typeof b[k as string]==='string'&&(b[k as string] as string).length<=Number(max)))return fail('Dados inválidos.');
 const db=getDb();
 const exists=await db`SELECT 1 FROM public.crm_clients WHERE id=${b.clientId}::uuid AND organization_id=${owner.organizationId} LIMIT 1`;
 if(!exists.length)return fail('Cliente não autorizado.',403);
 const rows=b.kind==='provider'
 ?await db`INSERT INTO public.antares_legal_profiles(organization_id,client_id,legal_name,document_number,full_address,representative)
 VALUES(${owner.organizationId}::uuid,NULL,${b.legal_name.trim()},${b.document_number.trim()},${b.full_address.trim()},${b.representative.trim()})
 ON CONFLICT (organization_id) WHERE client_id IS NULL DO UPDATE
 SET legal_name=excluded.legal_name,document_number=excluded.document_number,full_address=excluded.full_address,representative=excluded.representative,updated_at=now() RETURNING id`
 :await db`INSERT INTO public.antares_legal_profiles(organization_id,client_id,legal_name,document_number,full_address,representative)
 VALUES(${owner.organizationId}::uuid,${b.clientId}::uuid,${b.legal_name.trim()},${b.document_number.trim()},${b.full_address.trim()},${b.representative.trim()})
 ON CONFLICT (organization_id,client_id) WHERE client_id IS NOT NULL DO UPDATE
 SET legal_name=excluded.legal_name,document_number=excluded.document_number,full_address=excluded.full_address,representative=excluded.representative,updated_at=now() RETURNING id`;
 return NextResponse.json({id:rows[0]?.id},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('[ANTARES][legal-profile]',e instanceof Error?e.message:'Erro');return fail('Não foi possível salvar os dados jurídicos.',503);}
}
