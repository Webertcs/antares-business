'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Mail, Send } from 'lucide-react';
import '../sign-in/login.css';

export default function EsqueciSenha() {
 const [email,setEmail]=useState('');
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();
  if(loading)return;
  setLoading(true);setMessage('');setError(false);
  try {
   const res=await fetch('/api/auth/request-password-reset',{
    method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
    body:JSON.stringify({email:email.trim(),redirectTo:`${window.location.origin}/auth/redefinir-senha`})
   });
   if(res.ok) {
    setMessage('Se este e-mail estiver cadastrado, você receberá uma mensagem para recuperar sua senha. Confira também o spam.');
   } else {
    setError(true);
    setMessage('Não foi possível enviar o e-mail agora. Tente novamente mais tarde.');
   }
  } catch {
   setError(true);setMessage('Não foi possível conectar ao serviço. Tente novamente mais tarde.');
  } finally {setLoading(false);}
 }
 return <main className="antares-login-scene">
  <section className="antares-login-card" aria-labelledby="recovery-title" style={{marginTop:0}}>
   <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
    <KeyRound size={24} aria-hidden="true" color="#66d6ff"/>
    <h1 id="recovery-title" style={{margin:0}}>Esqueceu a senha?</h1>
   </div>
   <p style={{color:'#d7e9ff',textAlign:'center',fontSize:15,lineHeight:1.5,margin:'4px 0 8px'}}>
    Digite seu e-mail para recuperar sua senha.
   </p>
   <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:15}}>
    <label className="antares-login-field">
     <Mail size={20} aria-hidden="true"/>
     <span className="sr-only">E-mail</span>
     <input type="email" name="email" autoComplete="email" placeholder="E-mail" required value={email} onChange={e=>setEmail(e.target.value)} disabled={loading}/>
    </label>
    <button className="antares-login-submit" type="submit" disabled={loading}>
     <Send size={20} aria-hidden="true"/>{loading?'ENVIANDO…':'ENVIAR E-MAIL'}
    </button>
   </form>
   {message&&<p role={error?'alert':'status'} style={{border:'1px solid '+(error?'#ff9c9c':'#5bbcff'),borderRadius:10,padding:12,fontSize:14,lineHeight:1.5,color:'#fff',background:error?'#63212a':'#123b6d'}}>{message}</p>}
   <Link href="/auth/sign-in" className="antares-login-forgot"><ArrowLeft size={18} aria-hidden="true"/>Voltar ao login</Link>
  </section>
 </main>;
}
