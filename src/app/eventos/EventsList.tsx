'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
type EventItem={id:string;title:string;date:string|null;status:string;attendees:number|null;client:string};
const statusNames:Record<string,string>={lead:'Oportunidade',quoted:'Orçado',reserved:'Reservado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado',canceled:'Cancelado'};
export default function EventsList({events}:{events:EventItem[]}){
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const filtered=useMemo(()=>events.filter(e=>(filter==='all'||e.status===filter)&&[e.title,e.client,e.status].join(' ').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim())),[events,filter,query]);
 return <section style={{background:'#fff',border:'1px solid #d5e1f5',borderRadius:16,padding:18}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:18}}>
 <input aria-label="Pesquisar eventos" placeholder="Pesquisar evento ou instituição" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:'1 1 250px',padding:12,border:'1px solid #c5d6ee',borderRadius:9,color:'#183c70',background:'#fff'}}/>
 <select aria-label="Filtrar situação" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:12,border:'1px solid #c5d6ee',borderRadius:9,color:'#183c70',background:'#fff'}}>
 <option value="all">Todas as situações</option>{Object.entries(statusNames).filter(([v])=>v!=='canceled').map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
 </div>
 <p style={{color:'#58739a',marginBottom:12}}>{filtered.length} evento(s) encontrado(s)</p>
 {filtered.length===0?<p style={{padding:22,background:'#f3f7ff',borderRadius:10}}>Nenhum evento encontrado.</p>:<div style={{display:'grid',gap:10}}>{filtered.map(e=><article key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap',border:'1px solid #dae5f6',borderRadius:12,padding:16,background:'#f7faff'}}>
 <div><strong style={{fontSize:17}}>{e.title}</strong><div style={{marginTop:5,color:'#52719b'}}>{e.client} · {e.date?e.date.split('-').reverse().join('/'):'Data a definir'} · {statusNames[e.status]||e.status||'Situação a definir'}{e.attendees!==null?' · '+e.attendees+' participantes':''}</div></div>
 <Link href={'/eventos/'+e.id} style={{padding:'10px 15px',borderRadius:9,background:'#2058cb',color:'#fff',fontWeight:700,textDecoration:'none'}}>Abrir operação</Link>
 </article>)}</div>}
 </section>;
}