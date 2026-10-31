'use client';
import { useEffect, useState } from 'react';
type Invitation = { id: string; invited_name: string; invited_email: string; expires_at: string };
type Member = { id: string; full_name: string; email: string | null; role: string; active: boolean };
export default function EquipeClient({ writesEnabled }: { writesEnabled: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
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
  async function refreshInvitations() {
    try {
      const response = await fetch('/api/equipe/convites', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
    } catch { /* Não impede a listagem de membros. */ }
  }
  useEffect(() => { void refreshInvitations(); }, []);
  async function revoke(invitation: Invitation) {
    if (!writesEnabled || !window.confirm('Revogar o convite para ' + invitation.invited_email + '?')) return;
    setFeedback('');
    try {
      const response = await fetch('/api/equipe/convites/revogar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        cache: 'no-store', body: JSON.stringify({ invitationId: invitation.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao revogar convite');
      setInvitations(current => current.filter(item => item.id !== invitation.id));
      setFeedback('Convite revogado com sucesso.');
    } catch (e) { setFeedback(e instanceof Error ? e.message : 'Erro ao revogar convite'); }
  }
  async function suspend(member: Member) {
    if (!writesEnabled || member.role !== 'collaborator' || !member.active || !window.confirm('Suspender acesso de ' + member.full_name + '?')) return;
    try {
      const response = await fetch('/api/equipe/suspender', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }), cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao suspender');
      setMembers(previous => previous.map(item => item.id === member.id ? { ...item, active: false } : item));
      setFeedback('Acesso suspenso. A conta permanece registrada para auditoria.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha ao suspender acesso'); }
  }
  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writesEnabled) return;
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
      void refreshInvitations();
      setFeedback('Convite gerado. Copie o link e envie somente ao endereço convidado. Válido por 48 horas.');
    } catch (e) { setFeedback(e instanceof Error ? e.message : 'Falha ao gerar convite'); }
    finally { setSending(false); }
  }
  return <main style={{maxWidth:1000,margin:'40px auto',padding:24,fontFamily:'system-ui'}}>
    <a href="/">← Voltar ao painel</a>
    <h1 style={{fontSize:28,fontWeight:750}}>Equipe e permissões</h1>
    <p>Gerencie colaboradores vinculados ao seu planetário.</p>
    {loading ? <p>Carregando...</p> : error ? <p role="alert">{error}</p> : <table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead>
      <tbody>{members.map(m => <tr key={m.id}><td>{m.full_name}</td><td>{m.email||'—'}</td>
        <td>{m.role==='owner'?'Proprietário':'Colaborador'}</td><td>{m.active?'Ativo':'Inativo'}</td><td>{writesEnabled && m.role==='collaborator' && m.active ? <button onClick={()=>suspend(m)} style={{padding:8,borderRadius:8,color:'#fff',background:'#9f1239'}}>Suspender</button> : '—'}</td></tr>)}</tbody>
    </table>}
    <section style={{marginTop:30,padding:24,border:'1px solid #64748b',borderRadius:14}}>
      <h2 style={{fontSize:21,fontWeight:700}}>Convidar colaborador</h2>
      {!writesEnabled && <p role="status" style={{color:'#92400e',fontWeight:700}}>Convites temporariamente indisponíveis: configuração de segurança em andamento.</p>}
      <p>O convidado precisa entrar com o mesmo e-mail e confirmar a conta. Não é possível convidar outro proprietário.</p>
      <form onSubmit={invite} style={{display:'grid',gap:12,maxWidth:460}}>
        <label>Nome completo<input disabled={!writesEnabled} required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} style={{display:'block',width:'100%',padding:10,color:'#111',background:'#fff'}}/></label>
        <label>E-mail do colaborador<input disabled={!writesEnabled} required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:10,color:'#111',background:'#fff'}}/></label>
        <button type="submit" disabled={!writesEnabled || sending} style={{padding:12,borderRadius:10,color:'#fff',background:'#2563eb'}}>{sending?'Gerando convite...':'Gerar convite de 48 horas'}</button>
      </form>
      {feedback && <p role="status">{feedback}</p>}
      {link && <div><input readOnly aria-label="Link do convite" value={link} style={{width:'100%',padding:10,color:'#111',background:'#fff'}}/>
        <button onClick={async()=>{try{await navigator.clipboard.writeText(link);setFeedback('Link copiado.')}catch{setFeedback('Selecione e copie o link acima.')}}} style={{padding:10,marginTop:8,borderRadius:8,background:'#334155',color:'#fff'}}>Copiar link</button></div>}
    </section>
    <section style={{marginTop:24}}>
      <h2 style={{fontSize:21,fontWeight:700}}>Convites pendentes</h2>
      {invitations.length === 0 ? <p>Nenhum convite pendente.</p> :
        <ul style={{display:'grid',gap:12}}>{invitations.map(inv => <li key={inv.id}>
          <strong>{inv.invited_name}</strong> — {inv.invited_email} (até {new Date(inv.expires_at).toLocaleDateString('pt-BR')})
          {writesEnabled && <button onClick={()=>revoke(inv)} style={{marginLeft:12,padding:8,borderRadius:8,color:'#fff',background:'#9f1239'}}>Revogar</button>}
        </li>)}</ul>}
    </section>
    <p style={{marginTop:24,opacity:.75}}>Suspensão e convites serão habilitados após validação de permissões. Transferência de propriedade ainda não está disponível.</p>
  </main>;
}
