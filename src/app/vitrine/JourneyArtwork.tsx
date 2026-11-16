import type { ReactElement } from 'react';

/** Ilustrações vetoriais próprias para as faixas etárias da vitrine.
 * SVGs leves, sem downloads externos e sem movimento obrigatório.
 */
export type JourneyArtKind =
  | 'saturn'
  | 'constellation'
  | 'rocket'
  | 'jupiter'
  | 'galaxy'
  | 'telescope';

export default function JourneyArtwork({kind}: {kind: JourneyArtKind}): ReactElement {
  // Artes cinematográficas aprovadas para 8–9 e 10–12 anos.
  // Um atlas WebP otimizado contém os quatro recortes, sem redesenhar as cenas.
  // As duas ilustrações vetoriais de 6–7 anos permanecem intactas.
  if (kind==='rocket'||kind==='jupiter'||kind==='galaxy'||kind==='telescope') {
    const sceneLabels:Record<'rocket'|'jupiter'|'galaxy'|'telescope',string>={
      rocket:'Foguete espacial decolando entre nuvens luminosas',
      jupiter:'Júpiter, planeta gigante com faixas douradas e luas',
      galaxy:'Galáxia espiral luminosa e outras galáxias distantes',
      telescope:'Telescópio espacial apontado para o céu estrelado'
    };
    return <span role="img" aria-label={sceneLabels[kind]} className={`premium-journey-illustration premium-journey-illustration-photo premium-journey-illustration-${kind}`}/>;
  }
  // Os demais tipos já retornaram a ilustração WebP acima.
  // Neste SVG restam apenas Saturno e constelação.
  const g = (part: string) => `antares-journey-${kind}-${part}`;
  const stars = [
    [13, 31, 1.1], [39, 15, 1.3], [138, 18, 1], [153, 68, 1.3],
    [22, 116, 1.2], [129, 119, .95], [147, 131, 1.3],
  ] as const;

  return (
    <svg
      viewBox="0 0 170 140"
      className={`premium-journey-illustration premium-journey-illustration-${kind}`}
      role="img"
      aria-label={{
        saturn: 'Planeta azul com anéis',
        constellation: 'Estrelas ligadas formando uma constelação',
      }[kind]}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={g('blue')} cx="30%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#a7ebff"/>
          <stop offset="32%" stopColor="#358fd8"/>
          <stop offset="65%" stopColor="#10519c"/>
          <stop offset="100%" stopColor="#031631"/>
        </radialGradient>
        <linearGradient id={g('ring')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#65b9ff" stopOpacity=".25"/>
          <stop offset="40%" stopColor="#d7f5ff"/>
          <stop offset="73%" stopColor="#84bbf5"/>
          <stop offset="100%" stopColor="#4d81c2" stopOpacity=".45"/>
        </linearGradient>
      </defs>

      <g fill="#c2eaff" opacity=".76">
        {stars.map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r}/>)}
      </g>

      {kind==='saturn'&&<>
        <ellipse cx="83" cy="73" rx="70" ry="19" transform="rotate(-25 83 73)" stroke={`url(#${g('ring')})`} strokeWidth="5" fill="none" opacity=".67"/>
        <circle cx="83" cy="73" r="35" fill={`url(#${g('blue')})`}/>
        <path d="M53 57c17-13 36-14 57-7M49 77c15 4 36 9 63 4M54 92c15 5 31 6 44 1" stroke="#8dd6ff" strokeWidth="2.5" strokeOpacity=".32" fill="none" strokeLinecap="round"/>
        <path d="M21 96c8 6 27 7 47 4 41-5 86-34 95-52" stroke="#d3f2ff" strokeWidth="3.2" strokeLinecap="round" opacity=".95" fill="none"/>
        <path d="M30 102c29 3 61-8 85-24" stroke="#63b1fa" strokeWidth="1.8" strokeLinecap="round" opacity=".7" fill="none"/>
      </>}

      {kind==='constellation'&&<>
        <path d="M23 104L51 75L83 88L116 48L149 26" stroke="#80bdff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 104L83 88L149 26" stroke="#578bd9" strokeWidth=".8" fill="none" strokeDasharray="2 6" opacity=".65"/>
        {[[23,104,3.2],[51,75,4],[83,88,3.1],[116,48,4],[149,26,4.2]].map(([x,y,r],i)=>
          <g key={i}>
            <circle cx={x} cy={y} r={r*3} fill="#4c9aff" opacity=".12"/>
            <path d={`M${x} ${y-r*2.5}L${x+r*.53} ${y-r*.53}L${x+r*2.5} ${y}L${x+r*.53} ${y+r*.53}L${x} ${y+r*2.5}L${x-r*.53} ${y+r*.53}L${x-r*2.5} ${y}L${x-r*.53} ${y-r*.53}Z`} fill="#d7f4ff"/>
          </g>
        )}
      </>}




    </svg>
  );
}
