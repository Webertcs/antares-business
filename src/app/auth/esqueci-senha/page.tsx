'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
export default function EsqueciSenha(){
 const [email,setEmail]=useState(''); const [loading,setLoading]=useState(false); const [message,setMessage]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); if(loading)return; setLoading(true); setMessage('');
  try {
   const res=await fetch('/api/auth/request-password-reset',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email,redirectTo:`${window.location.origin}/auth/redefinir-senha`})});
   // Não revelar se o endereço está cadastrado.
   if(res.status===404 || res.status===405){setMessage('Recuperação indisponível nesta configuração. Confira a integração do Neon Auth.');}
   else {setMessage('Se este endereço tiver uma conta com recuperação habilitada, você receberá instruções por e-mail. Confira também o spam.');}
  } catch {setMessage('Não foi possível contatar o serviço agora. Tente novamente mais tarde.');}
  finally {setLoading(false)}
 }
 return <main style={{maxWidth:420,margin:'10vh auto',padding:26,border:'1px solid #64748b',borderRadius:16}}>
  <h1 style={{fontSize:24,fontWeight:700}}>Recuperar acesso</h1>
  <p style={{margin:'12px 0'}}>Informe o e-mail cadastrado no ANTARES BUSINESS.</p>
  <form onSubmit={submit} style={{display:'grid',gap:12}}>
   <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:12,color:'#111'}}/></label>
   <button disabled={loading} style={{background:'#2563eb',color:'white',padding:12,borderRadius:10}}>{loading?'Enviando…':'Enviar instruções'}</button>
  </form>
  {message&&<p role="status" style={{marginTop:16}}>{message}</p>}
  <p style={{marginTop:16}}><Link href="/auth/sign-in">Voltar ao login</Link></p>
 </main>;
}
