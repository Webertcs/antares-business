import {NextRequest,NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';

export const dynamic='force-dynamic';
export const runtime='nodejs';

const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
const onlyDigits=(v:string)=>v.replace(/\D/g,'');

export async function GET(){
 const owner=await requireOwner();
 if(!owner)return fail('Acesso exclusivo do proprietário',403);
 try{
  const db=getDb();
  // to_jsonb preserva compatibilidade com o banco antes da migração do telefone.
  const q=await db`SELECT p.legal_name AS name,p.tax_id AS document,p.address,p.representative,
    COALESCE(to_jsonb(p)->>'contact_phone','') AS phone
    FROM public.antares_provider_profiles AS p
    WHERE p.organization_id=${owner.organizationId}`;
  return NextResponse.json({profile:q[0]||null},{headers:{'Cache-Control':'private, no-store'}});
 }catch{
  return fail('Não foi possível consultar os dados da empresa.',503);
 }
}

export async function POST(req:NextRequest){
 const owner=await requireOwner();
 if(!owner)return fail('Acesso exclusivo do proprietário',403);
 if(process.env.ANTARES_PROVIDER_WRITES_ENABLED!=='true')return fail('Cadastro da empresa temporariamente bloqueado.',503);
 const origin=req.headers.get('origin'),host=req.headers.get('host');
 try{if(!origin||!host||new URL(origin).host!==host)return fail('Origem inválida',403);}
 catch{return fail('Origem inválida',403);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return fail('Formato inválido',415);
 if(Number(req.headers.get('content-length')||0)>4096)return fail('Dados muito grandes',413);
 let x:Record<string,unknown>;
 try{x=await req.json();}
 catch{return fail('JSON inválido',400);}
 const fields=['name','document','address','representative','phone'] as const;
 if (
  !x ||
  typeof x !== 'object' ||
  fields.some(k => typeof x[k] !== 'string' || (x[k] as string).trim().length < 2 || (x[k] as string).length > 300) ||
  (x.address as string).trim().length < 5
 ) return fail('Preencha os dados obrigatórios.',400);

 const doc=onlyDigits(x.document as string);
 const phone=onlyDigits(x.phone as string);
 if(doc.length!==11&&doc.length!==14)return fail('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.',400);
 if(phone.length!==10&&phone.length!==11)return fail('Telefone precisa ter DDD e 10 ou 11 dígitos.',400);

 const p=x.phone as string;
 if(!/^[(][0-9]{2}[)] [0-9]{4,5}-[0-9]{4}$/.test(p))return fail('Telefone fora do formato brasileiro.',400);
 try{
  const db=getTeamWriteDb();
  const check=await db`SELECT
   EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a
     WHERE a.attrelid='public.antares_provider_profiles'::regclass
       AND a.attname='contact_phone' AND NOT a.attisdropped) AS has_column,
   EXISTS(SELECT 1 FROM pg_catalog.pg_proc p
     WHERE p.oid=to_regprocedure('public.antares_save_provider_phone(text,uuid,text)')
       AND p.prosecdef
       AND pg_catalog.pg_get_userbyid(p.proowner)='neondb_owner'
       AND pg_catalog.has_function_privilege(current_user,p.oid,'EXECUTE')
       AND NOT EXISTS(
         SELECT 1 FROM pg_catalog.aclexplode(
           coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
         WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) AS has_function`;
  if(!check[0]?.has_column||!check[0]?.has_function)
   return fail('Telefone ainda não habilitado no Neon. Execute a migração 20261113-provider-contact-phone.sql.',503);

  // As duas operações fazem parte da MESMA instrução SQL (atômica).
  const saved=await db`WITH provider_write AS MATERIALIZED (
    SELECT public.antares_save_provider_profile(
     ${owner.user.id},${owner.organizationId}::uuid,
     ${(x.name as string).trim()},${(x.document as string).trim()},
     ${(x.address as string).trim()},${(x.representative as string).trim()}) AS write_result
   )
   SELECT public.antares_save_provider_phone(
     ${owner.user.id}::text,${owner.organizationId}::uuid,${p}) AS phone_saved
   FROM provider_write`;
  if(saved[0]?.phone_saved!==true)return fail('Não foi possível confirmar o salvamento.',409);
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('[ANTARES][prestador]',e instanceof Error?e.message:'Erro de gravação');
  return fail('Não foi possível salvar os dados da empresa. Confira o telefone e a migração do Neon.',409);
 }
}
