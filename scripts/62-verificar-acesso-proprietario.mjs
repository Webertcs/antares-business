// ANTARES 62 — diagnóstico exclusivamente de leitura do acesso do proprietário.
// Uso: node --env-file=.env.local scripts/62-verificar-acesso-proprietario.mjs
// Não cria contas, não define senhas e não modifica o banco.
import { neon } from '@neondatabase/serverless';

const email = 'antaresplanetario@gmail.com';
if (!process.env.DATABASE_URL) {
  console.error('BLOQUEADO | DATABASE_URL não encontrada. Nenhum dado foi alterado.');
  process.exitCode = 1;
} else {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const [accounts, members] = await Promise.all([
      sql`SELECT id FROM neon_auth."user" WHERE lower(email) = ${email}`,
      sql`SELECT auth_subject, role, active FROM public.team_members WHERE lower(email) = ${email}`,
    ]);
    const authUnique = accounts.length === 1;
    const memberUnique = members.length === 1;
    const ownerActive = memberUnique && members[0].role === 'owner' && members[0].active === true;
    const linked = authUnique && memberUnique &&
      String(members[0].auth_subject) === String(accounts[0].id);

    console.log('Neon Auth: ' + (authUnique ? '1 conta encontrada' : accounts.length + ' contas encontradas'));
    console.log('Equipe: ' + (memberUnique ? '1 vínculo encontrado' : members.length + ' vínculos encontrados'));
    console.log('Perfil de proprietário ativo: ' + (ownerActive ? 'SIM' : 'NÃO'));
    console.log('Vínculo com a conta Auth: ' + (linked ? 'CORRETO' : 'NÃO CONFIRMADO'));
    if (authUnique && ownerActive && linked) {
      console.log('APTO | O proprietário pode solicitar redefinição da senha pelo login.');
    } else {
      console.error('BLOQUEADO | Conferir os vínculos antes de liberar o acesso. Não executar o script 61 novamente.');
      process.exitCode = 1;
    }
  } catch {
    console.error('BLOQUEADO | Não foi possível conferir o acesso somente leitura. Nenhum dado foi alterado.');
    process.exitCode = 1;
  }
}
