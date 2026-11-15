// ANTARES - teste de conexão restrita sem exibir credenciais nem consultar dados.
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import { neon } from '@neondatabase/serverless';
loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL_TEAM_RUNTIME;
if (!url) {
  console.error('PENDENTE: DATABASE_URL_TEAM_RUNTIME não configurada no .env.local.');
  process.exitCode = 2;
} else {
  try {
    const sql = neon(url);
    const rows = await sql`
      SELECT current_user AS role_name,
             (SELECT rolcanlogin FROM pg_roles WHERE rolname=current_user) AS login_enabled,
             (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS bypass_rls,
             (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,
             has_table_privilege(current_user,'public.team_members','SELECT') AS can_read_members,
             has_table_privilege(current_user,'public.team_members','UPDATE') AS can_update_members,
             has_function_privilege(current_user,
               'public.issue_team_invitation(text,text,text,text)','EXECUTE') AS can_issue,
             has_function_privilege(current_user,
               'public.accept_team_invitation(text,text,text)','EXECUTE') AS can_accept,
             has_function_privilege(current_user,
               'public.revoke_team_invitation(text,uuid)','EXECUTE') AS can_revoke,
             has_function_privilege(current_user,
               'public.suspend_team_collaborator(text,uuid)','EXECUTE') AS can_suspend
    `;
    const x=rows[0];
    const ok=x?.role_name==='antares_team_runtime' && x.login_enabled===true &&
      x.bypass_rls===false && x.superuser===false &&
      x.can_read_members===false && x.can_update_members===false &&
      x.can_issue===true && x.can_accept===true && x.can_revoke===true && x.can_suspend===true;
    console.log(ok ? 'PASSOU: role restrita e funções autorizadas; nenhuma escrita foi realizada.' :
      'BLOQUEADO: permissões da conexão não correspondem à política restrita.');
    if (!ok) {
      const checks = {
        role_correta: x?.role_name === 'antares_team_runtime',
        login_ativo: x?.login_enabled === true,
        sem_bypass_rls: x?.bypass_rls === false,
        sem_superusuario: x?.superuser === false,
        sem_select_direto: x?.can_read_members === false,
        sem_update_direto: x?.can_update_members === false,
        executar_emitir: x?.can_issue === true,
        executar_aceitar: x?.can_accept === true,
        executar_revogar: x?.can_revoke === true,
        executar_suspender: x?.can_suspend === true
      };
      for (const [name, passed] of Object.entries(checks))
        console.log((passed ? 'OK: ' : 'FALHA: ') + name);
      process.exitCode=1;
    }
  } catch {
    console.error('BLOQUEADO: conexão falhou ou o papel não tem permissão de inspeção.');
    process.exitCode=1;
  }
}
