// Verificações estáticas do isolamento das duas escritas legadas.
// Não substituem ensaios autenticados, análise de grants nem migração Neon.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('PATCH de Agenda nao atualiza tabelas pela DATABASE_URL',()=>{
 const route=file('src/app/api/agenda/route.ts');
 const patch=route.slice(route.indexOf('export async function PATCH'));
 assert.doesNotMatch(patch,/getDb\s*\(/);
 assert.doesNotMatch(patch,/UPDATE\s+public\.crm_events/i);
 assert.match(patch,/getTeamWriteDb\(\)/);
 assert.match(patch,/ANTARES_AGENDA_WRITES_ENABLED/);
 assert.match(patch,/antares_update_unlinked_event_schedule/);
 assert.match(patch,/has_function_privilege/);
});

test('POST dos dados juridicos usa apenas funcao restrita',()=>{
 const route=file('src/app/api/clientes/contratos/dados-juridicos/route.ts');
 const post=route.slice(route.indexOf('export async function POST'));
 assert.doesNotMatch(post,/getDb\s*\(/);
 assert.doesNotMatch(post,/INSERT\s+INTO\s+public\.antares_legal_profiles/i);
 assert.match(post,/getTeamWriteDb\(\)/);
 assert.match(post,/ANTARES_LEGAL_PROFILE_WRITES_ENABLED/);
 assert.match(post,/antares_save_legal_profile/);
 assert.match(post,/has_function_privilege/);
});

test('migracao proposta restringe EXECUTE e exige owner por organizacao',()=>{
 const sql=file('scripts/63-segregacao-escritas-homologacao.sql');
 assert.match(sql,/BEGIN;/);
 assert.match(sql,/SECURITY DEFINER/g);
 assert.match(sql,/organization_id=p_org AND auth_subject=p_subject/g);
 assert.match(sql,/REVOKE ALL ON FUNCTION/g);
 assert.match(sql,/TO antares_team_runtime/g);
 assert.match(sql,/NOT EXISTS\s*\(\s*SELECT 1 FROM public\.antares_presentation_event_links/g);
});
