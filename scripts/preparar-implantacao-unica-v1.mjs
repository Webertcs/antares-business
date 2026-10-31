// ANTARES V1 — pré-implantação consolidada SOMENTE LEITURA.
// Uso no ambiente autorizado, com DATABASE_URL administrativo já configurado.
// Não executa SQL 04 nem modifica banco.
import {neon} from '@neondatabase/serverless';
const url=process.env.DATABASE_URL;
if(!url){console.error('DATABASE_URL ausente');process.exitCode=1;}
else{
 try{
  const db=neon(url);
  const [r]=await db`SELECT current_database() AS db,
    current_user AS role,
    (SELECT count(*) FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('crm_clients','crm_contacts','crm_events')) AS crm,
    (SELECT count(*) FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('business_proposals','business_contracts',
       'business_domes','business_bookings','business_ledger','business_audit')) AS business,
    (SELECT count(*) FROM public.organizations) AS organizations`;
  const ok=r.db==='neondb'&&Number(r.crm)===3&&[0,6].includes(Number(r.business));
  console.log(JSON.stringify({database:r.db,role:r.role,crmTables:Number(r.crm),
   commercialTables:Number(r.business),organizations:Number(r.organizations),
   readyForHumanReview:ok},null,2));
  if(!ok){console.error('BLOQUEADO — base ou estrutura diferente do esperado');process.exitCode=1;}
  else if(Number(r.business)===6)console.log('SQL 04 parece já instalada; validar estrutura antes de qualquer reexecução.');
  else console.log('CRM 03 presente; SQL 04 ainda pendente. Faça backup e revisão antes da aplicação.');
 }catch(e){console.error('Pré-implantação indisponível:',e instanceof Error?e.message:'erro');process.exitCode=1;}
}
