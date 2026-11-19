import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function code(path){return readFileSync(new URL('../'+path,import.meta.url),'utf8');}

test('sessão: vínculo ativo deve ser único e identidade vem do servidor',()=>{
 const src=code('src/lib/equipe/auth.ts');
 assert.match(src,/auth\.getSession\(\)/);
 assert.match(src,/auth_subject\s*=\s*\$\{user\.id\}/);
 assert.match(src,/active\s*=\s*true/);
 assert.match(src,/memberships\.length\s*!==\s*1/);
 assert.match(src,/context\?\.role\s*===\s*'owner'/);
});

test('acesso técnico exige subject específico além de proprietário',()=>{
 const src=code('src/lib/equipe/auth.ts');
 assert.match(src,/ANTARES_DEVELOPER_SUBJECT/);
 assert.match(src,/requireOwner\(\)/);
 assert.match(src,/isDeveloperSubject\(owner\.user\.id\)/);
 const snapshot=code('src/app/api/oficina/snapshot/route.ts');
 assert.match(snapshot,/requireDeveloper\(\)/);
});

test('aceite da escola exige owner e validação de origem',()=>{
 const src=code('src/app/api/vitrine/proposta/aceite/route.ts');
 assert.match(src,/requireOwner\(\)/);
 assert.match(src,/headers\.get\('origin'\)/);
 assert.match(src,/ANTARES_CRM_WRITES_ENABLED/);
 assert.match(src,/getTeamWriteDb\(\)/);
});

test('recebimento público usa credencial específica e limite de requisição',()=>{
 const src=code('src/app/api/vitrine/solicitacoes/route.ts');
 assert.match(src,/DATABASE_URL_PUBLIC_INBOX/);
 assert.match(src,/ANTARES_LEAD_HASH_SECRET/);
 assert.match(src,/request\.headers\.get\('origin'\)/);
 assert.match(src,/raw\.length\s*>\s*5000/);
 assert.match(src,/body\.website/);
 assert.match(src,/safe_table/);
});

test('escritas financeiras exigem proprietário e papel operacional',()=>{
 for(const path of [
  'src/app/api/financeiro/receber/route.ts',
  'src/app/api/financeiro/estornar/route.ts'
 ]){
  const src=code(path);
  assert.match(src,/requireOwner\(\)/);
  assert.match(src,/getTeamWriteDb\(\)/);
  assert.match(src,/headers\.get\('origin'\)/);
 }
});
