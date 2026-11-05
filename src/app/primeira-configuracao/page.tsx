import {redirect} from 'next/navigation';
import Link from 'next/link';
import SetupReadiness from './SetupReadiness';
import {requireOwner} from '@/lib/equipe/auth';
export const dynamic='force-dynamic';
export default async function Page(){
 const owner=await requireOwner();if(!owner || !process.env.ANTARES_DEVELOPER_SUBJECT || owner.user.id!==process.env.ANTARES_DEVELOPER_SUBJECT)redirect('/sem-acesso');
 const agenda=process.env.ANTARES_AGENDA_WRITES_ENABLED==='true';
 const provider=process.env.ANTARES_PROVIDER_WRITES_ENABLED==='true';
 const blocks=[{title:'1. Minha Empresa',href:'/configuracoes/prestador',detail:'Dados do proprietário do planetário, usados em propostas e contratos. Escolas e instituições ficam em Clientes.',enabled:provider},
 {title:'2. Cúpulas do planetário',href:'/agenda/reservas',detail:'Cadastrar cada equipamento com nome, código e capacidade real de participantes.',enabled:agenda},
 {title:'3. Escola e primeira reserva',href:'/agenda/reservas',detail:'Vincular o cliente da proposta aceita à estrutura operacional e selecionar cúpula, data e horário.',enabled:agenda}];
 return <main style={{maxWidth:920,margin:'20px auto',padding:24,fontFamily:'system-ui',color:'#16345b'}}>
 <Link href="/">← Painel</Link><h1>Primeira configuração do planetário</h1>
 <p>Complete os três cadastros com dados reais confirmados pelo responsável. As gravações só ficam disponíveis após homologação e liberação individual.</p>
 <SetupReadiness/><div style={{display:'grid',gap:18}}>{blocks.map(item=><section key={item.title} style={{border:'1px solid #bfd0e7',borderRadius:12,padding:20}}>
 <h2>{item.title}</h2><p>{item.detail}</p>
 <p style={{fontWeight:650,color:item.enabled?'#17633c':'#a06210'}}>{item.enabled?'Gravação habilitada para esta área':'Gravação bloqueada até a homologação'}</p>
 <Link href={item.href} style={{display:'inline-block',background:'#1d4ed8',color:'#fff',padding:'10px 14px',borderRadius:8,textDecoration:'none'}}>Abrir cadastro</Link>
 </section>)}</div>
 <p style={{marginTop:22}}>O sistema não cria cúpulas fictícias nem copia dados pessoais automaticamente sem autorização. Quando concluir a configuração, verifique Agenda, documentos e permissões antes da entrega.</p>
 <Link href="/homologacao">Consultar homologação operacional</Link>
 </main>;
}
