import {redirect} from 'next/navigation';
import Link from 'next/link';
import SetupReadiness from './SetupReadiness';
import {requireOwner} from '@/lib/equipe/auth';
import './setup.css';

export const dynamic='force-dynamic';

export default async function Page(){
 const owner=await requireOwner();
 if(!owner || !process.env.ANTARES_DEVELOPER_SUBJECT || owner.user.id!==process.env.ANTARES_DEVELOPER_SUBJECT)redirect('/sem-acesso');
 const agenda=process.env.ANTARES_AGENDA_WRITES_ENABLED==='true';
 const provider=process.env.ANTARES_PROVIDER_WRITES_ENABLED==='true';
 const steps=[
  {number:'01',title:'Minha Empresa',description:'Identificação e dados usados nos documentos.',href:'/configuracoes/prestador',action:'Configurar empresa',enabled:provider},
  {number:'02',title:'Cúpulas',description:'Equipamentos e capacidade de atendimento.',href:'/agenda/reservas',action:'Gerenciar cúpulas',enabled:agenda},
  {number:'03',title:'Primeira reserva',description:'Escola, apresentação, data e cúpula.',href:'/agenda/reservas',action:'Abrir reservas',enabled:agenda}
 ];
 return <main className="antares-setup">
  <Link href="/?section=ajustes" className="antares-setup__back">← Configurações</Link>
  <header className="antares-setup__hero">
   <span className="antares-setup__eyebrow">ANTARES BUSINESS · CONFIGURAÇÃO</span>
   <h1>Primeira configuração</h1>
   <p>Prepare o planetário em três passos.</p>
  </header>
  <SetupReadiness/>
  <h2 className="antares-setup__sectiontitle">Etapas de implantação</h2>
  <div className="antares-setup__steps">
   {steps.map(step=><section className="antares-setup__step" key={step.number}>
    <span className="antares-setup__step-number">{step.number}</span>
    <h3>{step.title}</h3>
    <p>{step.description}</p>
    <span className={step.enabled?'antares-setup__access':'antares-setup__access antares-setup__access--locked'}>
     {step.enabled?'Edição liberada':'Edição ainda não liberada'}
    </span>
    <Link className="antares-setup__cta" href={step.href}>{step.action}</Link>
   </section>)}
  </div>
 </main>;
}
