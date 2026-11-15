import {NextResponse} from 'next/server';
import {requireOwner,getDb,getTeamWriteDb} from '@/lib/equipe/auth';
import {relationshipCycle} from '@/lib/fidelizacao/relationship-cycle';
import {notificationReadKey,type AntaresNotification,type NotificationCategory,type NotificationFeed} from '@/lib/notificacoes/types';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store'};
const text=(value:unknown)=>value==null?'':String(value);
const iso=(value:unknown)=>value instanceof Date?value.toISOString():text(value);
const dateOnly=(value:unknown)=>iso(value).slice(0,10);
const blank=(value:unknown,fallback:string)=>text(value).trim()||fallback;
type Owner=NonNullable<Awaited<ReturnType<typeof requireOwner>>>;
const keyPattern=/^(opportunities|loyalty|agenda|finance):[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}:(pending|warning|critical|today|overdue)(?::[0-9]{4}-[0-9]{2}-[0-9]{2})?$/;

async function buildFeed(owner:Owner):Promise<NotificationFeed>{
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

 // O status de leitura é por proprietário e por organização, não por navegador.
 // Antes da migração, os avisos continuam funcionando; a UI informa o motivo.
 let readPersistenceAvailable=true;
 let readKeys=new Set<string>();
 try{
  const saved=await db`SELECT notification_key
   FROM public.antares_notification_reads
   WHERE organization_id=${org} AND auth_subject=${owner.user.id}
   ORDER BY read_at DESC LIMIT 5000`;
  readKeys=new Set(saved.map(x=>String(x.notification_key)));
 }catch{
  readPersistenceAvailable=false;
 }
 const tracked=items.slice(0,500).map(n=>{
  const readKey=notificationReadKey(n);
  return {...n,readKey,read:readKeys.has(readKey)};
 });
 return {
  items:tracked,
  history:history.slice(0,100),
  count:items.length,
  unreadCount:tracked.filter(n=>!n.read).length,
  opportunitiesCount:items.filter(x=>x.category==='opportunities').length,
  readPersistenceAvailable,
  unavailable,
  checkedAt:new Date().toISOString()
 };
}
async function ownerOrResponse(){
 try {
  const owner=await requireOwner();
  return owner??NextResponse.json({error:'Acesso exclusivo do proprietário.'},{status:403,headers:noStore});
 }catch{
  return NextResponse.json({error:'Acesso indisponível.'},{status:503,headers:noStore});
 }
}
export async function GET(){
 const ctx=await ownerOrResponse();
 if(ctx instanceof NextResponse)return ctx;
 try{
  const feed=await buildFeed(ctx);
  if(feed.unavailable.length===4)
   return NextResponse.json({error:'Notificações temporariamente indisponíveis.'},{status:503,headers:noStore});
  return NextResponse.json(feed,{headers:noStore});
 }catch{
  return NextResponse.json({error:'Não foi possível consultar as notificações.'},{status:503,headers:noStore});
 }
}
export async function POST(request:Request){
 const ctx=await ownerOrResponse();
 if(ctx instanceof NextResponse)return ctx;
 const origin=request.headers.get('origin'),host=request.headers.get('host');
 try{
  if(!origin||!host||new URL(origin).host!==host)return NextResponse.json({error:'Origem inválida.'},{status:403,headers:noStore});
 }catch{return NextResponse.json({error:'Origem inválida.'},{status:403,headers:noStore});}
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')
  return NextResponse.json({error:'Formato inválido.'},{status:415,headers:noStore});
 if(Number(request.headers.get('content-length')||0)>2400)
  return NextResponse.json({error:'Dados muito grandes.'},{status:413,headers:noStore});
 let keys:string[];
 try{
  const raw=await request.text();
  if(raw.length>2400)return NextResponse.json({error:'Dados muito grandes.'},{status:413,headers:noStore});
  const body=JSON.parse(raw) as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body)||body.action!=='read'||!Array.isArray(body.keys))
   return NextResponse.json({error:'Operação inválida.'},{status:400,headers:noStore});
  keys=body.keys;
 }catch{return NextResponse.json({error:'Dados inválidos.'},{status:400,headers:noStore});}
 if(keys.length<1||keys.length>25||keys.some(x=>typeof x!=='string'||!keyPattern.test(x))||
  new Set(keys).size!==keys.length)
  return NextResponse.json({error:'Identificadores inválidos.'},{status:400,headers:noStore});

 try{
  const feed=await buildFeed(ctx);
  if(!feed.readPersistenceAvailable)
   return NextResponse.json({error:'Ative a migração de leitura de notificações no Neon.'},{status:503,headers:noStore});
  // O cliente só pode reconhecer pendências ATUAIS de sua própria organização.
  const permitted=new Set(feed.items.map(item=>item.readKey));
  if(keys.some(key=>!permitted.has(key)))
   return NextResponse.json({error:'Notificação não disponível ou já resolvida.'},{status:409,headers:noStore});

  const db=getTeamWriteDb();
  const safe=await db`SELECT current_user='antares_team_runtime' AS role_ok,
    has_function_privilege(current_user,
      'public.antares_mark_notifications_read(text,uuid,text[])','EXECUTE') AS func_ok,
    NOT has_table_privilege(current_user,'public.antares_notification_reads','INSERT') AS table_ok`;
  if(!safe[0]?.role_ok||!safe[0]?.func_ok||!safe[0]?.table_ok)
   return NextResponse.json({error:'Permissões de notificações não homologadas.'},{status:503,headers:noStore});
  await db`SELECT public.antares_mark_notifications_read(
   ${ctx.user.id},${ctx.organizationId}::uuid,
   ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(keys)}::jsonb)))`;
  return NextResponse.json({ok:true},{headers:noStore});
 }catch{
  return NextResponse.json({error:'Não foi possível registrar a leitura. Confira a migração.'},{status:503,headers:noStore});
 }
}
