'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { enviarCodigo, confirmarCodigo } from './actions';

const box = {display:'grid',gap:14,maxWidth:400,margin:'10vh auto',padding:28,border:'1px solid #94a3b8',borderRadius:16} as const;
const field = {width:'100%',padding:12,color:'#111',background:'#fff',border:'1px solid #94a3b8',borderRadius:7} as const;
const button = {padding:12,background:'#2563eb',borderRadius:10,color:'white',cursor:'pointer'} as const;

export default function VerificarEmail() {
  const [email, setEmail] = useState('');
  const [sendState, sendAction, sending] = useActionState(enviarCodigo, null);
  const [verifyState, verifyAction, verifying] = useActionState(confirmarCodigo, null);
  return <main style={box}>
    <h1 style={{fontSize:24,fontWeight:750}}>Confirmar e-mail</h1>
    <p>ANTARES BUSINESS — confirme seu endereço para ativar o login.</p>
    {verifyState?.ok ? <><p role="status" style={{color:'#15803d'}}>E-mail confirmado. Agora tente entrar.</p><Link href="/auth/sign-in">Ir para o login</Link></> : <>
      <form action={sendAction} style={{display:'grid',gap:12}}>
        <label>E-mail<input style={field} type="email" name="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <button style={button} disabled={sending}>{sending?'Enviando...':'Enviar código de verificação'}</button>
        {sendState?.error && <p role="alert" style={{color:'#b91c1c'}}>{sendState.error}</p>}
        {sendState?.ok && <p role="status">Se o envio for permitido para esta conta, você receberá um código no e-mail. Confira também o spam.</p>}
      </form>
      <form action={verifyAction} style={{display:'grid',gap:12}}>
        <input type="hidden" name="email" value={email}/>
        <label>Código de seis dígitos<input style={field} name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000"/></label>
        <button style={button} disabled={verifying || !email}>{verifying?'Confirmando...':'Confirmar código'}</button>
        {verifyState?.error && <p role="alert" style={{color:'#b91c1c'}}>{verifyState.error}</p>}
      </form>
      <Link href="/auth/sign-in">Voltar ao login</Link>
    </>}
  </main>;
}
