'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
type EventItem={id:string;title:string;date:string|null;status:string;attendees:number|null;client:string};
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
export default function EventsList({events}:{events:EventItem[]}){
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const filtered=useMemo(()=>events.filter(e=>(filter==='all'||e.status===filter)&&[e.title,e.client,e.status,statusNames[e.status]||''].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim())),[events,filter,query]);
 const confirmed=events.filter(e=>e.status==='confirmed').length;
 const opportunities=events.filter(e=>e.status==='lead').length;
 return <>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:14}}>
  {([{label:'Total de eventos',value:events.length,icon:'📅'},{label:'Confirmados',value:confirmed,icon:'✓'},{label:'Oportunidades',value:opportunities,icon:'✦'}]).map(item=><div key={item.label} style={{background:'#eef5ff',border:'1px solid #c9dcfa',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,minHeight:70}}><span aria-hidden="true" style={{display:'grid',placeItems:'center',width:36,height:36,borderRadius:10,background:'#dbeaff',color:'#1853a7',fontSize:19}}>{item.icon}</span><div><div style={{fontSize:12,color:'#365c8b',lineHeight:1.4}}>{item.label}</div><div style={{fontSize:22,fontWeight:700,color:'#153d76',lineHeight:1.25}}>{item.value}</div></div></div>)}
 </div>
 <section style={{background:'#fff',border:'1px solid #d5e1f5',borderRadius:16,padding:'clamp(14px,2vw,20px)'}}>
  <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:12,background:'#eaf3ff',padding:10,borderRadius:11,border:'1px solid #d2e2f8'}}>
   <input aria-label="Pesquisar eventos" placeholder="Pesquisar evento ou instituição" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:'1 1 240px',minWidth:0,minHeight:44,padding:'10px 12px',fontSize:14,border:'1px solid #c5d6ee',borderRadius:9,color:'#183c70',background:'#fff'}}/>
   <select aria-label="Filtrar situação" value={filter} onChange={e=>setFilter(e.target.value)} style={{flex:'0 1 190px',minHeight:44,padding:'10px 12px',fontSize:14,border:'1px solid #c5d6ee',borderRadius:9,color:'#183c70',background:'#fff'}}>
    <option value="all">Todas as situações</option>{Object.entries(statusNames).filter(([v])=>v!=='canceled').map(([v,label])=><option key={v} value={v}>{label}</option>)}
   </select>
  </div>
  <p role="status" aria-live="polite" style={{fontSize:12,color:'#365e94',marginBottom:9}}>{filtered.length} {filtered.length===1?'evento encontrado':'eventos encontrados'}</p>
  {filtered.length===0?<p style={{padding:20,background:'#f3f7ff',borderRadius:10,color:'#365e94'}}>Nenhum evento encontrado para os filtros selecionados.</p>:<div style={{display:'grid',gap:8}}>
   {filtered.map(e=><article key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',border:'1px solid #d4e2f7',borderRadius:10,padding:'10px 12px',background:'#f3f7ff'}}>
    <div style={{flex:'1 1 260px',minWidth:0}}>
     <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:3}}>
      <h2 style={{fontSize:15,fontWeight:700,lineHeight:1.3,margin:0,color:'#153d76'}}>{e.title}</h2>
      <span style={{fontSize:12,fontWeight:500,lineHeight:1.4,padding:'3px 9px',borderRadius:999,border:'1px solid '+(statusStyles[e.status]?.border||'#c9d8eb'),background:statusStyles[e.status]?.background||'#e9f0fb',color:statusStyles[e.status]?.color||'#305781'}}>{statusNames[e.status]||e.status||'Situação a definir'}</span>
     </div>
     <p style={{fontSize:14,lineHeight:1.45,color:'#315989',margin:'0 0 4px'}}>{e.client}</p>
     <div style={{display:'flex',gap:'4px 14px',flexWrap:'wrap',fontSize:13,lineHeight:1.5,color:'#42648e'}}>
      <span aria-label={'Data: '+formatDate(e.date)}>📅 {formatDate(e.date)}</span>
      {e.attendees!==null&&<span aria-label={e.attendees+' participantes previstos'}>👥 {e.attendees} participantes</span>}
     </div>
    </div>
    <Link href={'/eventos/'+e.id} aria-label={'Abrir operação do evento '+e.title} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:44,padding:'10px 16px',borderRadius:9,background:'#2058cb',color:'#fff',fontSize:14,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>Abrir operação →</Link>
   </article>)}
  </div>}
 </section></>;
}