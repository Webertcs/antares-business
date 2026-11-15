// ANTARES 53A — inventario SOMENTE LEITURA para limpeza de clientes.
// Execute: node --env-file=.env.local scripts/53a-dependencias-clientes.mjs
// Nao cria, edita nem apaga nada. Nao imprime dados pessoais de contato.
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL){console.error('PENDENTE | DATABASE_URL nao configurada');process.exit(1)}
try{
 const sql=neon(process.env.DATABASE_URL);
 const rows=await sql`
 SELECT c.id,c.name,c.status,
  (SELECT count(*)::int FROM public.crm_contacts t WHERE t.organization_id=c.organization_id AND t.client_id=c.id) AS contacts,
  (SELECT count(*)::int FROM public.crm_events e WHERE e.organization_id=c.organization_id AND e.client_id=c.id) AS events,
  (SELECT count(*)::int FROM public.business_proposals p WHERE p.organization_id=c.organization_id AND p.client_id=c.id) AS proposals,
  (SELECT count(*)::int FROM public.antares_education_groups g WHERE g.organization_id=c.organization_id AND g.client_id=c.id) AS groups,
  (SELECT count(*)::int FROM public.antares_client_links l WHERE l.organization_id=c.organization_id AND l.crm_client_id=c.id) AS operational_links,
  (SELECT count(*)::int FROM public.vitrine_leads v WHERE v.organization_id=c.organization_id AND v.converted_client_id=c.id) AS vitrine_leads
 FROM public.crm_clients c ORDER BY c.name
 `;
 console.log('ANTARES 53A | Dependencias de clientes (somente leitura)');
 for(const c of rows){
  const related=Number(c.contacts)+Number(c.events)+Number(c.proposals)+Number(c.groups)+Number(c.operational_links)+Number(c.vitrine_leads);
  console.log('CLIENTE | '+c.name+' | situacao='+c.status+' | contatos='+c.contacts+' | eventos='+c.events+' | propostas='+c.proposals+' | turmas='+c.groups+' | vinculos='+c.operational_links+' | vitrine='+c.vitrine_leads+' | '+(related?'EXCLUSAO PENDENTE':'SEM DEPENDENCIAS CONHECIDAS'));
 }
 console.log('ATENCAO | Dependencias adicionais podem existir por chaves estrangeiras ou historico de auditoria.');
 console.log('ATENCAO | Ausencia de dependencias conhecidas NAO autoriza exclusao automatica.');
 console.log('CONCLUIDO | '+rows.length+' cliente(s) analisado(s); 0 escritas.');
}catch{console.error('PENDENTE | Estrutura SQL divergente ou consulta indisponivel. Nenhum registro foi alterado.');process.exitCode=1}
