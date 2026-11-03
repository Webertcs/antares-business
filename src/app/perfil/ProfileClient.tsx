'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Camera,Info,UserRound} from 'lucide-react';
type Props={email:string;name:string;role:string;profileKey:string};
export default function ProfileClient({email,name,role,profileKey}:Props){
 const storageKey='antares:profile-preview:'+profileKey;
 const [alias,setAlias]=useState(name);
 const [photo,setPhoto]=useState('');
 const [message,setMessage]=useState('');
 useEffect(()=>{try{const raw=localStorage.getItem(storageKey);if(raw){const d=JSON.parse(raw);if(typeof d.alias==='string')setAlias(d.alias);if(typeof d.photo==='string')setPhoto(d.photo)}}catch{}},[storageKey]);
 function save(){if(!alias.trim()||alias.length>120){setMessage('Informe um nome de até 120 caracteres.');return}try{localStorage.setItem(storageKey,JSON.stringify({alias:alias.trim(),photo}));setMessage('Preferências visuais salvas neste navegador. Não alteram seu cadastro de acesso.');}catch{setMessage('Não foi possível salvar neste navegador. Tente uma foto menor.');}}
 async function handleFile(file?:File){if(!file)return; if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('Use JPEG, PNG ou WebP.');return}if(file.size>2*1024*1024){setMessage('Escolha uma imagem de até 2 MB.');return}
 try{
 const bitmap=await createImageBitmap(file);
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error();
 const crop=Math.min(bitmap.width,bitmap.height);const x=(bitmap.width-crop)/2,y=(bitmap.height-crop)/2;
 ctx.drawImage(bitmap,x,y,crop,crop,0,0,160,160);bitmap.close();
 setPhoto(canvas.toDataURL('image/webp',.8));setMessage('Foto preparada. Clique em Salvar preferências para guardar neste navegador.');
 }catch{setMessage('Não foi possível processar a imagem.')}}
 return <main className="profile-page"><Link href="/" className="profile-back">← Voltar ao Dashboard</Link><section className="profile-panel"><div><p className="profile-eyebrow">MINHA CONTA</p><h1>Meu perfil</h1><p>Personalize como sua identificação aparece neste navegador.</p></div><div className="profile-form-layout"><div className="profile-photo-area">{photo?<img alt="Sua foto de perfil" src={photo}/>:<span aria-hidden="true"><UserRound size={55}/></span>}<label className="profile-photo-button"><Camera size={16}/> Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void handleFile(e.target.files?.[0])}/></label></div><div className="profile-fields"><label>Nome de exibição<input value={alias} onChange={e=>setAlias(e.target.value)} maxLength={120}/></label><label>E-mail da conta<input value={email} disabled readOnly/></label><label>Tipo de acesso<input value={role==='owner'?'Proprietário':'Colaborador'} disabled readOnly/></label><button type="button" className="primary-button" onClick={save}>Salvar preferências visuais</button>{message&&<p role="status" className="profile-feedback">{message}</p>}</div></div><div className="profile-warning"><Info size={19}/><p><strong>Personalização local:</strong> nesta primeira etapa, o nome de exibição e a foto ficam somente neste navegador. Eles não alteram os dados de autenticação, não sincronizam entre aparelhos e não substituem o cadastro definitivo do proprietário. A sincronização segura será feita antes da implantação.</p></div></section></main>;
}
