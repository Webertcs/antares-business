// ANTARES 14D - verificacao estrutural e de correspondencia, somente leitura.
// node --env-file=.env.local scripts/14d-correspondencia-agenda.mjs
import {neon} from '@neondatabase/serverless';
const sql=neon(process.env.DATABASE_URL);
const tables=['clients','equipment','quotes','presentations','crm_clients','antares_domes','business_proposals','antares_proposal_reservations'];
const rows=await sql`SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns
 WHERE table_schema='public' AND table_name=ANY(${tables})
 ORDER BY table_name,ordinal_position`;
for(const table of tables){console.log('\n### '+table);
for(const col of rows.filter(x=>x.table_name===table))console.log(col.column_name+' | '+col.data_type+' | '+(col.is_nullable==='NO'?'obrigatorio':'opcional'));}
const counts=await sql`SELECT
 (SELECT count(*)::int FROM public.business_proposals WHERE status='accepted') AS accepted,
 (SELECT count(*)::int FROM public.clients) AS legacy_clients,
 (SELECT count(*)::int FROM public.equipment WHERE category='dome') AS legacy_domes,
 (SELECT count(*)::int FROM public.antares_domes WHERE active) AS new_domes,
 (SELECT count(*)::int FROM public.antares_proposal_reservations) AS linked`;
console.log('\n### Totais sem dados pessoais\n'+JSON.stringify(counts[0]));
console.log('APROVADO: nenhuma alteracao realizada.');
