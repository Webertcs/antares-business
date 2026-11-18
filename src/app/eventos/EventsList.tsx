'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
type EventItem={id:string;title:string;date:string|null;status:string;attendees:number|null;client:string;archived:boolean;startTime:string|null;endTime:string|null;dome:string|null;actualStudents:number|null};
const statusNames:Record<string,string>={lead:'Oportunidade',quoted:'Orçado',reserved:'Reservado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado',canceled:'Cancelado'};
const statusStyles:Record<string,{background:string;color:string;border:string}>={
 lead:{background:'#edf3ff',color:'#24569b',border:'#c9daf8'},
 quoted:{background:'#f1edff',color:'#5942a1',border:'#ded4ff'},
 reserved:{background:'#fff5e5',color:'#80521b',border:'#f3dbad'},
 confirmed:{background:'#e8f7ef',color:'#176341',border:'#bde6cf'},
 completed:{background:'#eaf1ff',color:'#234f9b',border:'#c8d9f6'},
 cancelled:{background:'#fff0f0',color:'#a33333',border:'#f1cccc'},
 canceled:{background:'#fff0f0',color:'#a33333',border:'#f1cccc'}
};
function formatDate(value:string|null){
 if(!value)return 'Data a definir';
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 return match?`${match[3]}/${match[2]}/${match[1]}`:value;
}
type Filters={year:string;status:string;view:string;q:string};
export default function EventsList({events,total,page,pages,years,counts,filters}:{events:EventItem[];total:number;page:number;pages:number;years:number[];counts:{total:number;confirmed:number;opportunities:number};filters:Filters}){
 const router=useRouter();
 const [query,setQuery]=useState(filters.q);
 const [selected,setSelected]=useState<EventItem|null>(null);
 const filtered=events;
 const navigate=(changes:Partial<Filters>&{page?:number})=>{
  const next={...filters,...changes};
  const p=new URLSearchParams();
  if(next.view!=='upcoming')p.set('view',next.view);
  if(next.year!=='all')p.set('year',next.year);
  if(next.status!=='all')p.set('status',next.status);
  if(next.q)p.set('q',next.q);
  if(changes.page&&changes.page>1)p.set('page',String(changes.page));
  router.push('/eventos'+(p.size?'?'+p.toString():''));
 };
 return <>
 <div className="antares-events-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:8,marginBottom:10}}>
  {([{label:'Total de eventos',value:counts.total,icon:'📅'},{label:'Confirmados',value:counts.confirmed,icon:'✓'},{label:'Oportunidades',value:counts.opportunities,icon:'✦'}]).map(item=><div key={item.label} className="antares-events-stat" style={{background:'#eef5ff',border:'1px solid #c9dcfa',borderRadius:12,padding:'9px 12px',display:'flex',alignItems:'center',gap:10,minHeight:58}}><span aria-hidden="true" style={{display:'grid',placeItems:'center',width:36,height:36,borderRadius:10,background:'#dbeaff',color:'#1853a7',fontSize:19}}>{item.icon}</span><div><div style={{fontSize:12,color:'#365c8b',lineHeight:1.4}}>{item.label}</div><div style={{fontSize:22,fontWeight:700,color:'#153d76',lineHeight:1.25}}>{item.value}</div></div></div>)}
 </div>
 <section className="antares-events-panel" style={{background:'#f8fbff',border:'1px solid #c6daf8',borderRadius:16,padding:'clamp(12px,1.5vw,16px)'}}>
  <div className="antares-events-filters" style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:12,background:'#dcecff',padding:10,borderRadius:11,border:'1px solid #d2e2f8'}}>
   <input className="antares-events-field" aria-label="Pesquisar eventos" placeholder="Pesquisar evento ou instituição" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')navigate({q:query.trim()})}} style={{flex:'1 1 240px',minWidth:0,minHeight:44,padding:'10px 12px',fontSize:14,border:'1px solid #c5d6ee',borderRadius:9,color:'#183c70',background:'#fff'}}/>
   <select className="antares-events-field" aria-label="Filtrar situação" value={filters.status} onChange={e=>navigate({status:e.target.value})} style={{flex:'0 1 190px',minHeight:44,padding:'10px 12px',fontSize:14,border:'1px solid #c5d6ee',borderRadius:9,color:'#183c70',background:'#fff'}}>
    <option value="all">Todas as situações</option>{Object.entries(statusNames).filter(([v])=>v!=='canceled').map(([v,label])=><option key={v} value={v}>{label}</option>)}
   </select>
   <button type="button" className="antares-events-history-button" aria-pressed={filters.view==='history'} onClick={()=>navigate({view:filters.view==='history'?'all':'history',year:'all'})} style={{minHeight:44,padding:'8px 14px',borderRadius:9,border:'1px solid #b5d0f4',background:filters.view==='history'?'#16479f':'#2058cb',color:'#fff',fontWeight:600,cursor:'pointer'}}>Histórico</button>
  </div>
  {filters.view==='history'&&<div className="antares-events-year-filter" style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:12,padding:'10px 12px',background:'#dcecff',border:'1px solid #a9c9f4',borderRadius:10}}>
   <strong style={{color:'#174985',fontSize:13}}>Histórico por ano</strong>
   <select aria-label="Ano do histórico" value={filters.year} onChange={e=>navigate({year:e.target.value})} style={{minHeight:44,borderRadius:9,border:'1px solid #c5d6ee',background:'#edf5ff',color:'#183c70',padding:'8px 12px'}}><option value="all">Todos os anos</option>{years.map(y=><option key={y} value={String(y)}>{y}</option>)}</select>

  </div>}
  <p role="status" aria-live="polite" style={{fontSize:12,color:'#365e94',marginBottom:9}}>{total} {total===1?'evento encontrado':'eventos encontrados'}{pages>1?' · Página '+page+' de '+pages:''}</p>
  {filtered.length===0?<p style={{padding:20,background:'#eaf3ff',borderRadius:10,color:'#365e94'}}>Nenhum evento encontrado para os filtros selecionados.</p>:<div style={{display:'grid',gap:6}}>
   {filtered.map((e,i)=><div key={e.id}>{filters.view==='history'&&filters.year==='all'&&e.date&&((i===0)||(filtered[i-1].date?.slice(0,4)!==e.date.slice(0,4)))&&<h3 style={{fontSize:16,fontWeight:700,color:'#164b9b',margin:'12px 0 8px',padding:'8px 12px',background:'#dcecff',border:'1px solid #c1d8f9',borderRadius:8}}>{e.date.slice(0,4)}</h3>}<article key={e.id} className="antares-events-entry" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',border:'1px solid #d4e2f7',borderRadius:10,padding:'9px 12px',background:'#f3f7ff'}}>
    <div style={{flex:'1 1 260px',minWidth:0}}>
     <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:3}}>
      <h2 style={{fontSize:15,fontWeight:700,lineHeight:1.3,margin:0,color:'#153d76'}}>{e.title}</h2>
      <span style={{fontSize:12,fontWeight:500,lineHeight:1.4,padding:'3px 9px',borderRadius:999,border:'1px solid '+(statusStyles[e.status]?.border||'#c9d8eb'),background:statusStyles[e.status]?.background||'#e9f0fb',color:statusStyles[e.status]?.color||'#305781'}}>{e.archived?'Arquivado':statusNames[e.status]||e.status||'Situação a definir'}</span>
     </div>
     <p style={{fontSize:14,lineHeight:1.45,color:'#315989',margin:'0 0 4px'}}>{e.client}</p>
     <div style={{display:'flex',gap:'4px 14px',flexWrap:'wrap',fontSize:13,lineHeight:1.5,color:'#42648e'}}>
      <span aria-label={'Data: '+formatDate(e.date)}>📅 {formatDate(e.date)}</span>
      {e.attendees!==null&&<span aria-label={e.attendees+' participantes previstos'}>👥 {e.attendees} participantes</span>}
     </div>
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,flexWrap:'wrap',flex:'0 1 auto'}}><button type="button" className="antares-events-open" onClick={()=>setSelected(e)} aria-label={'Detalhes do evento '+e.title} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:34,padding:'7px 12px',borderRadius:8,background:'#2058cb',color:'#fff',fontSize:12,fontWeight:700,border:0,cursor:'pointer',whiteSpace:'nowrap'}}>Detalhes</button></div>
   </article></div>)}
  </div>}
  {pages>1&&<nav className="antares-events-pagination" aria-label="Paginação dos eventos" style={{display:'flex',justifyContent:'center',alignItems:'center',gap:12,marginTop:14}}><button type="button" className="antares-events-page-button" disabled={page<=1} onClick={()=>navigate({page:page-1})} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #c5d6ee',background:'#eaf3ff',color:'#153d76',opacity:page<=1?.5:1}}>Anterior</button><span style={{fontSize:13,color:'#365e94'}}>{page} / {pages}</span><button type="button" className="antares-events-page-button" disabled={page>=pages} onClick={()=>navigate({page:page+1})} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #c5d6ee',background:'#eaf3ff',color:'#153d76',opacity:page>=pages?.5:1}}>Próxima</button></nav>}
 </section>
 {selected&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}} style={{position:'fixed',inset:0,zIndex:1100,display:'grid',placeItems:'center',padding:16,background:'rgba(7,24,55,.65)'}}>
  <section role="dialog" aria-modal="true" aria-labelledby="antares-event-detail-title" onKeyDown={e=>{if(e.key==='Escape')setSelected(null)}} style={{width:'min(100%,570px)',maxHeight:'90vh',overflowY:'auto',background:'#f8fbff',borderRadius:16,boxShadow:'0 22px 65px rgba(0,0,0,.3)',color:'#153d76'}}>
   <header style={{background:'linear-gradient(110deg,#103875,#2066c2)',color:'#fff',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
    <div><div style={{fontSize:11,letterSpacing:1,fontWeight:700,opacity:.8}}>ANTARES · EVENTOS</div><h2 id="antares-event-detail-title" style={{fontSize:20,fontWeight:750,color:'#fff',margin:0}}>Detalhes da apresentação</h2></div>
    <button type="button" autoFocus aria-label="Fechar detalhes" onClick={()=>setSelected(null)} style={{border:'1px solid #9bc2fa',borderRadius:8,padding:'7px 11px',background:'#eaf3ff',color:'#174985',cursor:'pointer'}}>✕</button>
   </header>
   <div style={{padding:20,display:'grid',gap:14}}>
    <div><strong style={{fontSize:18,overflowWrap:'anywhere'}}>{selected.title}</strong><div style={{fontSize:13,color:'#52719b',marginTop:3}}>{selected.client}</div><span style={{display:'inline-block',marginTop:8,borderRadius:30,padding:'4px 10px',background:statusStyles[selected.status]?.background||'#e9f0fb',color:statusStyles[selected.status]?.color||'#305781',border:'1px solid '+(statusStyles[selected.status]?.border||'#c9d8eb'),fontSize:12,fontWeight:700}}>{selected.archived?'Arquivado':statusNames[selected.status]||selected.status}</span></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
     {([['Data',formatDate(selected.date)],['Horário',selected.startTime?selected.startTime.slice(0,5)+(selected.endTime?' às '+selected.endTime.slice(0,5):''):'A definir'],['Cúpula',selected.dome||'A definir'],['Alunos previstos',selected.attendees==null?'A definir':String(selected.attendees)],...(selected.actualStudents==null?[]:[['Alunos atendidos',String(selected.actualStudents)]])] as string[][]).map(([label,value])=><div key={label} style={{background:'#eaf2ff',border:'1px solid #cadcf7',borderRadius:10,padding:12}}><div style={{fontSize:12,color:'#50709c',marginBottom:4}}>{label}</div><strong style={{fontSize:16,color:'#153d76'}}>{value}</strong></div>)}
    </div>
    <button type="button" onClick={()=>setSelected(null)} style={{width:'100%',minHeight:42,border:'1px solid #b7d0f3',borderRadius:9,background:'#e6f0ff',color:'#164b91',fontWeight:700,cursor:'pointer'}}>Fechar</button>
   </div>
  </section>
 </div>}
</>;
}