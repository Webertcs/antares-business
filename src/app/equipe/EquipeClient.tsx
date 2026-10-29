'use client';
import { useEffect, useState } from 'react';
type Member = { id: string; full_name: string; email: string | null; role: string; active: boolean };
export default function EquipeClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    let alive = true;
    fetch('/api/equipe', { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error('Acesso negado ou falha de consulta'); return r.json(); })
      .then(data => { if (alive) setMembers(data.members ?? []); })
      .catch(() => { if (alive) setError('Não foi possível carregar a equipe.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setFeedback(''); setLink('');
    try {
      const response = await fetch('/api/equipe/convites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store', body: JSON.stringify({ name, email })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível gerar o convite');
      setLink(new URL(result.link, window.location.origin).toString());
      setFeedback('Convite gerado. Copie o link e envie somente ao endereço convidado. Válido por 48 horas.');
    } catch (e) { setFeedback(e instanceof Error ? e.message : 'Falha ao gerar convite'); }
    finally { setSending(false); }
  }
  return <main style={{maxWidth:1000,margin:'40px auto',padding:24,fontFamily:'system-ui'}}>
    <a href="/">← Voltar ao painel</a>
    <h1 style={{fontSize:28,fontWeight:750}}>Equipe e permissões</h1>
    <p>Gerencie colaboradores vinculados ao seu planetário.</p>
    {loading ? <p>Carregando...</p> : error ? <p role="alert">{error}</p> : <table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th></tr></thead>
      <tbody>{members.map(m => <tr key={m.id}><td>{m.full_name}</td><td>{m.email||'—'}</td>
        <td>{m.role==='owner'?'Proprietário':'Colaborador'}</td><td>{m.active?'Ativo':'Inativo'}</td></tr>)}</tbody>
    </table>}
    <section style={{marginTop:30,padding:24,border:'1px solid #64748b',borderRadius:14}}>
      <h2 style={{fontSize:21,fontWeight:700}}>Convidar colaborador</h2>
      <p>O convidado precisa entrar com o mesmo e-mail e confirmar a conta. Não é possível convidar outro proprietário.</p>
      <form onSubmit={invite} style={{display:'grid',gap:12,maxWidth:460}}>
        <label>Nome completo<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} style={{display:'block',width:'100%',padding:10,color:'#111',background:'#fff'}}/></label>
        <label>E-mail do colaborador<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:10,color:'#111',background:'#fff'}}/></label>
        <button type="submit" disabled={sending} style={{padding:12,borderRadius:10,color:'#fff',background:'#2563eb'}}>{sending?'Gerando convite...':'Gerar convite de 48 horas'}</button>
      </form>
      {feedback && <p role="status">{feedback}</p>}
      {link && <div><input readOnly aria-label="Link do convite" value={link} style={{width:'100%',padding:10,color:'#111',background:'#fff'}}/>
        <button onClick={async()=>{try{await navigator.clipboard.writeText(link);setFeedback('Link copiado.')}catch{setFeedback('Selecione e copie o link acima.')}}} style={{padding:10,marginTop:8,borderRadius:8,background:'#334155',color:'#fff'}}>Copiar link</button></div>}
    </section>
    <p style={{marginTop:24,opacity:.75}}>Suspensão de acessos e transferência de propriedade exigem auditoria e serão liberadas depois da homologação.</p>
  </main>;
}
