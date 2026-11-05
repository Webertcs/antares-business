'use client';
import {useEffect,useState} from 'react';
export default function EventTeamPanel({eventId,profileKey,ownerName,isOwner}:{eventId:string;profileKey:string;ownerName:string;isOwner:boolean}){
 const [photo,setPhoto]=useState(''),[alias,setAlias]=useState(''),[open,setOpen]=useState(false);
 const [team,setTeam]=useState<{id:string;full_name:string;email:string}[]>([]),[teamError,setTeamError]=useState(''),[teamLoading,setTeamLoading]=useState(false);
 useEffect(()=>{if(!open||!isOwner)return;const controller=new AbortController();setTeamLoading(true);fetch('/api/eventos/'+encodeURIComponent(eventId)+'/equipe',{signal:controller.signal,cache:'no-store'}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error||'Falha ao carregar colaboradores');setTeam(v.members||[]);setTeamError('')}).catch(e=>{if(!controller.signal.aborted)setTeamError(e.message)}).finally(()=>{if(!controller.signal.aborted)setTeamLoading(false)});return()=>controller.abort()},[open,isOwner,eventId]);
 useEffect(()=>{try{const raw=localStorage.getItem('antares:profile-preview:'+profileKey);if(raw){const value=JSON.parse(raw);setPhoto(typeof value.photo==='string'?value.photo:'');setAlias(typeof value.alias==='string'?value.alias:'')}}catch{}},[profileKey]);
 useEffect(()=>{if(!open)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[open]);
 const name=alias.trim()||(isOwner?ownerName:'Meu perfil')||'Meu perfil';
 const portrait=<div style={{height:48,width:48,flexShrink:0,borderRadius:'50%',overflow:'hidden',display:'grid',placeItems:'center',background:'linear-gradient(135deg,#d7eaff,#a9d0ff)',border:'3px solid white',boxShadow:'0 5px 16px #102f6b33',fontSize:27,fontWeight:800,color:'#164a96'}}>{photo?<img src={photo} alt={'Foto de '+name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:name.charAt(0).toUpperCase()}</div>;
 return <section style={{background:'linear-gradient(110deg,#e7f1ff,#fff 62%,#dceaff)',border:'1px solid #91bafa',borderRadius:17,padding:'10px 12px',boxShadow:'0 7px 20px #164c9b1c'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
 <div><h2 style={{fontSize:15,margin:'0 0 3px',color:'#173668'}}>👥 Equipe do Evento</h2></div>
 <button type="button" onClick={()=>setOpen(true)} style={{background:'linear-gradient(135deg,#2875e7,#073f9b)',color:'white',padding:'6px 10px',fontSize:12,border:0,borderRadius:10,fontWeight:800,boxShadow:'0 4px 12px #164b9b40'}}>{isOwner?'Gerenciar equipe':'Ver equipe'}</button>
 </div>
 <div style={{display:'flex',alignItems:'center',gap:9,marginTop:8,flexWrap:'wrap'}}>{portrait}<div><strong style={{display:'block',fontSize:16,color:'#183b72'}}>{name}</strong><span style={{fontSize:12,color:'#1956a7',fontWeight:700}}>{isOwner?'Proprietário':'Colaborador'}</span></div></div>
 {open&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(7,21,54,.67)',display:'grid',placeItems:'center',padding:16}}>
 <section role="dialog" aria-modal="true" aria-labelledby="event-team-dialog-title" style={{width:'min(100%,520px)',maxHeight:'85vh',overflowY:'auto',background:'#fff',borderRadius:20,boxShadow:'0 20px 65px #0005',padding:24,color:'#193765'}}>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><h2 id="event-team-dialog-title" style={{margin:0,fontSize:21}}>Equipe do Evento</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar janela" style={{fontSize:23,border:0,background:'transparent',color:'#536783'}}>×</button></div>
 
 <div style={{display:'flex',alignItems:'center',gap:14,background:'#edf4ff',borderRadius:13,padding:14,margin:'16px 0'}}>{portrait}<div><strong>{name}</strong><div style={{fontSize:12,color:'#59709b'}}>{isOwner?'Proprietário':'Colaborador'}</div></div></div>
 
 {isOwner&&<div style={{marginBottom:16}}><h3 style={{fontSize:16,margin:'0 0 8px'}}>Colaboradores cadastrados</h3>{teamLoading?<p>Carregando equipe…</p>:teamError?<p role="alert">{teamError}</p>:team.length?<ul style={{listStyle:'none',padding:0,display:'grid',gap:8}}>{team.map(m=><li key={m.id} style={{background:'#edf4ff',padding:12,borderRadius:10}}><strong>{m.full_name}</strong><div style={{fontSize:12}}>{m.email}</div></li>)}</ul>:<p>Nenhum colaborador ativo cadastrado.</p>}<p style={{fontSize:12,color:'#536783'}}>A vinculação individual ao evento ainda não está habilitada. Nenhuma escala foi alterada.</p></div>}
 <button type="button" onClick={()=>setOpen(false)} style={{background:'#2058cb',color:'#fff',border:0,borderRadius:10,padding:'11px 22px',fontWeight:700}}>Fechar</button>
 </section></div>}
 </section>;
}
