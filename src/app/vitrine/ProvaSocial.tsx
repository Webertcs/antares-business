import {ArrowRight,CalendarCheck2,GraduationCap,HeartHandshake,Quote,ShieldCheck,Sparkles} from 'lucide-react';
import {authorizedTestimonials,verifiedMetrics} from './prova-social';

const commitments=[
 {title:'A visita é planejada com a escola',description:'Alinhamos a proposta, a data e a organização da experiência com a instituição.',icon:CalendarCheck2},
 {title:'Descobertas para cada faixa etária',description:'Temas e linguagem podem ser adequados ao público de cada turma.',icon:GraduationCap},
 {title:'Atendimento próximo e personalizado',description:'A equipe recebe sua solicitação e prepara as condições conforme o formato do evento.',icon:HeartHandshake}
] as const;

export default function ProvaSocial(){
 const metrics=verifiedMetrics.filter(m=>m.verified&&Number.isInteger(m.count)&&m.count>0&&Boolean(m.label.trim())&&Boolean(m.period.trim()));
 const testimonials=authorizedTestimonials.filter(t=>t.authorized&&Boolean(t.quote.trim())&&Boolean(t.institution.trim())&&Boolean(t.displayName.trim()));
 return <section id="confianca" className="premium-proof" aria-labelledby="premium-proof-title">
  <div className="premium-proof-heading">
   <span>✦ A CONFIANÇA TAMBÉM FAZ PARTE DA VIAGEM</span>
   <h2 id="premium-proof-title">Uma experiência pensada para sua escola, do primeiro contato à última descoberta.</h2>
   <p>Mais do que conhecer os planetas, queremos que cada visita seja bem planejada, acolhedora e inspiradora para a turma.</p>
  </div>
  {metrics.length>0&&<div className="premium-proof-metrics" aria-label="Resultados verificados do planetário">
   {metrics.map(m=><div className="premium-proof-metric" key={m.id}>
    <strong>{m.count.toLocaleString('pt-BR')}</strong>
    <span>{m.label}</span><small>{m.period}</small>
   </div>)}
  </div>}
  {testimonials.length>0&&<div className="premium-proof-testimonials" aria-label="Depoimentos autorizados">
   {testimonials.map(t=><figure key={t.id}>
    <Quote size={26} aria-hidden="true"/>
    <blockquote>{t.quote}</blockquote>
    <figcaption><strong>{t.displayName}</strong><span>{t.institution}</span></figcaption>
   </figure>)}
  </div>}
  <div className="premium-proof-grid">
   {commitments.map(c=><article key={c.title}>
    <div className="premium-proof-icon"><c.icon size={23} strokeWidth={1.8}/></div>
    <h3>{c.title}</h3>
    <p>{c.description}</p>
   </article>)}
  </div>
  <div className="premium-proof-bottom">
   <div className="premium-proof-verification"><span className="premium-proof-shield"><ShieldCheck size={23}/></span>
    <div><strong>Histórias reais, com transparência.</strong>
     <p>Indicadores de atendimentos e depoimentos de instituições serão publicados aqui somente após confirmação e autorização. Sem números ou avaliações inventados.</p>
    </div>
   </div>
   <a href="#orcamento" className="premium-proof-cta">Planejar a visita da minha escola <ArrowRight size={18}/></a>
  </div>
  <span className="premium-proof-sparkle" aria-hidden="true"><Sparkles size={22}/></span>
 </section>;
}
