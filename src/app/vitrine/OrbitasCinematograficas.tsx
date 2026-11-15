'use client';

import Image from 'next/image';
import { useState } from 'react';
import OrbitImages from './reactbits/OrbitImages';

const ORBIT_ITEMS = [
  {
    src: '/api/vitrine/galeria/jupiter-cinema',
    title: 'Júpiter — um mundo de tempestades',
    alt: 'Júpiter com tempestades e nuvens azuis e alaranjadas, em cores realçadas pela missão Juno',
    description: 'A sonda Juno revela um planeta gigante coberto por tempestades e formas surpreendentes.',
    kind: 'Imagem Juno · cores realçadas',
    source: 'https://science.nasa.gov/photojournal/exotic-marble/'
  },
  {
    src: '/api/vitrine/galeria/urano-cinema',
    title: 'Urano — o gigante dos anéis',
    alt: 'Urano azul-claro com anéis brilhantes em imagem infravermelha do James Webb',
    description: 'O telescópio James Webb revela anéis delicados em torno do planeta azul.',
    kind: 'Imagem Webb · cores representativas',
    source: 'https://science.nasa.gov/asset/webb/uranus-nircam-image/'
  },
  {
    src: '/api/vitrine/galeria/marte-cinema',
    title: 'Marte — o planeta vermelho',
    alt: 'Marte em tons alaranjados, fotografado pelo telescópio espacial Hubble',
    description: 'Desertos, nuvens e regiões escuras marcam a superfície do nosso vizinho.',
    kind: 'Fotografia · telescópio Hubble',
    source: 'https://science.nasa.gov/image-detail/hs-2016-15-a-full_tif/'
  },
  {
    src: '/api/vitrine/galeria/netuno-cinema',
    title: 'Netuno — o azul profundo',
    alt: 'Netuno azul intenso com nuvens e tempestades visto pela Voyager 2',
    description: 'A Voyager 2 registrou este mundo distante, envolto em nuvens e ventos intensos.',
    kind: 'Fotografia · Voyager 2',
    source: 'https://science.nasa.gov/asset/webb/neptune-voyager-2/'
  },
  {
    src: '/api/vitrine/galeria/venus-cinema',
    title: 'Vênus — a superfície dourada',
    alt: 'Globo dourado de Vênus reconstruído a partir de imagens de radar da missão Magellan',
    description: 'Uma visualização de Vênus feita com dados de radar e cores simuladas pela NASA.',
    kind: 'Reconstrução de radar · cores simuladas',
    source: 'https://science.nasa.gov/photojournal/venus-computer-simulated-global-view-centered-at-90-degrees-east-longitude/'
  },
  {
    src: '/api/vitrine/galeria/saturno-cinema',
    title: 'Saturno — os anéis contra a luz',
    alt: 'Saturno em sombra, rodeado por anéis luminosos numa composição feita pela missão Cassini',
    description: 'Em contraluz, os anéis de Saturno revelam toda sua dimensão e beleza.',
    kind: 'Imagem Cassini · composição fotográfica',
    source: 'https://science.nasa.gov/resource/the-day-the-earth-smiled/'
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
        <h2 id="premium-cinematic-orbit-title">Planetas que fazem a imaginação decolar</h2>
        <p>Uma viagem visual por seis mundos extraordinários, com imagens espaciais de impacto cinematográfico — sem substituir o nosso sistema solar.</p>
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
          <a className="premium-cinematic-orbit-source" href={current.source} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',marginTop:9,fontSize:11,color:'#a9d5ff',textDecoration:'underline',textUnderlineOffset:3}}>Ver imagem e créditos na NASA</a>
        </div>
      </div>

      <p className="premium-cinematic-orbit-credit">
        Órbitas ilustrativas, sem escala astronômica. Imagens da NASA/JPL-Caltech, NASA/ESA/CSA/STScI e colaboradores;
        fotografias processadas para realce de cor. Vênus é uma reconstrução por radar com cores simuladas.
        As imagens não representam apresentações realizadas pelo planetário.
      </p>
    </section>
  );
}
