'use client';

import { useEffect, useMemo, useState } from 'react';
import OrbitImages from './reactbits/OrbitImages';
import StarBorder from './reactbits/StarBorder';
import { Pause, Play } from 'lucide-react';

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
    src: '/api/vitrine/galeria/mercurio-cinema',
    title: 'Mercúrio — o planeta mais próximo do Sol',
    alt: 'Mercúrio como globo colorido com crateras em imagem de cores realçadas da missão MESSENGER',
    description: 'Cores realçadas revelam as diferenças da superfície craterada de Mercúrio.',
    kind: 'Imagem MESSENGER · cores realçadas',
    source: 'https://science.nasa.gov/photojournal/colors-of-the-innermost-planet-view-1/'
  },
  {
    src: '/api/vitrine/galeria/terra-cinema',
    title: 'Terra — nosso lar azul',
    alt: 'Terra vista de frente, com nuvens, oceanos e as Américas em imagem Blue Marble da NASA',
    description: 'O planeta Terra observado no espaço, em imagem composta com dados do satélite Suomi NPP.',
    kind: 'Blue Marble 2012 · NASA/NOAA',
    source: 'https://science.nasa.gov/photojournal/earth/'
  }
] as const;

const ORBIT_IMAGES = ORBIT_ITEMS.map(item => ({ src: item.src, alt: item.alt }));

// PIA06193: mosaico real de Saturno registrado pela sonda Cassini (NASA/JPL/SSI).
// O arquivo original possui fundo preto, portanto removemos seus pixels escuros
// localmente em um canvas. Diferente de máscaras CSS, os anéis não são recortados.
const SATURN_PHOTO = '/api/vitrine/galeria/saturno-transparente';
const SATURN = {
  alt: 'Saturno completo em tons dourados com seus anéis abertos, imagem da Cassini',
  source: 'https://science.nasa.gov/photojournal/the-greatest-saturn-portrait-yet/'
};

function useSaturnWithTransparency() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function prepare() {
      try {
        const response = await fetch(SATURN_PHOTO);
        if (!response.ok) return;
        const bitmap = await createImageBitmap(await response.blob());
        const canvas = document.createElement('canvas');
        // Preparação limitada para não sobrecarregar celulares.
        const scale = Math.min(1, 1100 / bitmap.width);
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) { bitmap.close(); return; }
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = pixels.data;
        // O preto do espaço fica transparente, preservando os tons suaves
        // dos anéis e do planeta. Pequena transição evita contorno serrilhado.
        for (let i = 0; i < data.length; i += 4) {
          const brightness = Math.max(data[i], data[i + 1], data[i + 2]);
          const factor = Math.max(0, Math.min(1, (brightness - 8) / 32));
          const softAlpha = factor * factor * (3 - 2 * factor);
          data[i + 3] = Math.round(data[i + 3] * softAlpha);
        }
        context.putImageData(pixels, 0, 0);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        // Mantemos os sete planetas aprovados caso a foto não carregue.
      }
    }

    void prepare();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return src;
}

export default function OrbitasCinematograficas() {
  const [paused, setPaused] = useState(false);
  const saturnSrc = useSaturnWithTransparency();
  const images = useMemo(
    () => saturnSrc ? [...ORBIT_IMAGES, { src: saturnSrc, alt: SATURN.alt }] : ORBIT_IMAGES,
    [saturnSrc]
  );

  return (
    <section className="premium-cinematic-orbit" aria-labelledby="premium-cinematic-orbit-title">
      <div className="premium-cinematic-orbit-heading">
        <span>✦ VIAGENS PELO UNIVERSO</span>
        <h2 id="premium-cinematic-orbit-title">Planetas que fazem a imaginação decolar</h2>
        <p>Uma viagem visual por oito mundos extraordinários, com imagens espaciais de impacto cinematográfico — sem substituir o nosso sistema solar.</p>
      </div>

      <div className="premium-cinematic-orbit-stage">
        <OrbitImages
          images={images}
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
        />
      </div>
      <div className="premium-cinematic-orbit-actions">
        <StarBorder
          as="button"
          type="button"
          className="premium-orbit-pause-bento"
          theme="dark"
          color="#ffffff"
          trailColor="#8bd9ff"
          duration={6.2}
          thickness={1.6}
          radius={20}
          trailLength={0.27}
          stars={1}
          glow={0.79}
          sparkle={false}
          hover="brighten"
          clickPulse
          aria-label={paused ? 'Retomar movimento dos planetas' : 'Pausar movimento dos planetas'}
          aria-pressed={paused}
          onClick={() => setPaused(value => !value)}
          onPointerMove={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            event.currentTarget.style.setProperty('--orbit-spot-x', `${event.clientX - rect.left}px`);
            event.currentTarget.style.setProperty('--orbit-spot-y', `${event.clientY - rect.top}px`);
          }}
          onPointerLeave={event => {
            event.currentTarget.style.setProperty('--orbit-spot-x', '50%');
            event.currentTarget.style.setProperty('--orbit-spot-y', '50%');
          }}
        >
          <span className="premium-orbit-pause-bento-label">
            <span className="premium-orbit-pause-bento-icon" aria-hidden="true">
              {paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}
            </span>
            <span>{paused ? 'Retomar' : 'Pausar'}</span>
          </span>
        </StarBorder>
      </div>

    </section>
  );
}
