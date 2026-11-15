'use client';
import dynamic from 'next/dynamic';
import {ArrowRight,CalendarCheck2,GraduationCap,HeartHandshake,Quote,ShieldCheck,Sparkles} from 'lucide-react';
import {authorizedTestimonials,verifiedMetrics} from './prova-social';
// Componente original React Bits Shiny Text, aplicado apenas na prévia.
import ShinyText from './reactbits/ShinyText';

// Cards interativos carregados apenas quando renderizados na vitrine experimental.
const SpotlightCard = dynamic(() => import('./reactbits/SpotlightCard'), {ssr:false});

const commitments=[
 {title:'A visita é planejada com a escola',description:'Alinhamos a proposta, a data e a organização da experiência com a instituição.',icon:CalendarCheck2},
 {title:'Descobertas para cada faixa etária',description:'Temas e linguagem podem ser adequados ao público de cada turma.',icon:GraduationCap},
 {title:'Atendimento próximo e personalizado',description:'A equipe recebe sua solicitação e prepara as condições conforme o formato do evento.',icon:HeartHandshake}
] as const;

export default function ProvaSocial({experimental=false}:{experimental?:boolean}){
 const metrics=verifiedMetrics.filter(m=>m.verified&&Number.isInteger(m.count)&&m.count>0&&Boolean(m.label.trim())&&Boolean(m.period.trim()));
 const testimonials=authorizedTestimonials.filter(t=>t.authorized&&Boolean(t.quote.trim())&&Boolean(t.institution.trim())&&Boolean(t.displayName.trim()));
 return <section id="confianca" className={'premium-proof'+(experimental?' premium-proof-cinematic':'')} aria-labelledby="premium-proof-title">
  <div className="premium-proof-heading">
   <span>✦ A CONFIANÇA TAMBÉM FAZ PARTE DA VIAGEM</span>
   <h2 id="premium-proof-title">{experimental
     ? <ShinyText
        text="Uma experiência pensada para sua escola, do primeiro contato à última descoberta."
        className="premium-proof-shiny-title"
        color="#dce5f2"
        shineColor="#ffffff"
        speed={7.5}
        delay={2.1}
        angle={113}
        shineWidth={26}
        softness={0.82}
        bands={1}
        glow={0.12}
        easing="smooth"
        direction="right"
        trigger="loop"
      />
     : 'Uma experiência pensada para sua escola, do primeiro contato à última descoberta.'}</h2>
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
   {commitments.map(c=>experimental
    ? <SpotlightCard
        key={c.title}
        className="premium-proof-spotlight"
        theme="dark"
        spotlightColor="#b2e3ff"
        spotlightSize={260}
        intensity={0.27}
        softness={0.78}
        borderGlow={0.89}
        proximity={95}
        smoothing={0.2}
        ambient={false}
        flare={false}
      >
       <div className="premium-proof-icon"><c.icon size={23} strokeWidth={1.8}/></div>
       <h3>{c.title}</h3>
       <p>{c.description}</p>
      </SpotlightCard>
    : <article key={c.title}>
       <div className="premium-proof-icon"><c.icon size={23} strokeWidth={1.8}/></div>
       <h3>{c.title}</h3>
       <p>{c.description}</p>
      </article>)}
  </div>
  <div className="premium-proof-bottom">
   <div className="premium-proof-verification"><span className="premium-proof-shield"><ShieldCheck size={23}/></span>
    <div><strong>Sua próxima aventura começa aqui.</strong>
     <p>Cada escola tem sua própria história. Conte para a nossa equipe o que você imagina para sua turma e vamos planejar a experiência juntos.</p>
    </div>
   </div>
   <a href="#orcamento" className="premium-proof-cta">Planejar a visita da minha escola <ArrowRight size={18}/></a>
  </div>
  {!experimental&&<span className="premium-proof-sparkle" aria-hidden="true"><Sparkles size={22}/></span>}
 </section>;
}
