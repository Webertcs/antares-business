'use client';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Volume2,VolumeX,Pause,Play,Send,ShieldCheck,MessageCircle} from 'lucide-react';
import './premium.css';
const spaceStars=Array.from({length:165},(_,i)=>({x:(i*73+Math.floor(i*i*0.37))%900,y:(i*137+Math.floor(i*i*.19))%510,r:i%11===0?2.1:i%4===0?1.25:.68,opacity:.24+(i%8)*.087}));
const worlds=[
 {id:'sol',name:'Sol',icon:'☀️',fact:'O Sol é uma estrela! Sua luz leva cerca de oito minutos para chegar à Terra.',duration:0},
 {id:'mercurio',name:'Mercúrio',icon:'🪨',fact:'Mercúrio é o planeta mais próximo do Sol e dá uma volta nele em apenas 88 dias.',duration:13},
 {id:'venus',name:'Vênus',icon:'🌕',fact:'Vênus é o planeta mais quente do nosso Sistema Solar.',duration:19},
 {id:'terra',name:'Terra',icon:'🌎',fact:'A Terra é nosso lar e tem água líquida em grande quantidade na superfície.',duration:27},
 {id:'marte',name:'Marte',icon:'🔴',fact:'Marte é chamado de planeta vermelho por causa do óxido de ferro em sua superfície.',duration:35},
 {id:'jupiter',name:'Júpiter',icon:'🟠',fact:'Júpiter é o maior planeta do Sistema Solar e possui uma tempestade gigante.',duration:46},
 {id:'saturno',name:'Saturno',icon:'🪐',fact:'Os anéis de Saturno são feitos principalmente de gelo e fragmentos de rochas.',duration:58},
 {id:'urano',name:'Urano',icon:'🔵',fact:'Urano tem cor azul-esverdeada por causa do metano em sua atmosfera e gira quase de lado.',duration:72},
 {id:'netuno',name:'Netuno',icon:'🔷',fact:'Netuno é o planeta mais distante do Sol e possui ventos extremamente rápidos.',duration:88}
] as const;
type World=typeof worlds[number];
const journeys={
 '6–7 anos':[['☀️','Olá, Sistema Solar!','Sol, Terra, Lua e os primeiros passos pelo espaço.'],['🌟','Histórias no céu','Estrelas, formas e constelações.']],
 '8–9 anos':[['🚀','Exploradores espaciais','Foguetes, astronautas e os planetas vizinhos.'],['🪐','Mundos gigantes','Saturno, Júpiter e suas luas curiosas.']],
 '10–12 anos':[['🌌','Além dos planetas','Estrelas, galáxias e distâncias cósmicas.'],['🔭','Missões da ciência','Sondas, telescópios e grandes descobertas.']]
};
type Age=keyof typeof journeys;
export default function PremiumVitrine(){
 const [world,setWorld]=useState<World>(worlds[0]);
 const [paused,setPaused]=useState(false);
 const [mute,setMute]=useState(true);
 const [age,setAge]=useState<Age>('6–7 anos');
 const [voiceAvailable,setVoiceAvailable]=useState(false);
 const [mascot,setMascot]=useState<'Astro'|'Lunna'|'PIXEL'>('Astro');
 const [showSpeech,setShowSpeech]=useState(false);
 const [speechMode,setSpeechMode]=useState<'intro'|'planet'>('intro');
 const presenterTurn=useRef(0);
 const [formStatus,setFormStatus]=useState('');
 const [dark,setDark]=useState(false);
 const [reduce,setReduce]=useState(false);
 const orbitSvg=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);setVoiceAvailable('speechSynthesis'in window);return()=>{window.speechSynthesis?.cancel();};},[]);
 function speakFact(fact:string,speaker:'Astro'|'Lunna'|'PIXEL',mode:'intro'|'planet'='planet'){
  if(mute||!voiceAvailable)return;
  const synth=window.speechSynthesis;
  synth.cancel();
  const utter=new SpeechSynthesisUtterance(mode==='intro'?(speaker==='Lunna'?'Oi! Eu sou a Lunna!':speaker==='PIXEL'?'Olá! Eu sou o Pixel!':'Olá! Eu sou o Astro!'):fact);
  utter.lang='pt-BR';
  utter.rate=.93;
  // O mesmo mecanismo e a mesma voz de base para os três mascotes.
  // O motor do navegador pode não disponibilizar vozes distintas.
  utter.pitch=speaker==='Lunna'?1.12:speaker==='PIXEL'?1.18:1;
  const voices=synth.getVoices();
  utter.voice=voices.find(v=>v.lang.toLowerCase()==='pt-br')||voices.find(v=>v.lang.toLowerCase().startsWith('pt'))||null;
  synth.speak(utter);
 }
 function selectWorld(w:World){
  setWorld(w);setShowSpeech(true);setSpeechMode('planet');
  const presenters:('Astro'|'Lunna'|'PIXEL')[]=['Astro','Lunna','PIXEL'];
  const next=presenters[presenterTurn.current%presenters.length];
  setMascot(next);
  presenterTurn.current+=1;
  speakFact(w.fact,next);
 }
 function toggleSound(){
  if(!voiceAvailable)return;
  if(!mute){window.speechSynthesis.cancel();setMute(true);return;}
  setMute(false);
  const utter=new SpeechSynthesisUtterance('Olá! Eu sou '+mascot+'. '+world.fact);
  utter.lang='pt-BR';utter.rate=.94;
  utter.pitch=mascot==='Lunna'?1.4:mascot==='PIXEL'?1.65:.88;
  const voices=window.speechSynthesis.getVoices().filter(v=>/^pt(-|_)/i.test(v.lang));
  utter.voice=voices.find(v=>/pt-BR/i.test(v.lang))||voices[0]||null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
 }
 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=new FormData(e.currentTarget);
  const text=['Olá! Quero solicitar uma apresentação do planetário.',
   'Responsável: '+form.get('nome'),'Instituição: '+form.get('instituicao'),
   'Cidade: '+form.get('cidade'),'WhatsApp: '+form.get('telefone'),
   'Público: '+form.get('publico'),'Participantes: '+(form.get('alunos')||'a combinar'),
   'Data desejada: '+(form.get('data')||'a combinar'),
   'Mensagem: '+(form.get('mensagem')||'')].join('\n');
  const number=process.env.NEXT_PUBLIC_ANTARES_WHATSAPP?.replace(/\D/g,'');
  if(!number){setFormStatus('Prévia: formulário validado. Envio disponível após configuração do WhatsApp oficial. Nenhum dado foi transmitido.');return;}
  window.open('https://wa.me/'+number+'?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
  setFormStatus('Mensagem preparada no WhatsApp. Confirme o envio por lá. Nenhum registro foi salvo no CRM nesta prévia.');
 }
 const stopped=paused||reduce;
 useEffect(()=>{const svg=orbitSvg.current;if(!svg)return;if(stopped)svg.pauseAnimations();else svg.unpauseAnimations();},[stopped]);
 return <div className={'premium-kids'+(dark?' premium-night':'')}>
  <div className="premium-galaxy-backdrop" aria-hidden="true"><div className="premium-galaxy-nebula"/><div className="premium-stars-layer far"/><div className="premium-stars-layer near"/><div className="premium-comet comet-a"/><div className="premium-comet comet-b"/><div className="premium-comet comet-c"/></div>
  <header className="premium-header"><a href="#inicio" className="premium-logo"><span>✦</span> ANTARES <small>PLANETÁRIO KIDS</small></a><nav aria-label="Navegação da vitrine"><a href="#experiencia">Experiência</a><a href="#viagens">Viagens</a><a href="#escolas">Escolas</a><a className="premium-nav-cta" href="#orcamento">Pedir orçamento <ArrowRight size={16}/></a></nav><button className="premium-theme" onClick={()=>setDark(v=>!v)} aria-label={dark?'Ativar tema claro':'Ativar tema escuro'}>{dark?'☀️':'🌙'}</button></header>
  <main><section className="premium-hero" id="inicio"><div className="premium-copy"><span className="premium-eyebrow">✦ O UNIVERSO VAI ATÉ SUA ESCOLA</span><h1>Uma viagem espacial <em>inesquecível!</em></h1><p>Uma cúpula de descobertas, planetas e histórias. A ciência ganha vida em uma experiência que encanta pequenos exploradores.</p><div className="premium-trust"><span>✦ Educativo</span><span>✦ Para crianças</span><span>✦ Na sua escola</span></div></div>
   <div className="premium-universe"><div className="premium-sky"><svg ref={orbitSvg} className="premium-orbit-svg" viewBox="0 0 900 510" aria-label="Sistema solar com órbitas fixas e planetas em movimento">
     <defs><radialGradient id="pk-vignette" cx=".35" cy=".27" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".53"/><stop offset=".5" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#020817" stopOpacity=".82"/></radialGradient><linearGradient id="pk-shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".55"/><stop offset=".45" stopColor="#ffffff" stopOpacity="0"/><stop offset="1" stopColor="#020823" stopOpacity=".65"/></linearGradient><radialGradient id="pk-sun-glow"><stop offset="0" stopColor="#ffec94"/><stop offset=".55" stopColor="#ffd45a"/><stop offset="1" stopColor="#e99520"/></radialGradient><filter id="pk-sun-halo"><feGaussianBlur stdDeviation="15"/></filter></defs>
     <g aria-hidden="true" className="pk-stellar-depth">{spaceStars.map((star,i)=><circle key={i} cx={star.x} cy={star.y} r={star.r} fill={i%9===0?"#8adfff":i%13===0?"#ffe6ad":"#fff"} opacity={star.opacity}/>)}</g>
     <g aria-hidden="true" opacity=".52"><ellipse cx="170" cy="125" rx="96" ry="17" fill="#7c64d8" opacity=".17" transform="rotate(-22 170 125)"/><ellipse cx="750" cy="365" rx="122" ry="23" fill="#4bd9ff" opacity=".10" transform="rotate(-28 750 365)"/><path d="M 80 380 Q 210 315 318 350" stroke="#8ac5ff" strokeWidth="2" fill="none" opacity=".24"/><path d="M 665 90 Q 745 110 830 65" stroke="#e5a4ff" strokeWidth="2" fill="none" opacity=".28"/></g>
     {worlds.slice(1).map((w,i)=>{const rx=73+i*42;const ry=27+i*24;return <ellipse key={'track-'+w.id} cx="450" cy="255" rx={rx} ry={ry} fill="none" stroke="#cce5ff" strokeWidth="1.6" strokeDasharray="5 7" opacity=".56"/>;})}
     <circle cx="450" cy="255" r="58" fill="#ffc943" opacity=".38" filter="url(#pk-sun-halo)"/>
     <g role="button" tabIndex={0} aria-label="Descobrir o Sol" className="pk-sun-hit" onClick={()=>selectWorld(worlds[0])} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectWorld(worlds[0]);}}}>
      <circle cx="450" cy="255" r="37" fill="url(#pk-sun-glow)" stroke={world.id==='sol'?'#fff5ca':'#ffc23b'} strokeWidth={world.id==='sol'?5:2}/>
      <text x="450" y="267" fontSize="39" textAnchor="middle">☀️</text>
     </g>
     {worlds.slice(1).map((w,i)=>{const rx=73+i*42,ry=27+i*24;const startX=450+rx;const path=`M ${startX} 255 A ${rx} ${ry} 0 1 1 ${450-rx} 255 A ${rx} ${ry} 0 1 1 ${startX} 255`;return <g key={w.id} className={'pk-planet-hit'+(world.id===w.id?' chosen':'')} role="button" tabIndex={0} aria-label={'Descobrir '+w.name} onClick={()=>selectWorld(w)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectWorld(w);}}}>
       <animateMotion dur={w.duration+'s'} begin={'-'+(i*3.8)+'s'} repeatCount="indefinite" rotate="0" path={path}/>
       <circle r={world.id===w.id?25:21} fill="#f8fbff" stroke={world.id===w.id?'#ffc946':'#b4d7ff'} strokeWidth={world.id===w.id?5:2} opacity=".96"/>
       <circle r="18" fill={["#8b8378","#d4aa67","#1675ce","#b94c34","#c98b4c","#bca46c","#7bc4d5","#2452a8"][i]}/>
       {w.id==="terra"?<><path d="M-14-3L-7-14L2-12L5-3L-3 4L1 14L-9 9Z" fill="#53c88c"/><path d="M8-12L15-5L10 1L17 6L8 14L4 7Z" fill="#57bc8a"/></>:w.id==="jupiter"?<><path d="M-17-8h34M-17-2h34M-16 6h32" stroke="#f2cca0" strokeWidth="4"/><ellipse cx="8" cy="6" rx="5" ry="3" fill="#bc6047"/></>:w.id==="saturno"?<><ellipse rx="28" ry="8" fill="none" stroke="#eac98b" strokeWidth="5" transform="rotate(-23)"/><path d="M-13-6h26M-12 4h24" stroke="#d7bd8e" strokeWidth="3"/></>:w.id==="marte"?<><path d="M-14-8q12-7 23 0M-8 7q10-3 19 5" stroke="#e67b58" strokeWidth="4" fill="none"/></>:w.id==="venus"?<path d="M-16-2Q0-9 16-2M-15 7Q0 3 15 9" fill="none" stroke="#f3d3a2" strokeWidth="5"/>:w.id==="urano"?<><path d="M-17-4h34M-16 5h32" stroke="#c1f3f3" strokeWidth="2" opacity=".8"/><ellipse rx="24" ry="6" transform="rotate(-72)" fill="none" stroke="#c4eaf1" strokeWidth="1.7" opacity=".75"/></>:w.id==="netuno"?<><path d="M-16-7q16-7 32 0M-17 4q15 5 34 0M-13 12q13-3 26 0" stroke="#69a4f5" strokeWidth="3" fill="none"/><ellipse cx="6" cy="7" rx="5" ry="3" fill="#29508b"/></>:<><circle cx="-6" cy="-6" r="4" fill="#665b59"/><circle cx="8" cy="5" r="5" fill="#a69c91"/></>}
       <circle r="18" fill="url(#pk-vignette)"/><circle cx="-6" cy="-7" r="11" fill="#fff" opacity=".08"/><circle cx="-6" cy="-7" r="4.5" fill="#ffffff" opacity=".16"/><circle cx="7" cy="9" r="13" fill="none" stroke="#030b28" strokeWidth="3" opacity=".18"/>
      </g>;})}
    </svg><div className="premium-universe-controls"><button onClick={()=>setPaused(v=>!v)} aria-label={paused?'Retomar órbitas':'Pausar órbitas'}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'Continuar':'Pausar'}</button><button onClick={toggleSound} aria-label={mute?'Ativar narração':'Silenciar narração'} disabled={!voiceAvailable}>{mute?<VolumeX size={16}/>:<Volume2 size={16}/>} {mute?'Ouvir':'Silenciar'}</button></div></div>
    <div className="premium-crew"><div className="premium-crew-glow" aria-hidden="true"/>
      <div className={"premium-crew-member"+(showSpeech&&mascot==="Astro"?" is-presenting":"")}><button className={'premium-mascot'+(mascot==='Astro'&&showSpeech?' speaking':'')} onClick={()=>{setMascot('Astro');setShowSpeech(true);setSpeechMode('intro');speakFact('', 'Astro','intro');}} aria-label="Ouvir Astro apresentar o planeta"><Image src="/mascotes/astro.png" alt="" width={115} height={150} className="premium-character-image"/><strong>ASTRO</strong></button>{showSpeech&&mascot==='Astro'&&<div className="premium-character-bubble" role="status"><button aria-label="Fechar curiosidade" className="premium-bubble-close" onClick={()=>setShowSpeech(false)}>×</button>{speechMode==="intro"?<b>Olá! Eu sou o ASTRO! 🚀</b>:<><b>ASTRO apresenta {world.name}</b><p>{world.fact}</p></>}</div>}</div>
      <div className={"premium-crew-member"+(showSpeech&&mascot==="Lunna"?" is-presenting":"")}><button className={'premium-mascot'+(mascot==='Lunna'&&showSpeech?' speaking':'')} onClick={()=>{setMascot('Lunna');setShowSpeech(true);setSpeechMode('intro');speakFact('', 'Lunna','intro');}} type="button" aria-label="Lunna apresenta o planeta selecionado"><Image src="/mascotes/lunna.png" alt="" width={115} height={150} className="premium-character-image"/><strong>LUNNA</strong></button>{showSpeech&&mascot==='Lunna'&&<div className="premium-character-bubble" role="status"><button aria-label="Fechar curiosidade" className="premium-bubble-close" onClick={()=>setShowSpeech(false)}>×</button>{speechMode==="intro"?<b>Oi! Eu sou a LUNNA! 🌟</b>:<><b>LUNNA apresenta {world.name}</b><p>{world.fact}</p></>}</div>}</div>
      <div className={"premium-crew-pixel premium-crew-member"+(showSpeech&&mascot==="PIXEL"?" is-presenting":"")}><button type="button" className="premium-pixel-button" aria-label="PIXEL apresenta uma curiosidade" onClick={()=>{setMascot("PIXEL");setShowSpeech(true);setSpeechMode("intro");speakFact("", "PIXEL","intro");}}><Image src="/mascotes/pixel.png" width={105} height={115} alt="PIXEL, robô companheiro"/><span className="premium-pixel-label">PIXEL</span></button>{showSpeech&&mascot==="PIXEL"&&<div className="premium-character-bubble premium-pixel-bubble" role="status"><button aria-label="Fechar curiosidade" className="premium-bubble-close" onClick={()=>setShowSpeech(false)}>×</button>{speechMode==="intro"?<b>Olá! Eu sou o PIXEL! 🤖</b>:<><b>PIXEL explica {world.name}</b><p>{world.fact}</p></>}</div>}</div>
    </div>
    <div className="premium-planet-picker" aria-label="Escolha um astro para explorar"><span>EXPLORAR O SISTEMA SOLAR</span><div className="premium-planet-options">{worlds.map(w=><button key={w.id} type="button" aria-pressed={world.id===w.id} onClick={()=>selectWorld(w)}>{w.name}</button>)}</div></div>
    <p className="premium-motion-note">Oito planetas oficiais · Órbitas ilustrativas, sem escala real · Toque para descobrir curiosidades.</p>
    <details className="premium-pluto"><summary>✨ E Plutão, onde está?</summary><p>Plutão é um planeta anão desde a classificação adotada pela União Astronômica Internacional em 2006. Ele continua sendo um mundo fascinante!</p></details>
   </div></section>
   <section id="experiencia" className="premium-section"><div className="premium-section-title"><span>✦ COMO FUNCIONA</span><h2>A escola vira um portal para o espaço!</h2><p>A aventura acontece em três passos simples.</p></div><div className="premium-three"><article><div>🚚</div><b>01</b><h3>Chegamos e montamos</h3><p>Levamos a estrutura do planetário móvel até o local combinado.</p></article><article><div>🪐</div><b>02</b><h3>A turma entra na cúpula</h3><p>As crianças mergulham em uma experiência imersiva.</p></article><article><div>🚀</div><b>03</b><h3>Exploramos juntos</h3><p>Uma viagem guiada cheia de descobertas e perguntas.</p></article></div></section>
   <section className="premium-showcase" aria-label="Experiências ilustradas do planetário"><div className="premium-section-title"><span>✦ CONHEÇA NOSSO UNIVERSO</span><h2>Uma experiência para lembrar</h2><p>Da cúpula às estrelas: conheça possibilidades de visitas, jornadas e eventos.</p></div><div className="premium-showcase-grid">{[{src:'/vitrine/cupula.svg',title:'Sessões imersivas',desc:'O céu estrelado ganha vida dentro da cúpula.'},{src:'/vitrine/espaco.svg',title:'Viagens espaciais',desc:'Exploração e descoberta para cada idade.'},{src:'/vitrine/escolas.svg',title:'Sua escola no universo',desc:'Ciência e curiosidade sem sair da escola.'},{src:'/vitrine/eventos.svg',title:'Eventos especiais',desc:'Uma atração educativa para diferentes públicos.'}].map(card=><article key={card.src}><Image src={card.src} alt={'Ilustração conceitual: '+card.title} width={700} height={450}/><div><h3>{card.title}</h3><p>{card.desc}</p></div></article>)}</div><p className="premium-showcase-disclaimer">Imagens conceituais ilustrativas. Estrutura e programação reais dependem da proposta contratada.</p></section>
   <section id="viagens" className="premium-section premium-journeys"><div className="premium-section-title"><span>PARA CADA TURMA</span><h2>Uma aventura para cada idade</h2><p>Escolha uma faixa etária para conhecer algumas possibilidades de conteúdo.</p></div><div className="premium-age-tabs" role="tablist" aria-label="Faixas etárias">{(Object.keys(journeys) as Age[]).map(a=><button role="tab" aria-selected={age===a} key={a} onClick={()=>setAge(a)}>{a}</button>)}</div><div className="premium-journey-grid">{journeys[age].map(([emoji,title,description])=><article key={title}><span>{emoji}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
   <section id="escolas" className="premium-school"><div><span>ESCOLAS E INSTITUIÇÕES</span><h2>O universo pode voltar todos os anos.</h2><p>Planeje visitas recorrentes com turmas diferentes. Pacotes e condições especiais são definidos em proposta personalizada.</p><a className="premium-button" href="#orcamento">Conhecer as possibilidades <ArrowRight size={17}/></a></div><div className="premium-school-art premium-school-picture"><Image src="/vitrine/escolas.svg" alt="Ilustração de uma escola com cúpula planetária móvel" width={700} height={450}/></div></section>
   <section id="orcamento" className="premium-section premium-contact"><div><span>PRONTOS PARA DECOLAR?</span><h2>Leve essa experiência para sua escola!</h2><p>Conte sobre sua instituição. A equipe poderá preparar uma proposta conforme o número de participantes e o formato da visita.</p><div className="premium-robot"><Image src="/mascotes/pixel.png" width={105} height={110} alt="PIXEL, o robô companheiro do ANTARES"/><small>BIP! BIP! SUA AVENTURA COMEÇA AQUI!</small></div><p className="premium-privacy"><ShieldCheck size={17}/> Formulário destinado a adultos responsáveis. Não solicitamos dados pessoais de crianças.</p></div><form onSubmit={submit}><div className="premium-form-grid"><label>Seu nome<input required name="nome" maxLength={120} autoComplete="name"/></label><label>Escola ou instituição<input required name="instituicao" maxLength={150}/></label><label>Cidade<input required name="cidade" maxLength={100}/></label><label>WhatsApp<input required name="telefone" type="tel" maxLength={22} autoComplete="tel"/></label><label>Público<select name="publico" defaultValue="Escola"><option>Escola</option><option>Associação</option><option>Empresa</option><option>Evento particular</option></select></label><label>Participantes estimados<input name="alunos" type="number" min="1" max="100000"/></label><label>Data desejada<input name="data" type="date"/></label></div><label>Observações<textarea name="mensagem" rows={3} maxLength={800}/></label><label className="premium-consent"><input required type="checkbox"/> Autorizo o contato em resposta a este pedido de orçamento. Entendo que os dados serão usados para esse atendimento.</label><button className="premium-button" type="submit">Preparar pedido <Send size={17}/></button>{formStatus&&<p role="status" className="premium-form-status">{formStatus}</p>}<small>Prévia comercial: sem gravação no CRM até concluir a integração autorizada.</small></form></section>
   <section className="premium-section premium-faq"><div className="premium-section-title"><span>DÚVIDAS FREQUENTES</span><h2>Perguntas de quem vai viajar</h2></div><details><summary>O planetário vai até a escola?</summary><p>Sim. A equipe leva a estrutura móvel e combina previamente o espaço necessário.</p></details><details><summary>Quantas crianças participam?</summary><p>A capacidade depende da cúpula utilizada. As turmas são organizadas em sessões.</p></details><details><summary>Também atende eventos e associações?</summary><p>Sim. Basta informar o formato do evento no pedido de orçamento.</p></details></section>
  </main><footer className="premium-footer"><div><strong>✦ ANTARES · PLANETÁRIO KIDS</strong><p>Descobrindo o universo, uma escola de cada vez.</p></div><a href="#inicio">Voltar ao início ↑</a></footer>
  <a href="#orcamento" className="premium-floating" aria-label="Solicitar orçamento"><MessageCircle size={20}/> Orçamento</a>
 </div>;
}
