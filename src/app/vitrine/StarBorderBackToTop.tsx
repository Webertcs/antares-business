'use client';

import StarBorder from './reactbits/StarBorder';

/**
 * Botão Voltar ao topo da prévia ANTARES:
 * mantém o mini-card espacial e usa o efeito animado real de Star Border
 * que já está aprovado nos botões do topo.
 */
export default function StarBorderBackToTop() {
  return (
    <StarBorder
      as="a"
      href="#inicio"
      aria-label="Voltar ao topo da vitrine"
      className="premium-back-to-top premium-bento-back-to-top premium-back-to-top-star"
      theme="dark"
      color="#ffffff"
      trailColor="#9be7ff"
      duration={4.8}
      thickness={2}
      radius={20}
      trailLength={0.34}
      stars={1}
      glow={0.9}
      sparkle
      hover="brighten"
      clickPulse
    >
      <span className="premium-back-to-top-icon" aria-hidden="true">↑</span>
      <span className="premium-back-to-top-title">Voltar ao topo</span>
    </StarBorder>
  );
}
