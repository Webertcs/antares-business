// ANTARES — diagnóstico compacto da Agenda em produção, somente leitura.
// Execute: node --env-file=.env.local scripts/14-agenda-esquema.mjs
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL){console.error('DATABASE_URL ausente');process.exit(1);}
const db=neon(process.env.DATABASE_URL);
const tables=['presentations','antares_domes','crm_events','business_proposals'];
try{
 const columns=await db`SELECT table_name,column_name,data_type,is_nullable,column_default
 FROM information_schema.columns WHERE table_schema='public'
 AND table_name IN ('presentations','antares_domes','crm_events','business_proposals')
 ORDER BY table_name,ordinal_position`;
 const constraints=await db`SELECT conrelid::regclass::text AS tabela,conname AS nome,
 contype AS tipo,pg_get_constraintdef(oid) AS definicao FROM pg_constraint
 WHERE conrelid IN ('public.presentations'::regclass,'public.antares_domes'::regclass)
 ORDER BY conrelid::regclass::text,conname`;
 for(const name of tables){
  console.log('\n### '+name);
  for(const c of columns.filter(x=>x.table_name===name)){
   console.log(c.column_name+' | '+c.data_type+' | '+(c.is_nullable==='NO'?'OBRIGATORIO':'opcional')+
   (c.column_default?' | default':''));
  }
 }
 console.log('\n### Restrições da Agenda');
 for(const c of constraints)console.log(c.tabela+' | '+c.nome+' | '+c.definicao);
 console.log('\nAPROVADO: apenas metadados consultados, nenhum dado de cliente ou credencial exibido.');
}catch(e){console.error('FALHOU:',e instanceof Error?e.message:'erro');process.exitCode=1;}
