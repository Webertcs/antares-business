'use client';

import type { ReactNode } from 'react';
import StarBorder from './reactbits/StarBorder';

/**
 * Estrela azul-clara circulando o perímetro externo do formulário.
 *
 * Wrapper DECORATIVO (div), não button. Mantém o SpotlightCard e o
 * formulário reais inteiramente interativos e independentes.
 * Renderizado somente na prévia ?reactbits=1.
 */
export default function ProposalStarFrame({ children }: { children: ReactNode }) {
  return (
    <StarBorder
      as="div"
      className="premium-proposal-star-frame"
      theme="dark"
      backgroundColor="transparent"
      borderColor="rgba(114, 174, 232, 0.14)"
      color="#edfaff"
      trailColor="#83cfff"
      duration={13}
      thickness={1.7}
      radius={27}
      trailLength={0.15}
      stars={1}
      glow={0.72}
      sparkle={false}
      hover="brighten"
      clickPulse={false}
    >
      {children}
    </StarBorder>
  );
}
