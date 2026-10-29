'use client';
import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
function Formulario(){
 const search=useSearchParams(); const token=search.get('token'); const [password,setPassword]=useState(''); const [repeat,setRepeat]=useState(''); const [loading,setLoading]=useState(false); const [message,setMessage]=useState(''); const [done,setDone]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); if(!token||loading)return;
  if(password.length<12){setMessage('Utilize uma senha com pelo menos 12 caracteres.');return}
  if(password!==repeat){setMessage('As senhas não coincidem.');return}
  setLoading(true);setMessage('');
  try {
   const res=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({token,newPassword:password})});
   if(!res.ok){setMessage('Não foi possível redefinir. O link pode ter expirado ou o serviço não está configurado.');return}
   setDone(true);setPassword('');setRepeat(''); setMessage('Senha redefinida. Agora faça login.');
  }catch{setMessage('Falha de comunicação. Tente novamente mais tarde.')}finally{setLoading(false)}
 }
 return <main style={{maxWidth:420,margin:'10vh auto',padding:26,border:'1px solid #64748b',borderRadius:16}}>
  <h1 style={{fontSize:24,fontWeight:700}}>Nova senha</h1>
  {!token?<p>Link inválido ou sem token. Solicite uma nova recuperação.</p>:!done?<form onSubmit={submit} style={{display:'grid',gap:12,marginTop:16}}>
   <label>Nova senha<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:12,color:'#111'}}/></label>
   <label>Confirme a senha<input type="password" autoComplete="new-password" required minLength={12} value={repeat} onChange={e=>setRepeat(e.target.value)} style={{width:'100%',padding:12,color:'#111'}}/></label>
   <button disabled={loading} style={{background:'#2563eb',color:'white',padding:12,borderRadius:10}}>{loading?'Salvando…':'Redefinir senha'}</button>
  </form>:null}
  {message&&<p role="status" style={{marginTop:16}}>{message}</p>}
  <p style={{marginTop:16}}><Link href="/auth/sign-in">Voltar ao login</Link></p>
 </main>
}
export default function Page(){return <Suspense fallback={<p>Carregando…</p>}><Formulario/></Suspense>}
