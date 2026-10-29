'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { signInAction } from './actions';
export default function LoginForm(){
 const [state, action, pending] = useActionState(signInAction, null);
 const [showPassword,setShowPassword] = useState(false);
 return <form action={action} style={{display:'grid',gap:14,maxWidth:380,margin:'12vh auto',padding:28,border:'1px solid #334155',borderRadius:16}}>
  <h1 style={{fontSize:25,fontWeight:750}}>ANTARES BUSINESS</h1>
  <p>Entre com uma conta autorizada do planetário.</p>
  <label>E-mail<input name="email" type="email" required autoComplete="username" style={{width:'100%',padding:12,color:'#111',background:'white'}}/></label>
  <label>Senha<span style={{display:'flex',alignItems:'stretch',gap:4}}><input name="password" type={showPassword?'text':'password'} required autoComplete="current-password" style={{width:'100%',minWidth:0,padding:12,color:'#111',background:'white'}}/><button type="button" onClick={()=>setShowPassword(p=>!p)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} title={showPassword?'Ocultar senha':'Mostrar senha'} style={{border:'1px solid #94a3b8',borderRadius:8,padding:'0 11px',background:'#fff',color:'#111',cursor:'pointer'}}>{showPassword?'🙈':'👁️'}</button></span></label>
  {state?.error && <p role="alert" style={{color:'#ef4444'}}>{state.error}</p>}
  <button disabled={pending} style={{padding:12,background:'#2563eb',borderRadius:10,color:'white'}}>{pending?'Entrando…':'Entrar'}</button>
  <Link href="/auth/esqueci-senha">Esqueci minha senha</Link>
  <Link href="/auth/verificar-email">Confirmar meu e-mail</Link>
  <Link href="/vitrine">Ver vitrine pública</Link>
 </form>;
}
