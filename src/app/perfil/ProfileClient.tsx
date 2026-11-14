'use client';
import {useEffect,useState} from 'react';
import BackButton from '../BackButton';
import {signOutAction} from './actions';
import {Camera,UserRound,LogOut} from 'lucide-react';
type Props={email:string;name:string;role:string;profileKey:string};
export default function ProfileClient({email,name,role,profileKey}:Props){
 const storageKey='antares:profile-preview:'+profileKey;
 const [alias,setAlias]=useState(name);
 const [photo,setPhoto]=useState('');
 const [message,setMessage]=useState('');
 useEffect(()=>{let live=true;fetch('/api/perfil',{cache:'no-store'}).then(r=>r.json()).then(v=>{if(!live)return;if(v.profile){setAlias(v.profile.display_name||name);setPhoto(v.profile.photo_data||'');return}try{const raw=localStorage.getItem(storageKey);if(raw){const d=JSON.parse(raw);if(typeof d.alias==='string')setAlias(d.alias);if(typeof d.photo==='string')setPhoto(d.photo)}}catch{}}).catch(()=>{});return()=>{live=false}},[storageKey,name]);
 async function save(){if(!alias.trim()||alias.length>120){setMessage('Informe um nome de até 120 caracteres.');return}try{localStorage.setItem(storageKey,JSON.stringify({alias:alias.trim(),photo}));window.dispatchEvent(new CustomEvent('antares:profile-updated',{detail:{profileKey,alias:alias.trim(),photo}}));const response=await fetch('/api/perfil',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({alias:alias.trim(),photo})});const result=await response.json();setMessage(response.ok?'Perfil sincronizado para toda a equipe.':(result.error||'Salvo apenas neste navegador; sincronização pendente.'));}catch{setMessage('Não foi possível salvar neste navegador. Tente uma foto menor.');}}
 async function handleFile(file?:File){if(!file)return; if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('Use JPEG, PNG ou WebP.');return}if(file.size>2*1024*1024){setMessage('Escolha uma imagem de até 2 MB.');return}
 try{
 const bitmap=await createImageBitmap(file);
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error();
 const crop=Math.min(bitmap.width,bitmap.height);const x=(bitmap.width-crop)/2,y=(bitmap.height-crop)/2;
 ctx.drawImage(bitmap,x,y,crop,crop,0,0,160,160);bitmap.close();
 setPhoto(canvas.toDataURL('image/webp',.8));setMessage('Foto preparada. Clique em Salvar preferências para guardar neste navegador.');
 }catch{setMessage('Não foi possível processar a imagem.')}}
 return <main className="profile-page"><div className="profile-navigation"><BackButton/></div><section className="profile-panel"><header className="profile-header"><p className="profile-eyebrow">MINHA CONTA</p><h1>Meu perfil</h1></header><div className="profile-form-layout"><div className="profile-photo-area">{photo?<img alt="Sua foto de perfil" src={photo}/>:<span aria-hidden="true"><UserRound size={55}/></span>}<label className="profile-photo-button"><Camera size={16}/> Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void handleFile(e.target.files?.[0])}/></label></div><div className="profile-fields"><label>Nome de exibição<input value={alias} onChange={e=>setAlias(e.target.value)} maxLength={120}/></label><label>E-mail da conta<input value={email} disabled readOnly/></label><label>Tipo de acesso<input value={role==='developer'?'Administrador técnico':role==='owner'?'Proprietário':'Colaborador'} disabled readOnly/></label><button type="button" className="primary-button" onClick={save}>Salvar preferências visuais</button>{message&&<p role="status" className="profile-feedback">{message}</p>}<form action={signOutAction} style={{marginTop:20,paddingTop:16,borderTop:'1px solid #cbdcf2'}}><button type="submit" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'11px 16px',border:'1px solid #b9cce8',borderRadius:10,background:'#fff',color:'#17437e',fontWeight:700,cursor:'pointer'}}><LogOut size={17}/> Sair da conta</button></form></div></div></section></main>;
}
