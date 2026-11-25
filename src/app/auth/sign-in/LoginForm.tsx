'use client';
import {Suspense,useActionState,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {Eye,EyeOff,LockKeyhole,Mail,LogIn,KeyRound} from 'lucide-react';
import {signInAction} from './actions';
import './login.css';

type LoginState = { error: string } | null;

// O aceite só é solicitado após o usuário enviar o formulário de login.
// A API existente continua validando sessão, e-mail confirmado e convite.
async function signInAndAccept(previous: LoginState, form: FormData): Promise<LoginState> {
 const token=String(form.get('inviteToken')||'');
 if(!/^[a-f0-9]{64}$/.test(token))return {error:'Convite inválido. Solicite um novo link ao responsável.'};
 const result=await signInAction(previous,form);
 if(result.error)return {error:result.error};
 if(!('inviteReady' in result)||result.inviteReady!==true)return {error:'Não foi possível concluir o acesso. Tente novamente.'};
 try {
  const response=await fetch('/api/equipe/convites/aceitar',{
   method:'POST',headers:{'Content-Type':'application/json'},
   credentials:'same-origin',cache:'no-store',body:JSON.stringify({token})
  });
  const data=await response.json();
  if(!response.ok||data.success!==true)return {error:typeof data.error==='string'?data.error:'Não foi possível liberar o convite. Confira seu acesso ou solicite outro link.'};
  window.location.replace('/');
  return null;
 }catch{
  return {error:'Não foi possível confirmar a liberação. Tente novamente. Se o convite já foi aceito, use o login normal.'};
 }
}

function LoginFormContent(){
 const search=useSearchParams();
 const token=search.get('token')||'';
 const valid=/^[a-f0-9]{64}$/.test(token);
 const query=valid?'?token='+encodeURIComponent(token):'';
 const [state,action,pending]=useActionState<LoginState,FormData>(valid?signInAndAccept:signInAction,null);
 const [showPassword,setShowPassword]=useState(false);
 return <main className="antares-login-scene">
  <form action={action} className="antares-login-card">
   <div className="antares-login-brand" aria-label="ANTARES BUSINESS — Planetário Móvel Digital">
    <div className="antares-login-mark" aria-hidden="true">✦<span>◌</span></div>
    <div className="antares-login-wordmark">ANTARES</div>
    <div className="antares-login-business">B U S I N E S S</div>
    <div className="antares-login-subtitle">PLANETÁRIO MÓVEL DIGITAL</div>
   </div>
   <h1>{valid?'Etapa 3 de 3 — Entrar e aceitar convite':'Acesse sua conta'}</h1>
   {valid&&<p style={{color:'#d7e9ff',textAlign:'center',fontSize:14}}>Use o e-mail confirmado e a senha cadastrada. Ao clicar em Entrar e aceitar convite, você autoriza sua entrada na equipe e o painel será aberto após a validação.</p>}
   {valid&&<input type="hidden" name="inviteToken" value={token}/>}
   <label className="antares-login-field"><Mail aria-hidden="true" size={21}/><span className="sr-only">E-mail</span><input name="email" type="email" placeholder="E-mail" required autoComplete="username"/></label>
   <label className="antares-login-field"><LockKeyhole aria-hidden="true" size={21}/><span className="sr-only">Senha</span><input name="password" type={showPassword?'text':'password'} placeholder="Senha" required autoComplete="current-password"/><button type="button" className="antares-login-eye" onClick={()=>setShowPassword(p=>!p)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword}>{showPassword?<EyeOff size={22}/>:<Eye size={22}/>}</button></label>
   {state?.error&&<p role="alert" className="antares-login-error">{state.error}</p>}
   <button className="antares-login-submit" disabled={pending} type="submit"><LogIn size={23}/>{pending?(valid?'Validando acesso…':'Entrando…'):valid?'ENTRAR E ACEITAR CONVITE':'ENTRAR'}</button>
   <Link className="antares-login-forgot" href="/auth/esqueci-senha"><KeyRound size={18}/> Esqueceu a senha?</Link>
   {valid&&<div className="antares-login-invite"><Link href={'/auth/primeiro-acesso'+query}>Criar conta (etapa 1)</Link><Link href={'/auth/verificar-email'+query}>Confirmar e-mail (etapa 2)</Link></div>}
  </form>
 </main>;
}
export default function LoginForm(){return <Suspense fallback={<main className="antares-login-scene"/>}><LoginFormContent/></Suspense>}
