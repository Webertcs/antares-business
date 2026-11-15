'use client';

import { ArrowRight } from 'lucide-react';
import StarBorder from './reactbits/StarBorder';

/** Apenas na vitrine ?reactbits=1; mantém href e acesso por teclado. */
export default function StarBorderHeroActions() {
  return (
    <>
      <StarBorder
        as="a"
        href="#orcamento"
        className="premium-hero-primary premium-star-border-cta premium-star-border-cta-primary"
        theme="dark"
        color="#fffefd"
        trailColor="#92e6ff"
        duration={5}
        thickness={1.5}
        radius={999}
        trailLength={0.28}
        stars={1}
        glow={0.68}
        sparkle={false}
        hover="brighten"
        clickPulse
      >
        <span className="premium-star-border-label">Pedir orçamento <ArrowRight size={17}/></span>
      </StarBorder>
      <StarBorder
        as="a"
        href="#jogo"
        className="premium-hero-secondary premium-star-border-cta premium-star-border-cta-secondary"
        theme="dark"
        color="#9ce7ff"
        trailColor="#ffffff"
        duration={6.5}
        thickness={1.4}
        radius={999}
        trailLength={0.3}
        stars={1}
        glow={0.74}
        sparkle={false}
        hover="brighten"
        clickPulse
      >
        <span className="premium-star-border-label">Conhecer o jogo <ArrowRight size={16}/></span>
      </StarBorder>
    </>
  );
}
