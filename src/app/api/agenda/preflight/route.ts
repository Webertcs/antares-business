import {NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const noStore={'Cache-Control':'private, no-store'};

export async function GET(){
 try{
  const owner=await requireOwner();
  if(!owner)return NextResponse.json({error:'Acesso restrito ao proprietário'},{status:403,headers:noStore});
  const expected=process.env.ANTARES_APP_ORIGIN;
  const originConfigured=!!expected&&(()=>{try{const u=new URL(expected);return u.protocol==='http:'||u.protocol==='https:'}catch{return false}})();
  const roleConfigured=process.env.ANTARES_DB_RUNTIME_ROLE==='antares_team_runtime'&&!!process.env.DATABASE_URL_TEAM_RUNTIME;
  let runtimeOk=false;
  if(roleConfigured){
   const db=getTeamWriteDb();
   const rows=await db`SELECT current_user AS runtime_role,r.rolsuper AS is_super,r.rolbypassrls AS bypass_rls,
      (SELECT count(*)::int FROM pg_proc p WHERE p.oid IN(
       'public.antares_prepare_proposal_client(text,uuid,uuid)'::regprocedure,
       'public.antares_create_linked_dome(text,uuid,text,text,integer)'::regprocedure,
       'public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)'::regprocedure,
       'public.antares_manage_linked_dome(text,uuid,uuid,text,text,text,integer)'::regprocedure
      ) AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
       AND has_function_privilege(r.oid,p.oid,'EXECUTE')
       AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')
      ) AS functions_ok,
      (SELECT bool_and(c.relrowsecurity AND c.relowner<>r.oid
       AND NOT has_table_privilege(r.oid,c.oid,'SELECT')
       AND NOT has_table_privilege(r.oid,c.oid,'INSERT')
       AND NOT has_table_privilege(r.oid,c.oid,'UPDATE')
       AND NOT has_table_privilege(r.oid,c.oid,'DELETE'))
       FROM pg_class c WHERE c.oid IN(
        'public.antares_domes'::regclass,'public.equipment'::regclass,
        'public.antares_dome_links'::regclass,'public.antares_client_links'::regclass,
        'public.antares_proposal_reservations'::regclass,'public.clients'::regclass,
        'public.presentations'::regclass)
      ) AS tables_ok
      FROM pg_roles r WHERE r.rolname=current_user`;
   const x=rows[0];
   runtimeOk=!!x&&x.runtime_role==='antares_team_runtime'&&x.is_super===false&&x.bypass_rls===false&&Number(x.functions_ok)===4&&x.tables_ok===true;
  }
  const ready=originConfigured&&roleConfigured&&runtimeOk;
  return NextResponse.json({authenticatedOwner:true,originConfigured,roleConfigured,runtimeOk,
   writesEnabled:process.env.ANTARES_AGENDA_WRITES_ENABLED==='true',
   readyForControlledTest:ready,
   note:ready?'Pré-requisitos técnicos confirmados. Ainda é necessário homologar a gravação real de forma controlada.':'Verifique os pré-requisitos antes de habilitar gravações.'},{headers:noStore});
 }catch{
  return NextResponse.json({error:'Não foi possível concluir o pré-voo autenticado.'},{status:503,headers:noStore});
 }
}
