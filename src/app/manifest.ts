import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ANTARES BUSINESS',
    short_name: 'ANTARES',
    description: 'Gestão do Planetário Móvel ANTARES.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07112b',
    theme_color: '#123c92',
    icons: [
      { src: '/antares-icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/antares-icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/antares-maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
