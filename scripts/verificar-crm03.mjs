// Bloco 03: diagnóstico somente leitura, nunca modifica o Neon.
import { neon } from '@neondatabase/serverless';
const url=process.env.DATABASE_URL_TEAM_RUNTIME;
if (!url) { console.error('FALHOU: DATABASE_URL_TEAM_RUNTIME ausente.'); process.exitCode=1; }
else {
 try {
  const db=neon(url);
  const [row]=await db`
    SELECT current_user AS role,
      (SELECT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
       FROM pg_roles WHERE rolname=current_user) AS role_safe,
      (SELECT count(*)=3 FROM pg_class c
       WHERE c.oid IN ('public.crm_clients'::regclass,
         'public.crm_contacts'::regclass,'public.crm_events'::regclass)
        AND c.relrowsecurity AND c.relowner<>(SELECT oid FROM pg_roles WHERE rolname=current_user)
        AND NOT has_table_privilege(current_user,c.oid,'SELECT')
        AND NOT has_table_privilege(current_user,c.oid,'INSERT')
        AND NOT has_table_privilege(current_user,c.oid,'UPDATE')
        AND NOT has_table_privilege(current_user,c.oid,'DELETE')) AS tables_safe,
      (SELECT count(*)=3 FROM pg_proc p
       WHERE p.pronamespace='public'::regnamespace
         AND p.proname IN ('crm_save_client','crm_save_contact','crm_save_event')
         AND p.prosecdef
         AND pg_get_userbyid(p.proowner)='neondb_owner'
         AND has_function_privilege(current_user,p.oid,'EXECUTE')
         AND NOT EXISTS (
           SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
           WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'
         )) AS functions_safe`;
  const checks={
   'Papel runtime':row?.role==='antares_team_runtime',
   'Papel sem privilegios excessivos':row?.role_safe===true,
   'Tres tabelas com RLS e sem acesso direto':row?.tables_safe===true,
   'Tres funcoes autorizadas e sem acesso publico':row?.functions_safe===true
  };
  for(const [label,ok] of Object.entries(checks))console.log((ok?'OK':'FALHOU')+' — '+label);
  if(Object.values(checks).every(Boolean))
    console.log('PRONTO PARA TESTE FUNCIONAL CONTROLADO. O script nao fez nenhuma gravacao.');
  else { console.error('NAO LIBERAR AS FLAGS DO CRM.');process.exitCode=1; }
 } catch(e){console.error('FALHOU: conexao ou estrutura do CRM indisponivel.');process.exitCode=1;}
}
