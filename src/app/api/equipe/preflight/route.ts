import {NextResponse} from 'next/server';
import {requireOwner,getTeamWriteDb} from '@/lib/equipe/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

export async function GET(){
 try{
  const owner=await requireOwner();
  if(!owner)return NextResponse.json({error:'Somente proprietário'},{status:403,headers});
  const configured=process.env.ANTARES_APP_ORIGIN;
  let originConfigured=false;
  try{if(configured){const url=new URL(configured);originConfigured=(url.protocol==='http:'||url.protocol==='https:')&&url.pathname==='/'&&url.search===''&&url.hash==='';}}catch{}
  const roleConfigured=process.env.ANTARES_DB_RUNTIME_ROLE==='antares_team_runtime'&&!!process.env.DATABASE_URL_TEAM_RUNTIME;
  let roleOk=false,tablesRestricted=false,functionsOk=false;
  if(roleConfigured){
   const sql=getTeamWriteDb();
   const rows=await sql`SELECT
    current_user AS runtime_role,r.rolcanlogin,r.rolsuper,r.rolbypassrls,
    (SELECT count(*)::int FROM pg_class c WHERE c.oid IN(
     'public.organizations'::regclass,'public.team_members'::regclass,
     'public.team_invitations'::regclass,'public.team_security_events'::regclass
    ) AND c.relrowsecurity AND c.relowner<>r.oid
     AND NOT has_table_privilege(r.oid,c.oid,'SELECT')
     AND NOT has_table_privilege(r.oid,c.oid,'INSERT')
     AND NOT has_table_privilege(r.oid,c.oid,'UPDATE')
     AND NOT has_table_privilege(r.oid,c.oid,'DELETE')) AS restricted_count,
    (SELECT count(*)::int FROM pg_proc p WHERE p.oid IN(
     'public.issue_team_invitation(text,text,text,text)'::regprocedure,
     'public.accept_team_invitation(text,text,text)'::regprocedure,
     'public.revoke_team_invitation(text,uuid)'::regprocedure,
     'public.suspend_team_collaborator(text,uuid)'::regprocedure
    ) AND p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
     AND has_function_privilege(r.oid,p.oid,'EXECUTE')
     AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
      WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')) AS function_count
    FROM pg_roles r WHERE r.rolname=current_user`;
   const x=rows[0];
   roleOk=!!x&&x.runtime_role==='antares_team_runtime'&&x.rolcanlogin===true&&x.rolsuper===false&&x.rolbypassrls===false;
   tablesRestricted=Number(x?.restricted_count)===4;
   functionsOk=Number(x?.function_count)===4;
  }
  const readyForControlledTest=originConfigured&&roleConfigured&&roleOk&&tablesRestricted&&functionsOk;
  return NextResponse.json({authenticatedOwner:true,originConfigured,roleConfigured,roleOk,
   tablesRestricted,functionsOk,writesEnabled:process.env.ANTARES_TEAM_WRITES_ENABLED==='true',
   readyForControlledTest,
   note:readyForControlledTest?'Pré-requisitos verificados apenas por leitura. Convite real ainda não homologado.':'Convites bloqueados até sanar os pré-requisitos.'},{headers});
 }catch{return NextResponse.json({error:'Pré-voo de equipe indisponível; nenhuma alteração realizada.'},{status:503,headers})}
}
