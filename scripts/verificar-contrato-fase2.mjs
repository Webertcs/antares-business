import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
// Verificação estática: não conecta ao Neon, não altera tabelas.
const sql=readFileSync(new URL('../sql/04_IMPLANTACAO_CONSOLIDADA_V1.sql',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/app/api/business/gravar/route.ts',import.meta.url),'utf8');
const snapshot=readFileSync(new URL('../src/app/api/oficina/snapshot/route.ts',import.meta.url),'utf8');
const tables=['business_proposals','business_contracts','business_domes','business_bookings','business_ledger','business_audit'];
const funcs=['business_create_proposal','business_create_contract','business_create_dome','business_create_booking','business_create_ledger_entry'];
for(const table of tables){
 assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.'+table+' ('),'Tabela ausente: '+table);
 assert.ok(sql.includes('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY'),'RLS ausente: '+table);
 if(table!=='business_audit')assert.ok(snapshot.includes('public.'+table),'Leitura ausente: '+table);
}
for(const name of funcs){
 assert.ok(sql.includes('FUNCTION public.'+name+'('),'Função ausente: '+name);
 assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.'+name+'('),'Revoke ausente: '+name);
 assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.'+name+'('),'Grant ausente: '+name);
 assert.ok(api.includes('public.'+name+'('),'API desassociada: '+name);
}
assert.ok(sql.includes('business_booking_no_overlap'),'Proteção de agenda ausente');
assert.ok(sql.includes('DO $guard$'),'Proteção idempotente ausente');
assert.ok(api.includes('ANTARES_V1_WRITES_ENABLED')&&api.includes('ANTARES_V1_SECURITY_APPROVED'),'Flags ausentes');
assert.ok(api.includes("request.headers.get('origin')"),'Verificação de origem ausente');
console.log('Contrato estático da migração 04 e das cinco ações comerciais: OK');
