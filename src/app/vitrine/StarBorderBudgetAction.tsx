'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import StarBorder from './reactbits/StarBorder';

/**
 * Destaque dos dois CTAs secundários da vitrine experimental.
 * São links reais para #orcamento, exatamente como na vitrine já aprovada.
 * Os demais links de navegação e os botões de formulário não recebem efeitos.
 */
export default function StarBorderBudgetAction({ location }: { location: 'nav' | 'floating' }) {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (location !== 'floating') return;
    const end = document.querySelector<HTMLElement>('[data-vitrine-end]');
    if (!end) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAtEnd(entry.isIntersecting),
      { rootMargin: '0px 0px 95px 0px', threshold: 0 }
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [location]);

  if (location === 'nav') {
    return (
      <StarBorder
        as="a"
        href="#orcamento"
        className="premium-nav-cta premium-budget-star premium-budget-star-nav"
        theme="dark"
        color="#fff7e1"
        trailColor="#84d8ff"
        duration={6.8}
        thickness={1.3}
        radius={999}
        trailLength={0.23}
        stars={1}
        glow={0.55}
        sparkle={false}
        hover="brighten"
        clickPulse
      >
        <span className="premium-budget-star-label">Pedir orçamento</span>
      </StarBorder>
    );
  }

  if (atEnd) return null;

  return (
    <StarBorder
      as="a"
      href="#orcamento"
      className="premium-floating premium-budget-star premium-budget-star-floating"
      aria-label="Solicitar orçamento"
      theme="dark"
      color="#fff"
      trailColor="#9fe5ff"
      duration={6.2}
      thickness={1.3}
      radius={999}
      trailLength={0.27}
      stars={1}
      glow={0.63}
      sparkle={false}
      hover="brighten"
      clickPulse
    >
      <span className="premium-budget-star-label">
        <MessageCircle size={20} aria-hidden="true" />
        <span className="premium-budget-star-text">Orçamento</span>
      </span>
    </StarBorder>
  );
}
