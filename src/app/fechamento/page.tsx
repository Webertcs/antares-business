import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireOwner} from '@/lib/equipe/auth';
import SetupReadiness from '../primeira-configuracao/SetupReadiness';
export const dynamic='force-dynamic';
const items=[
 {heading:'Minha Empresa',href:'/configuracoes/prestador',key:'provider',description:'Gravar dados reais do proprietário e conferir no cadastro.'},
 {heading:'Agenda e cúpulas',href:'/agenda/reservas',key:'agenda',description:'Cadastrar as duas cúpulas e vincular escola e reserva reais.'},
 {heading:'Contratos',href:'/operacoes',key:'contracts',description:'Registrar somente contratação efetivamente autorizada.'},
 {heading:'Turmas',href:'/educacional',key:'education',description:'Cadastrar turmas informadas pela escola, sem dados fictícios.'},
 {heading:'Financeiro',href:'/financeiro/receber',key:'finance',description:'Conferir contas reais e recebimentos documentados.'}
] as const;
export default async function FechamentoPage(){
 if(!await requireOwner())redirect('/sem-acesso');
 const flags:Record<string,boolean>={
 provider:process.env.ANTARES_PROVIDER_WRITES_ENABLED==='true',
 agenda:process.env.ANTARES_AGENDA_WRITES_ENABLED==='true',
 contracts:process.env.ANTARES_CONTRACT_WRITES_ENABLED==='true',
 education:process.env.ANTARES_EDUCATION_WRITES_ENABLED==='true',
 finance:process.env.ANTARES_FINANCE_WRITES_ENABLED==='true'
 };
 return <main style={{maxWidth:960,margin:'20px auto',padding:24,fontFamily:'system-ui',color:'#15365f'}}>
 <Link href="/">← Voltar ao painel</Link><h1>Central de fechamento do ANTARES</h1>
 <p>Três frentes para entrega. O painel exibe apenas o estado atual; não grava dados nem altera permissões.</p>
 <h2>1. Gravações reais</h2>
 <p>Uma área por vez, com backup confirmado e operação autorizada. Após cada gravação, confira a leitura no CRM e retorne a flag para desligada.</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(245px,1fr))',gap:12}}>
 {items.map(x=><section key={x.key} style={{border:'1px solid #c5d6ed',padding:16,borderRadius:12}}>
 <strong>{x.heading}</strong><p style={{fontSize:14}}>{x.description}</p>
 <p style={{fontWeight:700,color:flags[x.key]?'#a06500':'#1d633c'}}>{flags[x.key]?'Gravação habilitada — requer controle':'Gravação desabilitada'}</p>
 <Link href={x.href}>Abrir área</Link>
 </section>)}</div>
 <h2 style={{marginTop:28}}>2. Configuração do cliente</h2>
 <SetupReadiness/>
 <p>Confirmar dados jurídicos da empresa, nome/código/capacidade das duas cúpulas, escola e representante. Não cadastrar valores fictícios.</p>
 <Link href="/primeira-configuracao">Abrir Primeira Configuração</Link>
 <h2 style={{marginTop:28}}>3. Preparação da entrega</h2>
 <ul><li>Snapshot recuperável e credenciais rotacionadas.</li><li>HTTPS, domínio e variáveis de produção revisados.</li><li>Permissões de proprietário e colaborador conferidas.</li><li>PWA Android instalado e testado; documentos PDF revisados.</li><li>Aceite do responsável registrado.</li></ul>
 <p style={{padding:14,borderRadius:8,background:'#fff2d9'}}>Sem dados definitivos ou snapshot confirmado, as gravações devem permanecer desabilitadas. Testes SQL reversíveis não comprovam gravação HTTP positiva.</p>
 <Link href="/homologacao">Ver auditorias anteriores</Link>
 </main>;
}
