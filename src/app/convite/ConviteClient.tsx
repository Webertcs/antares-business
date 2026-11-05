'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
function ConviteFlow() {
  const search=useSearchParams();
  const token=search.get('token')||'';
  const query=/^[a-f0-9]{64}$/.test(token)?'?token='+encodeURIComponent(token):'';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function accept() {
    setBusy(true); setMessage('');
    try {
      if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Convite inválido. Solicite um novo link ao proprietário.');
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
    <div style={{display:"grid",gap:12,margin:"20px 0"}}><a href={"/auth/primeiro-acesso"+query} style={{background:"#2563eb",color:"#fff",padding:13,borderRadius:9,textAlign:"center",fontWeight:700}}>É meu primeiro acesso · Criar conta</a><a href={"/auth/sign-in"+query}>Já tenho conta · Entrar</a><a href={"/auth/verificar-email"+query}>Preciso confirmar meu e-mail</a></div><p>Depois de entrar com o e-mail convidado, volte a esta página para aceitar o convite.</p>
    <button disabled={busy} onClick={accept} style={{background:'#2563eb',padding:12,borderRadius:8,color:'#fff'}}>{busy?'Verificando...':'Aceitar convite'}</button>
    {message && <p role="status">{message}</p>}
    <p><a href="/">Ir ao painel</a></p>
  </main>;
}

export default function ConviteClient(){return <Suspense fallback={<p>Carregando convite...</p>}><ConviteFlow/></Suspense>}
