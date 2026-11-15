'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

// Perguntas e respostas aprovadas na vitrine — conteúdo preservado literalmente.
const faqItems = [
  { question: "O planetário vai até a escola?", answer: "Sim. A equipe leva a estrutura móvel e combina previamente o espaço necessário." },
  { question: "Quantas crianças participam?", answer: "A capacidade depende da cúpula utilizada. As turmas são organizadas em sessões." },
  { question: "Também atende eventos e associações?", answer: "Sim. Basta informar o formato do evento no pedido de orçamento." },
  { question: "É indicado para quais idades?", answer: "As experiências podem ser planejadas para diferentes faixas etárias. Conte a idade aproximada da turma nas observações para que a equipe avalie os conteúdos adequados." },
  { question: "O jogo ANTARES já está disponível?", answer: "Ainda não! Estamos preparando o jogo educativo ANTARES Kids, sem data de lançamento anunciada. Para saber das novidades, marque a opção de interesse no formulário." }
] as const;

/**
 * Animated List inspirado no React Bits, adaptado para um FAQ.
 * Mantém <details>/<summary> nativos, sem rolagem automática ou lista limitada.
 * O efeito de entrada acontece uma única vez ao surgir na área visível.
 */
export default function AnimatedFaq() {
  const sectionRef = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEntered(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEntered(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.12 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const trackLight = (event: PointerEvent<HTMLDetailsElement>) => {
    if (event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--faq-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--faq-y', `${event.clientY - rect.top}px`);
  };

  return (
    <section
      ref={sectionRef}
      className={`premium-section premium-faq premium-faq-animated${entered ? ' has-entered' : ''}`}
      aria-labelledby="premium-faq-title"
    >
      <div className="premium-section-title">
        <span>DÚVIDAS FREQUENTES</span>
        <h2 id="premium-faq-title">Perguntas de quem vai viajar</h2>
      </div>
      <div className="premium-faq-list">
        {faqItems.map((item, index) => (
          <details
            key={item.question}
            className="premium-faq-animated-item"
            style={{ '--faq-index': index } as React.CSSProperties}
            onPointerMove={trackLight}
          >
            <summary>
              <span className="premium-faq-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span className="premium-faq-question">{item.question}</span>
              <span className="premium-faq-arrow" aria-hidden="true">⌄</span>
            </summary>
            <div className="premium-faq-answer"><p>{item.answer}</p></div>
          </details>
        ))}
      </div>
    </section>
  );
}
