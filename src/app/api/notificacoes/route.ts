import {NextResponse} from 'next/server';
import {requireOwner,getDb} from '@/lib/equipe/auth';
import {relationshipCycle} from '@/lib/fidelizacao/relationship-cycle';
import type {AntaresNotification,NotificationCategory,NotificationFeed} from '@/lib/notificacoes/types';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store'};
const text=(value:unknown)=>value==null?'':String(value);
const iso=(value:unknown)=>value instanceof Date?value.toISOString():text(value);
const dateOnly=(value:unknown)=>iso(value).slice(0,10);
const blank=(value:unknown,fallback:string)=>text(value).trim()||fallback;

export async function GET(){
 let owner:Awaited<ReturnType<typeof requireOwner>>;
 try {owner=await requireOwner();}
 catch{return NextResponse.json({error:'Acesso indisponível.'},{status:503,headers:noStore});}
 if(!owner)return NextResponse.json({error:'Acesso exclusivo do proprietário.'},{status:403,headers:noStore});
 const db=getDb(),org=owner.organizationId;
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
 const items:AntaresNotification[]=[];
 const history:AntaresNotification[]=[];
 const unavailable:NotificationCategory[]=[];

 // Leituras por modulo isoladas: uma categoria indisponivel nao oculta as outras.
 await Promise.all([
  (async()=>{
   try{
    const leads=await db`SELECT id,institution,status,created_at FROM public.vitrine_leads
      WHERE organization_id=${org}
      ORDER BY created_at DESC LIMIT 300`;
    for(const lead of leads){
     const status=text(lead.status);
     const title=blank(lead.institution,'Instituição não informada');
     const record:AntaresNotification={
      id:'lead:'+text(lead.id),category:'opportunities',title:'Solicitação da Vitrine',
      detail:title,href:'/vitrine/inbox',status:'pending',
      date:iso(lead.created_at),priority:'high'
     };
     if(status==='pending')items.push(record);
     else if(status==='reviewing'||status==='converted'||status==='archived')
      history.push({
       ...record,
       status:status as 'reviewing'|'converted'|'archived',
       priority:'normal',
       title:status==='reviewing'?'Oportunidade em análise':status==='converted'?'Oportunidade convertida':'Solicitação arquivada'
      });
    }
   }catch{unavailable.push('opportunities');}
  })(),
  (async()=>{
   try{
    const rows=await db`SELECT c.id,c.name,MAX(e.event_date) AS last_visit
      FROM public.crm_clients c
      LEFT JOIN public.crm_events e ON e.organization_id=c.organization_id
       AND e.client_id=c.id AND e.status='completed' AND e.event_date<=${today}::date
      WHERE c.organization_id=${org}
       AND COALESCE(c.status,'active') NOT IN ('archived','inactive')
      GROUP BY c.id,c.name ORDER BY c.name ASC LIMIT 500`;
    let snoozes:Record<string,string>={};
    try{
     const saved=await db`SELECT client_id,snoozed_until FROM public.antares_relationship_snoozes
       WHERE organization_id=${org} AND snoozed_until>=${today}::date`;
     snoozes=Object.fromEntries(saved.map(r=>[text(r.client_id),dateOnly(r.snoozed_until)]));
    }catch{/* Migração opcional, conforme API original da fidelização. */}
    for(const row of rows){
     if(!row.last_visit)continue;
     const {days}=relationshipCycle([{status:'completed',event_date:dateOnly(row.last_visit)}],today);
     if(days===null||days<60||snoozes[text(row.id)]>=today)continue;
     items.push({
      id:'loyalty:'+text(row.id),category:'loyalty',
      title:days>=90?'Acompanhamento prioritário':'Acompanhamento recomendado',
      detail:blank(row.name,'Cliente')+' · '+days+' dias desde a última visita',
      href:'/fidelizacao',status:'overdue',date:dateOnly(row.last_visit),
      priority:days>=90?'high':'normal'
     });
    }
   }catch{unavailable.push('loyalty');}
  })(),
  (async()=>{
   try{
    const actions=await db`SELECT a.id,a.due_date,c.name AS client_name
      FROM public.antares_relationship_actions a
      JOIN public.crm_clients c ON c.id=a.client_id AND c.organization_id=a.organization_id
      WHERE a.organization_id=${org} AND a.status='open'
       AND a.due_date <= ${today}::date
      ORDER BY a.due_date ASC LIMIT 300`;
    for(const action of actions){
     const due=dateOnly(action.due_date);
     items.push({
      id:'agenda:'+text(action.id),category:'agenda',
      title:due<today?'Lembrete vencido':'Lembrete para hoje',
      detail:blank(action.client_name,'Cliente')+' · '+due.split('-').reverse().join('/'),
      href:'/fidelizacao',status:due<today?'overdue':'today',
      date:due,priority:due<today?'high':'normal'
     });
    }
   }catch{unavailable.push('agenda');}
  })(),
  (async()=>{
   try{
    const receivables=await db`SELECT r.id,c.name AS client_name,r.due_on,r.total,
      COALESCE((SELECT SUM(l.amount)
       FROM public.antares_receivable_payments p
       JOIN public.ledger_entries l ON l.id=p.ledger_id AND l.organization_id=p.organization_id
       WHERE p.organization_id=r.organization_id AND p.receivable_id=r.id
        AND l.entry_type='income' AND NOT EXISTS(
         SELECT 1 FROM public.ledger_entries rv
         WHERE rv.organization_id=l.organization_id AND rv.reversal_of=l.id)
      ),0) AS paid
      FROM public.antares_receivables r
      JOIN public.crm_clients c ON c.id=r.client_id AND c.organization_id=r.organization_id
      WHERE r.organization_id=${org} AND r.cancelled_at IS NULL
       AND r.due_on<=${today}::date ORDER BY r.due_on LIMIT 500`;
    for(const row of receivables){
     const remaining=Number(row.total||0)-Number(row.paid||0);
     if(!Number.isFinite(remaining)||remaining<=0.005)continue;
     const due=dateOnly(row.due_on);
     items.push({
      id:'finance:'+text(row.id),category:'finance',
      title:due<today?'Pagamento em atraso':'Pagamento vence hoje',
      detail:blank(row.client_name,'Cliente')+' · '+remaining.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
      href:'/financeiro',status:due<today?'overdue':'today',date:due,
      priority:due<today?'high':'normal'
     });
    }
   }catch{unavailable.push('finance');}
  })()
 ]);
 items.sort((a,b)=>Number(b.priority==='high')-Number(a.priority==='high')||
  text(b.date).localeCompare(text(a.date)));
 history.sort((a,b)=>text(b.date).localeCompare(text(a.date)));
 const feed:NotificationFeed={
  items:items.slice(0,500),history:history.slice(0,100),
  count:items.length,
  opportunitiesCount:items.filter(x=>x.category==='opportunities').length,
  unavailable,checkedAt:new Date().toISOString()
 };
 if(unavailable.length===4)return NextResponse.json({error:'Notificações temporariamente indisponíveis.'},{status:503,headers:noStore});
 return NextResponse.json(feed,{headers:noStore});
}
