import 'server-only';
import {NextRequest,NextResponse} from 'next/server';
import {getTeamWriteDb} from './auth';

/** Todas as operações de Agenda continuam fail-closed até a liberação explícita. */
export async function assertAgendaWriteAllowed(req:NextRequest):Promise<NextResponse|null>{
 const deny=(error:string,status=503)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(process.env.ANTARES_AGENDA_WRITES_ENABLED!=='true')
  return deny('Gravações de agenda ainda não liberadas.');
 if(process.env.ANTARES_DB_RUNTIME_ROLE!=='antares_team_runtime'||!process.env.DATABASE_URL_TEAM_RUNTIME)
  return deny('Papel operacional não configurado.');
 const configured=process.env.ANTARES_APP_ORIGIN;
 try{
  if(!configured||new URL(configured).origin!==req.headers.get('origin')||
     new URL(configured).host!==req.headers.get('host'))return deny('Origem inválida.',403);
 }catch{return deny('Origem inválida.',403);}
 if(req.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return deny('Envie JSON.',415);
 try{
  const sql=getTeamWriteDb();
  const rows=await sql`SELECT current_user AS runtime_role,
      r.rolcanlogin AS can_login,r.rolsuper AS is_super,r.rolbypassrls AS bypass_rls,
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
  const a=rows[0];
  if(!a||a.runtime_role!=='antares_team_runtime'||a.can_login!==true||
     a.is_super!==false||a.bypass_rls!==false||
     Number(a.functions_ok)!==4||a.tables_ok!==true)
    return deny('Permissões de agenda não homologadas.');
 }catch{return deny('Não foi possível validar o isolamento do banco.');}
 return null;
}
