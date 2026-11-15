'use client';
import {Suspense,useActionState,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {Eye,EyeOff,LockKeyhole,Mail,LogIn,KeyRound} from 'lucide-react';
import {signInAction} from './actions';
import './login.css';

function LoginFormContent(){
 const search=useSearchParams();
 const token=search.get('token')||'';
 const valid=/^[a-f0-9]{64}$/.test(token);
 const query=valid?'?token='+encodeURIComponent(token):'';
 const [state,action,pending]=useActionState(signInAction,null);
 const [showPassword,setShowPassword]=useState(false);
 return <main className="antares-login-scene">
  <form action={action} className="antares-login-card">
   <div className="antares-login-brand" aria-label="ANTARES BUSINESS — Planetário Móvel Digital">
    <div className="antares-login-mark" aria-hidden="true">✦<span>◌</span></div>
    <div className="antares-login-wordmark">ANTARES</div>
    <div className="antares-login-business">B U S I N E S S</div>
    <div className="antares-login-subtitle">PLANETÁRIO MÓVEL DIGITAL</div>
   </div>
   <h1>Acesse sua conta</h1>
   {valid&&<input type="hidden" name="inviteToken" value={token}/>}
   <label className="antares-login-field"><Mail aria-hidden="true" size={21}/><span className="sr-only">E-mail</span><input name="email" type="email" placeholder="E-mail" required autoComplete="username"/></label>
   <label className="antares-login-field"><LockKeyhole aria-hidden="true" size={21}/><span className="sr-only">Senha</span><input name="password" type={showPassword?'text':'password'} placeholder="Senha" required autoComplete="current-password"/><button type="button" className="antares-login-eye" onClick={()=>setShowPassword(p=>!p)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword}>{showPassword?<EyeOff size={22}/>:<Eye size={22}/>}</button></label>
   {state?.error&&<p role="alert" className="antares-login-error">{state.error}</p>}
   <button className="antares-login-submit" disabled={pending} type="submit"><LogIn size={23}/>{pending?'Entrando…':'ENTRAR'}</button>
   <Link className="antares-login-forgot" href="/auth/esqueci-senha"><KeyRound size={18}/> Esqueceu a senha?</Link>
   {valid&&<div className="antares-login-invite"><Link href={'/auth/primeiro-acesso'+query}>Ativar meu convite</Link><Link href={'/auth/verificar-email'+query}>Confirmar e-mail</Link></div>}
  </form>
 </main>;
}
export default function LoginForm(){return <Suspense fallback={<main className="antares-login-scene"/>}><LoginFormContent/></Suspense>}
