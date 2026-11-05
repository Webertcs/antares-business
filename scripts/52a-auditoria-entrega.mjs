// ANTARES 52A — auditoria final SOMENTE LEITURA.
// Uso: node --env-file=.env.local scripts/52a-auditoria-entrega.mjs
// Mostra apenas contagens, sinalizadores e pendencias. Nenhuma escrita e executada.
import {neon} from '@neondatabase/serverless';
const check=(name,ok)=>{console.log((ok?'APROVADO':'PENDENTE')+' | '+name);if(!ok)pending++;};
let pending=0;
const flags=[
 'ANTARES_AGENDA_WRITES_ENABLED','ANTARES_TEAM_WRITES_ENABLED',
 'ANTARES_FINANCE_WRITES_ENABLED','ANTARES_CONTRACT_WRITES_ENABLED',
 'ANTARES_EDUCATION_WRITES_ENABLED','ANTARES_PROVIDER_WRITES_ENABLED'
];
for(const flag of flags)check(flag+' bloqueada durante auditoria',process.env[flag]!=='true');
check('Banco de leitura configurado',Boolean(process.env.DATABASE_URL));
check('Conexao operacional configurada',Boolean(process.env.DATABASE_URL_TEAM_RUNTIME));
check('Origem configurada',Boolean(process.env.ANTARES_APP_ORIGIN));
if(!process.env.DATABASE_URL){process.exitCode=1;process.exit();}
const db=neon(process.env.DATABASE_URL);
try{
 const rows=await db`SELECT
  (SELECT count(*)::int FROM public.crm_clients) AS crm_clients,
  (SELECT count(*)::int FROM public.business_proposals) AS proposals,
  (SELECT count(*)::int FROM public.business_proposals WHERE status='accepted') AS accepted_proposals,
  (SELECT count(*)::int FROM public.antares_domes) AS domes,
  (SELECT count(*)::int FROM public.antares_dome_links) AS dome_links,
  (SELECT count(*)::int FROM public.antares_client_links) AS client_links,
  (SELECT count(*)::int FROM public.antares_proposal_reservations) AS reservations,
  (SELECT count(*)::int FROM public.presentations) AS presentations,
  (SELECT count(*)::int FROM public.team_invitations WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()) AS pending_invites,
  (SELECT count(*)::int FROM public.team_members WHERE role='collaborator' AND active=true) AS active_collaborators,
  (SELECT count(*)::int FROM public.business_audit) AS audit_entries,
  (SELECT count(*)::int FROM public.crm_clients WHERE name ILIKE '%teste%' OR name ILIKE '%homolog%' OR name ILIKE '%exemplo%' OR name ILIKE 'ESCOLA 0%') AS suspected_clients,
  (SELECT count(*)::int FROM public.business_proposals WHERE title ILIKE '%teste%' OR title ILIKE '%homolog%' OR title ILIKE '%exemplo%') AS suspected_proposals,
  (SELECT count(*)::int FROM public.antares_domes WHERE name ILIKE '%teste%' OR name ILIKE '%homolog%' OR code ILIKE 'TMP-%') AS suspected_domes
 `;
 const stats=rows[0];
 const labels={
  crm_clients:'Clientes CRM',proposals:'Propostas',accepted_proposals:'Propostas aceitas',
  domes:'Cupulas',dome_links:'Vinculos operacionais de cupulas',
  client_links:'Vinculos operacionais de clientes',reservations:'Reservas vinculadas',
  presentations:'Apresentacoes',pending_invites:'Convites pendentes',
  active_collaborators:'Colaboradores ativos',audit_entries:'Eventos de auditoria',
  suspected_clients:'Clientes com nome indicativo de teste',
  suspected_proposals:'Propostas com titulo indicativo de teste',
  suspected_domes:'Cupulas com nome/codigo indicativo de teste'
 };
 for(const [key,label] of Object.entries(labels))console.log('CONTAGEM | '+label+': '+Number(stats[key]));
 console.log('ATENCAO | Marcadores de teste sao apenas indicios; revisar antes de qualquer exclusao.');
 console.log('ATENCAO | As contagens abrangem todo o banco; nao presumir que todo registro e ficticio.');
 console.log('ATENCAO | Eventos de auditoria devem ser preservados segundo a politica acordada.');
}catch{
 check('Contagem de entrega disponivel',false);
 console.log('INFO | Consulta de leitura falhou. Verifique o esquema/permissoes sem alterar dados.');
}
console.log('PENDENTE MANUAL | Confirmar backup antes de limpeza, rotacao de segredos e transferencia de owner.');
console.log('PENDENTE MANUAL | Validar HTTPS/hospedagem e aceite real de colaborador antes de liberar Equipe.');
console.log('RESUMO | '+pending+' pre-requisito(s) tecnicos pendente(s); nenhuma escrita realizada.');
if(pending)process.exitCode=1;
