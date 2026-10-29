'use client';
import { useEffect, useState } from 'react';
type Member = { id: string; full_name: string; email: string | null; role: string; active: boolean };
export default function EquipeClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch('/api/equipe', { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error('Acesso negado ou falha de consulta'); return r.json(); })
      .then(data => { if (alive) setMembers(data.members ?? []); })
      .catch(() => { if (alive) setError('Não foi possível carregar a equipe.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return <main style={{maxWidth:1000, margin:'40px auto', padding:24, fontFamily:'system-ui'}}>
    <a href="/">← Voltar ao painel</a>
    <h1>Equipe e permissões</h1>
    <p>Visualização segura dos integrantes da sua organização.</p>
    {loading ? <p>Carregando...</p> : error ? <p role="alert">{error}</p> : <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th></tr></thead>
      <tbody>{members.map(m => <tr key={m.id}>
        <td>{m.full_name}</td><td>{m.email || '—'}</td><td>{m.role === 'owner' ? 'Proprietário' : 'Colaborador'}</td><td>{m.active ? 'Ativo' : 'Inativo'}</td>
      </tr>)}</tbody>
    </table>}
    <p style={{marginTop:24, opacity:.75}}>Convites, suspensão e transferência de propriedade serão liberados após implementação e homologação dos controles de identidade e auditoria. Não utilizamos alterações diretas de perfil pelo navegador.</p>
  </main>;
}
