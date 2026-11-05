// ANTARES 49A — auditoria SOMENTE LEITURA do papel runtime de Agenda.
// Execute: node --env-file=.env.local scripts/49a-agenda-permissoes.mjs
// Nao imprime credenciais, IDs, nomes de clientes, nem altera o banco.
import {neon} from '@neondatabase/serverless';

const uri=process.env.DATABASE_URL_TEAM_RUNTIME;
if(!uri){console.error('FALHOU: DATABASE_URL_TEAM_RUNTIME ausente.');process.exit(1);}
const sql=neon(uri);
let fail=0;
const check=(label,ok)=>{console.log((ok?'APROVADO':'FALHOU')+' | '+label);if(!ok)fail++};
try{
 const rows=await sql`
 SELECT current_user AS role_name, r.rolcanlogin AS can_login,
   r.rolsuper AS is_super, r.rolbypassrls AS bypass_rls,
   (SELECT count(*)::int FROM pg_proc p
    WHERE p.oid IN (
      'public.antares_prepare_proposal_client(text,uuid,uuid)'::regprocedure,
      'public.antares_create_linked_dome(text,uuid,text,text,integer)'::regprocedure,
      'public.antares_book_proposal(text,uuid,uuid,uuid,timestamptz,timestamptz)'::regprocedure,
       'public.antares_manage_linked_dome(text,uuid,uuid,text,text,text,integer)'::regprocedure
    ) AND p.prosecdef
      AND pg_get_userbyid(p.proowner)='neondb_owner'
      AND has_function_privilege(r.oid,p.oid,'EXECUTE')
      AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE')
   ) AS allowed_functions,
   (SELECT bool_and(c.relrowsecurity AND NOT c.relowner=r.oid
     AND NOT has_table_privilege(r.oid,c.oid,'SELECT')
     AND NOT has_table_privilege(r.oid,c.oid,'INSERT')
     AND NOT has_table_privilege(r.oid,c.oid,'UPDATE')
     AND NOT has_table_privilege(r.oid,c.oid,'DELETE'))
    FROM pg_class c WHERE c.oid IN (
     'public.antares_domes'::regclass,
     'public.equipment'::regclass,
     'public.antares_dome_links'::regclass,
     'public.antares_client_links'::regclass,
     'public.antares_proposal_reservations'::regclass,
     'public.clients'::regclass,
     'public.presentations'::regclass
    )) AS no_table_access
 FROM pg_roles r WHERE r.rolname=current_user
 `;
 const row=rows[0];
 check('Papel runtime limitado',row?.role_name==='antares_team_runtime'&&row?.can_login===true&&row?.is_super===false&&row?.bypass_rls===false);
 check('Sem acesso direto às tabelas operacionais',row?.no_table_access===true);
 check('Quatro funções protegidas com EXECUTE restrito',Number(row?.allowed_functions)===4);
 console.log(fail?'BLOQUEADO | Nao habilitar gravacoes de Agenda.':'APROVADO | Permissoes verificadas somente por leitura. Falta homologar HTTP autenticado e gravacao real controlada.');
}catch{console.error('FALHOU | Nao foi possivel verificar as permissoes; nenhuma gravacao realizada.');fail++;}
if(fail)process.exitCode=1;
