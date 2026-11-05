import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL_TEAM_RUNTIME) {
  console.error('DATABASE_URL_TEAM_RUNTIME ausente.');
  process.exitCode = 1;
} else {
  const db = neon(process.env.DATABASE_URL_TEAM_RUNTIME);
  const results = [];
  const check = async (name, fn, expectation) => {
    try {
      const rows = await fn();
      const ok = expectation(rows, null);
      results.push({ teste: name, status: ok ? 'APROVADO' : 'FALHOU' });
    } catch (error) {
      const ok = expectation(null, error);
      results.push({ teste: name, status: ok ? 'APROVADO' : 'FALHOU' });
    }
  };
  await check('Conexão utiliza antares_team_runtime', () => db`SELECT current_user AS role`,
    rows => rows?.[0]?.role === 'antares_team_runtime');
  await check('Sem acesso direto ao livro caixa', () => db`SELECT id FROM public.ledger_entries LIMIT 1`,
    (_, error) => error?.code === '42501');
  await check('Sem acesso ao segredo', () => db`SELECT secret FROM public.antares_finance_capability LIMIT 1`,
    (_, error) => error?.code === '42501');
  await check('Credencial inválida é rejeitada', () => db`
    SELECT * FROM public.antares_post_ledger_entry(
      ${'0'.repeat(64)}, 'nao-autorizado', ${'00000000-0000-0000-0000-000000000000'},
      ${'00000000-0000-4000-8000-000000000001'}, 'income',
      1, 'TESTE SEM GRAVACAO', ${'2026-10-31'}, null
    )`,
    (_, error) => error?.code === 'P0001' && String(error.message).includes('Capacidade financeira inválida'));
  console.table(results);
  const passed = results.every(r => r.status === 'APROVADO');
  console.log(passed ? 'Testes negativos concluídos; gravações continuam bloqueadas.' : 'Falhas encontradas: NÃO habilite gravações.');
  if (!passed) process.exitCode = 1;
}
