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
        rocket: 'Foguete viajando pelo espaço',
        jupiter: 'Planeta gigante gasoso',
        galaxy: 'Galáxia espiral',
        telescope: 'Telescópio apontado para as estrelas',
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
        <radialGradient id={g('cream')} cx="35%" cy="30%" r="79%">
          <stop offset="0%" stopColor="#ffdc97"/>
          <stop offset="45%" stopColor="#dc945f"/>
          <stop offset="80%" stopColor="#7c4a66"/>
          <stop offset="100%" stopColor="#15243b"/>
        </radialGradient>
        <linearGradient id={g('ring')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#65b9ff" stopOpacity=".25"/>
          <stop offset="40%" stopColor="#d7f5ff"/>
          <stop offset="73%" stopColor="#84bbf5"/>
          <stop offset="100%" stopColor="#4d81c2" stopOpacity=".45"/>
        </linearGradient>
        <linearGradient id={g('metal')} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#edfbff"/>
          <stop offset="50%" stopColor="#83baf7"/>
          <stop offset="100%" stopColor="#22549c"/>
        </linearGradient>
        <clipPath id={g('giant-mask')}>
          <circle cx="83" cy="72" r="42"/>
        </clipPath>
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

      {kind==='rocket'&&<>
        <g transform="translate(83 68) rotate(37)">
          <path d="M-15 18L-24 32L-12 26L0 38L12 26L24 32L15 18Z" fill="#3e82d3" stroke="#95d9ff" strokeWidth="1.5"/>
          <path d="M-16 21Q-22-15 0-43Q22-15 16 21Z" fill={`url(#${g('metal')})`} stroke="#dff7ff" strokeWidth="1.6"/>
          <circle cx="0" cy="-6" r="9" fill="#1b5199" stroke="#c7f2ff" strokeWidth="3"/>
          <path d="M-11 23L-6 39L0 53L6 39L11 23Z" fill="#fbc468" opacity=".94"/>
          <path d="M-6 24L0 51L6 24Z" fill="#e5f6ff"/>
          <path d="M-16 20h32" stroke="#184a8e" strokeWidth="4"/>
        </g>
        <path d="M34 111L16 126M36 118L25 130" stroke="#7dccff" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
      </>}

      {kind==='jupiter'&&<>
        <circle cx="83" cy="72" r="42" fill={`url(#${g('cream')})`}/>
        <g clipPath={`url(#${g('giant-mask')})`} opacity=".84">
          <path d="M36 43Q75 54 130 43M35 56Q85 72 129 58M37 75Q76 64 130 78M38 96Q76 109 127 95" stroke="#684e65" strokeWidth="9" fill="none" opacity=".6"/>
          <path d="M39 48Q77 61 126 50M37 64Q78 82 127 68M39 85Q85 99 125 84M39 103Q80 115 126 103" stroke="#fbe3ad" strokeWidth="5.5" fill="none" opacity=".8"/>
          <ellipse cx="107" cy="85" rx="12" ry="7" fill="#bc7c75" stroke="#f2c299" strokeWidth="2"/>
        </g>
      </>}

      {kind==='galaxy'&&<>
        <ellipse cx="85" cy="72" rx="66" ry="24" transform="rotate(-29 85 72)" fill="#4f77d6" opacity=".14"/>
        <g transform="rotate(-29 85 72)" fill="none" strokeLinecap="round">
          <path d="M19 72C23 28 96 22 128 49S140 111 95 115S47 92 58 71S103 55 103 77S79 94 76 78" stroke="#81bcff" strokeWidth="7" opacity=".36"/>
          <path d="M16 65C35 12 130 17 152 72C166 106 120 132 73 116S54 51 90 55S114 103 82 93" stroke="#a29fff" strokeWidth="3" opacity=".67"/>
          <path d="M44 77C48 34 124 39 127 79S73 117 70 84" stroke="#d6f0ff" strokeWidth="2.5" opacity=".9"/>
        </g>
        <circle cx="83" cy="72" r="10" fill="#edfbff" opacity=".93"/>
      </>}

      {kind==='telescope'&&<>
        <g transform="translate(83 65) rotate(-28)">
          <rect x="-51" y="-15" width="89" height="30" rx="8" fill={`url(#${g('metal')})`} stroke="#a5dbff" strokeWidth="2"/>
          <rect x="-56" y="-18" width="13" height="36" rx="4" fill="#24559d" stroke="#b7e6ff" strokeWidth="2"/>
          <rect x="32" y="-18" width="17" height="36" rx="5" fill="#9fd2f5" stroke="#e2f7ff" strokeWidth="1.6"/>
          <path d="M-45-8h69" stroke="#eafaff" opacity=".55" strokeWidth="3"/>
        </g>
        <path d="M83 76V111M83 88L52 122M83 88L116 122" stroke="#9bc8f7" strokeWidth="5" strokeLinecap="round"/>
        <circle cx="83" cy="87" r="7" fill="#335c9a" stroke="#b0e1ff" strokeWidth="2"/>
        <path d="M135 20l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#e1f7ff"/>
      </>}
    </svg>
  );
}
