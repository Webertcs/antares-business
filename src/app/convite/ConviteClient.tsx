'use client';
import { useState } from 'react';
export default function ConviteClient() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function accept() {
    setBusy(true); setMessage('');
    try {
      const token = new URLSearchParams(window.location.search).get('token');
      const result = await fetch('/api/equipe/convites/aceitar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }), cache: 'no-store'
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Erro ao aceitar');
      setMessage('Convite aceito! Acesse o painel.');
      window.history.replaceState({}, '', '/convite');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Erro ao aceitar convite'); }
    finally { setBusy(false); }
  }
  return <main style={{maxWidth:520,margin:'12vh auto',padding:30,fontFamily:'system-ui'}}>
    <h1 style={{fontSize:27,fontWeight:750}}>Convite ANTARES BUSINESS</h1>
    <p>Entre com o e-mail que recebeu o convite e confirme o endereço antes de aceitar. O convite expira em 48 horas.</p>
    <p><a href="/auth/sign-in">Entrar na minha conta</a> · <a href="/auth/verificar-email">Verificar meu e-mail</a></p>
    <button disabled={busy} onClick={accept} style={{background:'#2563eb',padding:12,borderRadius:8,color:'#fff'}}>{busy?'Verificando...':'Aceitar convite'}</button>
    {message && <p role="status">{message}</p>}
    <p><a href="/">Ir ao painel</a></p>
  </main>;
}
