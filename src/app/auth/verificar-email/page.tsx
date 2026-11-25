'use client';
import { Suspense, useActionState, useState } from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import { enviarCodigo, confirmarCodigo } from './actions';
import '../onboarding.css';

const field = {width:'100%',padding:12,color:'#111',background:'#fff',border:'1px solid #94a3b8',borderRadius:7} as const;

function VerificarEmailContent() {
  const search=useSearchParams();const token=search.get('token')||'';const query=/^[a-f0-9]{64}$/.test(token)?'?token='+encodeURIComponent(token):'';
  const [email, setEmail] = useState('');
  const [sendState, sendAction, sending] = useActionState(enviarCodigo, null);
  const [verifyState, verifyAction, verifying] = useActionState(confirmarCodigo, null);
  return <main className="antares-onboarding"><section className="onboard-card"><header className="onboard-header"><span className="onboard-eyebrow">ANTARES BUSINESS · EQUIPE</span><h1>{query?'Etapa 2 de 3 — Confirmar e-mail':'Confirmar e-mail'}</h1></header><div className="onboard-body">
    <p>Informe o e-mail usado no cadastro e digite o código de seis dígitos recebido. Se precisar, solicite um novo código.</p><p className="onboard-note">Confira também a pasta de spam.</p>
    {verifyState?.ok ? <><p role="status" className="onboard-success">✓ E-mail confirmado com sucesso!</p><div className="onboard-actions"><Link href={"/auth/sign-in"+query} className="onboard-button onboard-primary">{query?'Ir para etapa 3 — Entrar e aceitar convite':'Ir para o login'}</Link></div></> : <>
      <form action={sendAction} style={{display:'grid',gap:12}}>
        <label>E-mail<input style={field} type="email" name="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <button className="onboard-button onboard-secondary" disabled={sending}>{sending?'Enviando...':'Solicitar código de verificação'}</button>
        {sendState?.error && <p role="alert" style={{color:'#b91c1c'}}>{sendState.error}</p>}
        {sendState?.ok && <p role="status">Se o envio for permitido, o código chegará ao seu e-mail. Confira o spam e digite o código mais recente abaixo.</p>}
      </form>
      <form action={verifyAction} style={{display:'grid',gap:12}}>
        <input type="hidden" name="email" value={email}/>
        <label>Código de seis dígitos<input style={field} name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000"/></label>
        <button className="onboard-button onboard-primary" disabled={verifying || !email}>{verifying?'Confirmando...':'Confirmar meu e-mail'}</button>
        {verifyState?.error && <p role="alert" style={{color:'#b91c1c'}}>{verifyState.error}</p>}
      </form>
      <div className="onboard-actions onboard-footer"><Link href={"/auth/sign-in"+query} className="onboard-button onboard-secondary">Voltar ao login</Link>{query&&<Link href={"/auth/primeiro-acesso"+query} className="onboard-button onboard-tertiary">Voltar para etapa 1</Link>}</div>
    </>}
  </div></section></main>;
}

export default function VerificarEmail(){return <Suspense fallback={<p>Carregando...</p>}><VerificarEmailContent/></Suspense>}
