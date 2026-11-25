'use client';
import { useEffect, useState } from 'react';
type Invitation = { id: string; invited_name: string; invited_email: string; expires_at: string };
type Member = { id: string; full_name: string; email: string | null; role: string; active: boolean; archived_at?: string | null; technical?: boolean };
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
  const [securityReady, setSecurityReady] = useState(false);
  const [checkingSecurity, setCheckingSecurity] = useState(true);
  const [managementReady, setManagementReady] = useState(false);
  const [busyMember, setBusyMember] = useState<string | null>(null);
  const canWrite = writesEnabled && securityReady;
  const visibleMembers = members.filter(m => !m.archived_at);
  const archivedMembers = members.filter(m => m.archived_at);
  useEffect(() => {
    let alive = true;
    fetch('/api/equipe/preflight', {cache:'no-store'})
      .then(async r => {const data=await r.json();if(!r.ok)throw Error(data.error||'Verificação indisponível');return data;})
      .then(data => {if(alive){setSecurityReady(data.readyForControlledTest===true);setManagementReady(data.managementReady===true);}})
      .catch(()=>{if(alive)setSecurityReady(false);})
      .finally(()=>{if(alive)setCheckingSecurity(false);});
    return ()=>{alive=false};
  }, []);
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
    if (!canWrite || !window.confirm('Revogar o convite para ' + invitation.invited_email + '?')) return;
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
    if (!canWrite || member.role !== 'collaborator' || !member.active || !window.confirm('Suspender acesso de ' + member.full_name + '?')) return;
    try {
      const response = await fetch('/api/equipe/suspender', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }), cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao suspender');
      setMembers(previous => previous.map(item => item.id === member.id ? { ...item, active: false } : item));
      setFeedback('Acesso suspenso. O cadastro continua disponível para consulta.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha ao suspender acesso'); }
  }
  async function manage(member: Member, action: 'reactivate' | 'archive') {
    if (!canWrite || !managementReady || busyMember || member.role !== 'collaborator' || member.active) return;
    const message = action === 'archive'
      ? 'Remover ' + member.full_name + ' da lista da equipe? O acesso continuará bloqueado e o histórico será preservado.'
      : 'Restabelecer o acesso de ' + member.full_name + '?';
    if (!window.confirm(message)) return;
    setBusyMember(member.id); setFeedback('');
    try {
      const response = await fetch('/api/equipe/gerenciar', {
        method: 'POST', headers: {'Content-Type':'application/json'}, cache:'no-store',
        body: JSON.stringify({memberId:member.id, action})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o acesso.');
      const refreshed = await fetch('/api/equipe', {cache:'no-store'});
      if (!refreshed.ok) { setFeedback('Alteração registrada. Atualize a página para conferir.'); return; }
      const data = await refreshed.json(); setMembers(data.members ?? []);
      setFeedback(action === 'archive' ? 'Colaborador removido da lista principal. Histórico preservado.' : 'Acesso reativado.');
    } catch (e) { setFeedback(e instanceof Error ? e.message : 'Falha ao gerenciar acesso.'); }
    finally { setBusyMember(null); }
  }
  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
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
      setFeedback('Convite gerado! Copie o link e envie ao colaborador por WhatsApp ou e-mail. O sistema não envia o convite automaticamente. Válido por 48 horas.');
    } catch (e) { setFeedback(e instanceof Error ? e.message : 'Falha ao gerar convite'); }
    finally { setSending(false); }
  }
  return <main className="team-refined team-premium">
    <header className="team-premium-header"><span className="team-premium-eyebrow">GESTÃO DE ACESSOS</span><h1>Equipe e permissões</h1></header>
    <div className="team-premium-body">
    <div className="team-premium-summary"><div><strong>{visibleMembers.length}</strong><span>Integrantes</span></div><div><strong>{visibleMembers.filter(m=>m.active).length}</strong><span>Ativos</span></div><div><strong>{invitations.length}</strong><span>Convites pendentes</span></div></div>
    <h2 className="team-section-title">Pessoas com acesso</h2>
    {loading ? <p>Carregando...</p> : error ? <p role="alert">{error}</p> : <table className="team-table">
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead>
      <tbody>{visibleMembers.map(m => <tr key={m.id}><td>{m.full_name}</td><td>{m.email||'—'}</td>
        <td>{m.technical?'Administrador técnico':m.role==='owner'?'Proprietário':'Colaborador'}</td><td>{m.active?'Ativo':'Inativo'}</td><td>{canWrite && m.role==='collaborator' ? m.active ? <button disabled={!!busyMember} onClick={()=>suspend(m)} style={{padding:8,borderRadius:8,color:'#fff',background:'#9f1239'}}>Suspender</button> : managementReady ? <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button disabled={!!busyMember} onClick={()=>manage(m,'reactivate')} style={{padding:8,borderRadius:8,color:'#fff',background:'#2563eb'}}>Reativar</button><button disabled={!!busyMember} onClick={()=>manage(m,'archive')} style={{padding:8,borderRadius:8,color:'#fff',background:'#9f1239'}}>Remover da equipe</button></div> : '—' : '—'}</td></tr>)}</tbody>
    </table>}
    {archivedMembers.length > 0 && <details className="team-panel team-premium-panel">
      <summary>Ex-colaboradores ({archivedMembers.length})</summary>
      <p>Sem acesso ao sistema. O histórico das apresentações é preservado.</p>
      {archivedMembers.map(m=><div key={m.id} style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:10}}><strong>{m.full_name}</strong>{canWrite && managementReady && <button disabled={!!busyMember} onClick={()=>manage(m,'reactivate')} style={{padding:8,borderRadius:8,color:'#fff',background:'#2563eb'}}>Reativar</button>}</div>)}
    </details>}
    <section className="team-panel team-premium-panel">
      <h2>Convidar colaborador</h2>
      {!canWrite && <p role="status" style={{color:'#92400e',fontWeight:700}}>{checkingSecurity ? 'Verificando permissões de segurança...' : 'Não é possível enviar convites neste momento.'}</p>}
      <p>Informe o nome e o e-mail do colaborador. Depois, copie o link gerado e envie a ele por WhatsApp ou e-mail. O convite não é enviado automaticamente. O colaborador deverá usar o mesmo e-mail, confirmar o endereço e clicar em Entrar e aceitar convite. O painel abrirá após a validação.</p>
      <form onSubmit={invite} className="team-invite-form">
        <label>Nome completo<input disabled={!canWrite} required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} style={{display:'block',width:'100%',padding:10,color:'#111',background:'#fff'}}/></label>
        <label>E-mail do colaborador<input disabled={!canWrite} required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:10,color:'#111',background:'#fff'}}/></label>
        <button type="submit" disabled={!canWrite || sending} style={{padding:12,borderRadius:10,color:'#fff',background:'#2563eb'}}>{sending?'Gerando convite...':'Gerar convite de 48 horas'}</button>
      </form>
      {feedback && <p role="status">{feedback}</p>}
      {link && <div><input readOnly aria-label="Link do convite" value={link} style={{width:'100%',padding:10,color:'#111',background:'#fff'}}/>
        <button onClick={async()=>{try{await navigator.clipboard.writeText(link);setFeedback('Link copiado.')}catch{setFeedback('Selecione e copie o link acima.')}}} style={{padding:10,marginTop:8,borderRadius:8,background:'#334155',color:'#fff'}}>Copiar link</button></div>}
    </section>
    <section className="team-panel team-premium-panel">
      <h2>Convites pendentes</h2>
      {invitations.length === 0 ? <p>Nenhum convite pendente.</p> :
        <ul style={{display:'grid',gap:12}}>{invitations.map(inv => <li key={inv.id}>
          <strong>{inv.invited_name}</strong> — {inv.invited_email} (até {new Date(inv.expires_at).toLocaleDateString('pt-BR')})
          {canWrite && <button onClick={()=>revoke(inv)} style={{marginLeft:12,padding:8,borderRadius:8,color:'#fff',background:'#9f1239'}}>Revogar</button>}
        </li>)}</ul>}
    </section></div>
  </main>;
}
