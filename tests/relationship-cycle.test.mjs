import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/fidelizacao/relationship-cycle.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {relationshipCycle}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const visit=(date,status='confirmed')=>({event_date:date,status});
test('sem visitas: não dispara alerta de retorno',()=>{
 assert.deepEqual(relationshipCycle([], '2026-11-07'),{visits:0,lastDate:null,days:null,alert:'first_visit'});
});
test('evento verde futuro não inicia contagem',()=>{
 assert.equal(relationshipCycle([visit('2026-11-08')],'2026-11-07').visits,0);
});
test('evento verde hoje conta uma visita sem alerta',()=>{
 assert.deepEqual(relationshipCycle([visit('2026-11-07')],'2026-11-07'),{visits:1,lastDate:'2026-11-07',days:0,alert:'ok'});
});
test('59, 60, 89 e 90 dias: limites corretos',()=>{
 const today='2026-11-07';
 for(const [days,expected] of [[59,'ok'],[60,'warning'],[89,'warning'],[90,'critical']]){
  const d=new Date(Date.parse(today+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);
  const result=relationshipCycle([visit(d)],today);
  assert.equal(result.days,days);
  assert.equal(result.alert,expected);
 }
});
test('nova visita reinicia contagem',()=>{
 const result=relationshipCycle([visit('2026-01-01'),visit('2026-11-01')],'2026-11-07');
 assert.equal(result.visits,2);assert.equal(result.days,6);assert.equal(result.alert,'ok');
});
test('cancelado e reservado não contam',()=>{
 assert.equal(relationshipCycle([visit('2026-01-01','cancelled'),visit('2026-02-01','reserved')],'2026-11-07').visits,0);
});
test('data inválida não conta',()=>{
 assert.equal(relationshipCycle([visit('2026-02-30')],'2026-11-07').visits,0);
});
test('concluído também conta',()=>{
 assert.equal(relationshipCycle([visit('2026-11-01','completed')],'2026-11-07').visits,1);
});
