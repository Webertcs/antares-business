/** Regras únicas para contagem de visitas e avisos do ANTARES.
 * Datas são dias civis de Brasília; somente o encerramento confirma uma visita realizada.
 */
export type VisitStatus='confirmed'|'completed'|string;
export type VisitInput={status:VisitStatus;event_date:string|null};
export function visitDays(value:string|null):number|null{
 if(!value)return null;
 const date=value.slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const n=Date.parse(date+'T12:00:00Z');
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===date?n:null;
}
export function relationshipCycle(events:VisitInput[],today:string){
 const now=visitDays(today);
 if(now===null)throw Error('Data atual inválida');
 const dates=events.filter(e=>e.status==='completed')
  .map(e=>visitDays(e.event_date)).filter((d):d is number=>d!==null&&d<=now)
  .sort((a,b)=>b-a);
 const last=dates[0]??null;
 const days=last===null?null:Math.floor((now-last)/86400000);
 return {visits:dates.length,lastDate:last===null?null:new Date(last).toISOString().slice(0,10),
  days,alert:days===null?'first_visit':days>=90?'critical':days>=60?'warning':'ok'} as const;
}
