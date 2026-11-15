'use client';

import Image from 'next/image';
import { useState } from 'react';
import OrbitImages from './reactbits/OrbitImages';

const ORBIT_ITEMS = [
  {
    src: '/vitrine/observatorio-antares.webp',
    title: 'Observatório ANTARES',
    alt: 'Arte do observatório ANTARES com Lua e cúpula iluminada',
    description: 'Uma visão cinematográfica que inspira a descoberta do céu.',
    kind: 'Arte conceitual'
  },
  {
    src: '/api/vitrine/galeria/saturno',
    title: 'Saturno e seus anéis',
    alt: 'Saturno e seus anéis fotografados pela sonda Cassini',
    description: 'Os anéis revelam um dos cenários mais impressionantes do Sistema Solar.',
    kind: 'Imagem astronômica'
  },
  {
    src: '/api/vitrine/galeria/terra',
    title: 'Nosso planeta Terra',
    alt: 'Imagem do planeta Terra visto do espaço',
    description: 'Nosso lar visto de longe, pequeno diante da imensidão do universo.',
    kind: 'Imagem astronômica'
  },
  {
    src: '/api/vitrine/galeria/nebulosa',
    title: 'Nebulosa de Carina',
    alt: 'Nebulosa de Carina fotografada pelo telescópio James Webb',
    description: 'Nuvens de gás e poeira formam uma paisagem cósmica fascinante.',
    kind: 'Imagem astronômica'
  },
  {
    src: '/api/vitrine/galeria/pilares',
    title: 'Pilares da Criação',
    alt: 'Pilares da Criação registrados pelo telescópio James Webb',
    description: 'Colunas de gás e poeira onde novas estrelas podem se formar.',
    kind: 'Imagem astronômica'
  },
  {
    src: '/api/vitrine/galeria/galaxia',
    title: 'Universo profundo',
    alt: 'Campo profundo do James Webb com milhares de galáxias distantes',
    description: 'Um pequeno pedaço do céu revela milhares de galáxias.',
    kind: 'Imagem astronômica'
  }
] as const;

const ORBIT_IMAGES = ORBIT_ITEMS.map(item => ({ src: item.src, alt: item.alt }));

export default function OrbitasCinematograficas() {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = ORBIT_ITEMS[selected];

  return (
    <section className="premium-cinematic-orbit" aria-labelledby="premium-cinematic-orbit-title">
      <div className="premium-cinematic-orbit-heading">
        <span>✦ VIAGENS PELO UNIVERSO</span>
        <h2 id="premium-cinematic-orbit-title">Imagens que fazem a imaginação decolar</h2>
        <p>Uma seleção especial de planetas, nebulosas e paisagens cósmicas. Uma segunda órbita para explorar — sem substituir o nosso sistema solar.</p>
      </div>

      <div className="premium-cinematic-orbit-stage">
        <OrbitImages
          images={ORBIT_IMAGES}
          altPrefix="Imagem do universo"
          shape="ellipse"
          radiusX={360}
          radiusY={116}
          rotation={-8}
          duration={34}
          itemSize={118}
          depth={0.7}
          itemRadius={15}
          shadow={0.5}
          hoverScale={1.08}
          hoverSpeed={0.3}
          showPath
          pathColor="rgba(148,203,255,.40)"
          pathWidth={1.3}
          pathDash={0}
          draggable
          clickToFront
          paused={paused}
          intro
          width="100%"
          height="100%"
          onItemClick={index => setSelected(index)}
          centerContent={
            <div className="premium-cinematic-orbit-center" aria-hidden="true">
              <strong>✦ ANTARES</strong>
              <span>DESCOBRIR O UNIVERSO</span>
            </div>
          }
        />
      </div>
      <div className="premium-cinematic-orbit-actions">
        <span>Arraste ou toque em uma imagem para descobrir mais.</span>
        <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>
          {paused ? '▶ Retomar movimento' : 'Ⅱ Pausar movimento'}
        </button>
      </div>

      <div className="premium-cinematic-orbit-detail" aria-live="polite">
        <Image src={current.src} alt={current.alt} width={220} height={150} unoptimized className="premium-cinematic-orbit-detail-image" />
        <div>
          <small>{current.kind}</small>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
        </div>
      </div>

      <p className="premium-cinematic-orbit-credit">
        Órbitas ilustrativas, sem escala astronômica. Imagens da NASA/ESA/CSA/STScI e ilustração digital do ANTARES;
        nenhuma imagem representa uma apresentação realizada pelo planetário.
        {' '}<a href="https://science.nasa.gov/asset/webb/webbs-first-deep-field-nircam-image/" target="_blank" rel="noopener noreferrer">Créditos do campo profundo</a>.
      </p>
    </section>
  );
}
