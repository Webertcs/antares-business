// ANTARES 61 — cadastro local, único e restrito do proprietário real.
// Execução: node --env-file=.env.local scripts/61-criar-proprietario.mjs
// Nunca recebe a senha por argumento, variável de ambiente ou arquivo.
// Não altera a conta técnica, as cúpulas ou os dados do CRM.
import { createAuthClient } from '@neondatabase/auth';
import { neon } from '@neondatabase/serverless';

const email = 'antaresplanetario@gmail.com';
const name = 'ANTARES PLANETÁRIO';
const developer = process.env.ANTARES_DEVELOPER_SUBJECT;
const required = ['DATABASE_URL', 'NEON_AUTH_BASE_URL', 'ANTARES_DEVELOPER_SUBJECT'];
if (required.some(key => !process.env[key])) {
  console.error('BLOQUEADO | Variáveis obrigatórias ausentes no .env.local.');
  process.exit(1);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('BLOQUEADO | Execute em um terminal interativo local.');
  process.exit(1);
}
const db = neon(process.env.DATABASE_URL);

function senhaOculta(label) {
  return new Promise((resolve, reject) => {
    let secret = '';
    const priorRaw = Boolean(process.stdin.isRaw);
    process.stdout.write(label);
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    function finish(err) {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(priorRaw);
      process.stdin.pause();
      process.stdout.write('\n');
      if (err) reject(err);
      else resolve(secret);
    }
    function onData(chunk) {
      for (const character of String(chunk)) {
        if (character === '\r' || character === '\n') return finish(null);
        if (character === '\u0003') return finish(new Error('Operação cancelada pelo operador.'));
        if (character === '\u007f' || character === '\b') {
          if (secret) {
            secret = secret.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (character < ' ' || character === '\u001b') continue;
        if (secret.length < 128) {
          secret += character;
          process.stdout.write('*');
        }
      }
    }
    process.stdin.on('data', onData);
  });
}

async function main() {
  // Exigir o usuário técnico conhecido e vinculado à única organização.
  const orgs = await db`SELECT id FROM public.organizations`;
  const tech = await db`
    SELECT id, organization_id FROM public.team_members
    WHERE auth_subject = ${developer} AND role = 'owner' AND active = true
  `;
  if (orgs.length !== 1 || tech.length !== 1 ||
      String(tech[0].organization_id) !== String(orgs[0].id)) {
    throw new Error('Ambiente ou conta técnica divergente. Nada cadastrado.');
  }
  // Neon Auth e o CRM precisam referenciar a mesma base/branch.
  const knownTech = await db`SELECT id FROM neon_auth."user" WHERE id = ${developer}`;
  if (knownTech.length !== 1) {
    throw new Error('Neon Auth não corresponde ao usuário técnico do banco. Nada cadastrado.');
  }
  const members = await db`
    SELECT id FROM public.team_members WHERE lower(email) = ${email}
  `;
  const existingAuth = await db`
    SELECT id FROM neon_auth."user" WHERE lower(email) = ${email}
  `;
  if (members.length || existingAuth.length) {
    throw new Error('O e-mail já existe no Auth ou na Equipe. Não recrie nem promova automaticamente.');
  }
  console.log('PRÉ-CHECAGEM OK | Organização e administrador técnico conferidos.');
  console.log('Destino fixo: ' + email);
  console.log('O Neon Auth poderá exigir confirmação do e-mail pelo destinatário.');
  const answer = await new Promise(resolve => {
    process.stdout.write('Digite CRIAR para continuar: ');
    process.stdin.resume();
    process.stdin.once('data', buffer => {
      process.stdin.pause();
      resolve(String(buffer).trim());
    });
  });
  if (answer !== 'CRIAR') {
    console.log('Cancelado. Nenhuma conta criada.');
    return;
  }
  let password = await senhaOculta('Senha provisória (8 a 128 caracteres): ');
  let confirm = await senhaOculta('Repita a senha provisória: ');
  if (password.length < 8 || password.length > 128 || password !== confirm) {
    password = '';
    confirm = '';
    throw new Error('Senhas diferentes ou fora do limite de 8 a 128 caracteres. Nada criado.');
  }
  confirm = '';
  const auth = createAuthClient(process.env.NEON_AUTH_BASE_URL);
  let response;
  try {
    response = await auth.signUp.email({ name, email, password });
  } finally {
    password = '';
  }
  const newUser = response?.data?.user;
  if (response?.error || !newUser?.id || String(newUser.email).toLowerCase() !== email) {
    throw new Error('Neon Auth recusou ou não confirmou o cadastro. Confira o Better Auth antes de tentar novamente.');
  }
  // A operação Auth e o INSERT do CRM são sistemas separados. Em caso de falha,
  // NÃO repetir signUp e NÃO conceder owner a um e-mail pré-existente às cegas.
  const created = await db`
    INSERT INTO public.team_members
      (organization_id, auth_subject, full_name, email, role, active)
    SELECT ${orgs[0].id}::uuid, ${String(newUser.id)}, ${name},
           ${email}, 'owner', true
    WHERE EXISTS (
      SELECT 1 FROM public.team_members
      WHERE organization_id = ${orgs[0].id}::uuid
        AND auth_subject = ${developer} AND role = 'owner' AND active = true
    )
      AND NOT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE auth_subject = ${String(newUser.id)}
           OR lower(email) = ${email}
      )
    RETURNING id
  `;
  if (created.length !== 1) {
    throw new Error('Conta Auth criada, mas vínculo do CRM PENDENTE. Não repita o script; audite o vínculo.');
  }
  const check = await db`
    SELECT role, active FROM public.team_members
    WHERE auth_subject = ${String(newUser.id)} AND organization_id = ${orgs[0].id}::uuid
  `;
  if (check.length !== 1 || check[0].role !== 'owner' || check[0].active !== true) {
    throw new Error('Vínculo criado, mas validação falhou. Bloqueie a entrega e audite.');
  }
  console.log('APROVADO | Proprietário vinculado ao ANTARES.');
  console.log('A senha provisória não foi registrada no script, GitHub ou banco de aplicação.');
  console.log('Teste o login em janela anônima. Se exigir verificação, o destinatário precisa confirmar o e-mail.');
  console.log('Depois da entrega, o proprietário deve alterar a senha em Meu perfil.');
}

main().catch(err => {
  console.error('BLOQUEADO | ' + (err instanceof Error ? err.message : 'Falha desconhecida.'));
  process.exitCode = 1;
});
