'use client';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Volume2,VolumeX,Pause,Play,Send,ShieldCheck,MessageCircle,CalendarDays} from 'lucide-react';
import './premium.css';
import ProvaSocial from './ProvaSocial';
import GradientText from './reactbits/GradientText';
import JourneyArtwork, {type JourneyArtKind} from './JourneyArtwork';

// A galeria WebGL é carregada apenas na prévia experimental da vitrine.
const CircularGallery = dynamic(() => import('./reactbits/CircularGallery'), { ssr: false });
// Segunda órbita: visível somente no experimento React Bits, sem tocar no sistema solar.
const OrbitasCinematograficas = dynamic(() => import('./OrbitasCinematograficas'), { ssr: false });
// Star Border permanece em um módulo separado e só é renderizado na prévia.
const StarBorderHeroActions = dynamic(() => import('./StarBorderHeroActions'), { ssr: false });
// Demais CTAs luminosos carregados somente na vitrine experimental.
const StarBorderBudgetAction = dynamic(() => import('./StarBorderBudgetAction'), { ssr: false });
// Voltar ao topo: estrela real percorre toda a borda, como nos CTAs aprovados.
const StarBorderBackToTop = dynamic(() => import('./StarBorderBackToTop'), { ssr: false });
// Bento original do React Bits, simplificado sem dependências externas de ícones.
const MagicBento = dynamic(() => import('./reactbits/MagicBento'), { ssr: false });
// Iluminação React Bits reaproveitada nos benefícios e no painel de proposta.
const SpotlightCard = dynamic(() => import('./reactbits/SpotlightCard'), { ssr: false });
// Contorno orbital do orçamento: estrela circunda o painel, sem alterar o Spotlight interior.
const ProposalStarFrame = dynamic(() => import('./ProposalStarFrame'), { ssr: false });
// FAQ experimental com entrada inspirada no React Bits Animated List e acordeão nativo.
const AnimatedFaq = dynamic(() => import('./AnimatedFaq'), { ssr: false });
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
const journeyArtByTitle:Record<string,JourneyArtKind>={
 'Olá, Sistema Solar!':'saturn',
 'Histórias no céu':'constellation',
 'Exploradores espaciais':'rocket',
 'Mundos gigantes':'jupiter',
 'Além dos planetas':'galaxy',
 'Missões da ciência':'telescope'
};
const showcasePhotos=[
 {src:'https://cdn.eso.org/images/screen/upr_IMG_6184-CC.jpg',fallback:'/vitrine/cupula.svg',title:'Sessões imersivas',desc:'O céu estrelado ganha vida dentro da cúpula.',alt:'Foto ilustrativa de sessão de planetário com projeção da nebulosa Hélice no teto da cúpula'},
 {src:'https://images.unsplash.com/photo-1447433865958-f402f562b843?auto=format&fit=crop&w=920&q=80',fallback:'/vitrine/espaco.svg',title:'Viagens espaciais',desc:'Exploração e descoberta para cada idade.',alt:'Fotografia real de astronauta da NASA durante atividade espacial'},
 {src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/SPB-MobilesPlanetariumINTENSE%C2%A9SPB_FotoF.-M_%289%29.jpg/960px-SPB-MobilesPlanetariumINTENSE%C2%A9SPB_FotoF.-M_%289%29.jpg',fallback:'/vitrine/escolas.svg',title:'Sua escola no universo',desc:'Ciência e curiosidade sem sair da escola.',alt:'Fotografia ilustrativa de cúpula de planetário móvel instalada em auditório escolar'},
 {src:'https://images.unsplash.com/photo-1779314082331-e423cb1cc6ae?auto=format&fit=crop&w=920&q=80',fallback:'/vitrine/eventos.svg',title:'Eventos especiais',desc:'Uma atração educativa para diferentes públicos.',alt:'Fotografia ilustrativa de pessoas observando o céu noturno e as estrelas'}
] as const;
const reactBitsGalleryItems = [
 {image:'/api/vitrine/galeria/nebulosa',text:'Nebulosa de Carina',description:'Nuvens cósmicas e estrelas fotografadas pelo telescópio James Webb.',alt:'Nebulosa de Carina registrada pelo telescópio James Webb'},
 {image:'/vitrine/observatorio-antares.webp',text:'Observatório ANTARES',description:'Arte conceitual de um observatório sob o céu estrelado. Não representa a estrutura móvel utilizada nas escolas.',alt:'Ilustração de um observatório espacial com lua brilhante e cúpula arquitetônica'},
 {image:'/mascotes/astro.png',imageScale:1.13,text:'Astro',description:'Nosso pequeno explorador do universo ANTARES.',alt:'Mascote Astro'},
 {image:'/api/vitrine/galeria/saturno',text:'Saturno e seus anéis',description:'Saturno em imagem real capturada pela missão Cassini.',alt:'Fotografia de Saturno e seus anéis pela nave Cassini'},
 {image:'/mascotes/lunna.png',imageScale:1.13,text:'Lunna',description:'Uma companheira para descobrir estrelas, planetas e galáxias.',alt:'Mascote Lunna'},
 {image:'/api/vitrine/galeria/pilares',text:'Pilares da Criação',description:'Uma incrível região de formação de estrelas na Nebulosa da Águia.',alt:'Pilares da Criação em imagem do telescópio James Webb'},
 {image:'/mascotes/pixel.png',imageScale:1.13,text:'Pixel',description:'O robô que acompanha nossa aventura espacial.',alt:'Mascote Pixel'},
 {image:'/api/vitrine/galeria/terra',text:'Nosso planeta Terra',description:'A Terra vista do espaço em uma imagem composta pela NASA.',alt:'Imagem da Terra em fundo espacial'}
];
const ecosystemCards=[
 {icon:'🪐',title:'Experiência imersiva',description:'A curiosidade ganha vida em uma viagem pela ciência.'},
 {icon:'✨',title:'Ciência com diversão',description:'Descobertas pensadas para inspirar pequenos exploradores.'},
 {icon:'🏫',title:'Na sua escola',description:'O planetário móvel vai até a instituição, mediante agendamento.'},
 {icon:'🎮',title:'Universo em expansão',description:'A aventura também chegará ao jogo educativo ANTARES.'}
] as const;
// Quatro benefícios existentes, sem dados fictícios: organização Bento 2+1 / 1+2.
const ecosystemBentoItems = ecosystemCards.map((card,index) => ({
  id: card.title,
  label: ['IMERSÃO','APRENDIZADO','NA SUA ESCOLA','NOVAS AVENTURAS'][index],
  icon: <span className="premium-magic-bento-emoji" aria-hidden="true">{card.icon}</span>,
  title: card.title,
  description: card.description,
  colSpan: index === 0 || index === 3 ? 2 : 1
}));
function MarketingPhoto({src,fallback,alt,width,height,className}:{src:string;fallback:string;alt:string;width:number;height:number;className?:string}){
 const [broken,setBroken]=useState(false);
 return <Image src={broken?fallback:src} alt={alt} width={width} height={height} className={className}
  unoptimized loading="lazy" onError={()=>{if(!broken)setBroken(true);}}/>;
}

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
 const [leadSending,setLeadSending]=useState(false);
 const [gameInterested,setGameInterested]=useState(false);
 const [quoteDraft,setQuoteDraft]=useState('');
 const [today,setToday]=useState('');
 const [dark,setDark]=useState(false);
 const [reduce,setReduce]=useState(false);
 const [reactBitsPreview,setReactBitsPreview]=useState(false);
 const [galleryAvailable,setGalleryAvailable]=useState(false);
 const orbitSvg=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{setReactBitsPreview(new URLSearchParams(window.location.search).get('reactbits')==='1');},[]);
 useEffect(()=>{if(!reactBitsPreview)return;try{const canvas=document.createElement('canvas');setGalleryAvailable(Boolean(canvas.getContext('webgl2')));}catch{setGalleryAvailable(false);}},[reactBitsPreview]);
 useEffect(()=>{setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);setVoiceAvailable('speechSynthesis'in window);const d=new Date();setToday([d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'));return()=>{window.speechSynthesis?.cancel();};},[]);
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
  const utter=new SpeechSynthesisUtterance(speechMode==='intro'?(mascot==='Lunna'?'Oi! Eu sou a Lunna!':mascot==='PIXEL'?'Olá! Eu sou o Pixel!':'Olá! Eu sou o Astro!'):world.fact);
  utter.lang='pt-BR';utter.rate=.94;
  utter.pitch=mascot==='Lunna'?1.4:mascot==='PIXEL'?1.65:.88;
  const voices=window.speechSynthesis.getVoices().filter(v=>/^pt(-|_)/i.test(v.lang));
  utter.voice=voices.find(v=>/pt-BR/i.test(v.lang))||voices[0]||null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  const formElement=e.currentTarget;
  const form=new FormData(formElement);
  const get=(name:string)=>String(form.get(name)||'').trim();
  const phone=get('telefone').replace(/\D/g,'');
  const gameUpdatesOptIn=form.get('gameUpdatesOptIn')==='on';
  if(gameUpdatesOptIn&&get('mensagem').length>690){setFormStatus('Para registrar também seu interesse no jogo, reduza as observações para até 690 caracteres.');return;}
  if(phone.length<10||phone.length>13){setFormStatus('Confira o WhatsApp: informe DDD e número válido.');return;}
  const people=Number(get('alunos'));
  if(get('alunos')&&(!Number.isInteger(people)||people<1||people>100000)){setFormStatus('Informe uma quantidade de participantes válida.');return;}
  if(today&&get('data')&&get('data')<today){setFormStatus('A data desejada precisa ser hoje ou uma data futura.');return;}
  const text=['Olá! Quero solicitar uma apresentação do planetário.',
   'Responsável: '+get('nome'),'Instituição: '+get('instituicao'),
   'Cidade: '+get('cidade'),'WhatsApp: '+get('telefone'),
   'Público: '+get('publico'),'Participantes: '+(get('alunos')||'a combinar'),
   'Data desejada: '+(get('data')||'a combinar'),
   'Mensagem: '+(get('mensagem')||'sem observações'),
   ...(gameUpdatesOptIn?['Interesse opcional: autorizo contato sobre novidades do futuro jogo ANTARES Kids.']:[])].join('\n');
  setQuoteDraft(text);
  setLeadSending(true);
  try{
   const response=await fetch('/api/vitrine/solicitacoes',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     name:get('nome'),institution:get('instituicao'),city:get('cidade'),phone:get('telefone'),
     audience:get('publico'),attendees:get('alunos')||null,date:get('data'),notes:get('mensagem'),
     gameUpdatesOptIn,
     website:get('website')
    })
   });
   if(response.ok){
    formElement.reset();
    setGameInterested(false);
    setQuoteDraft('');
    setFormStatus(gameUpdatesOptIn?'✅ Recebemos seu pedido! Seu interesse nas novidades do jogo também foi anotado. Nossa equipe poderá entrar em contato.':'✅ Recebemos seu pedido! Nossa equipe avaliará sua solicitação e poderá entrar em contato.');
    return;
   }
   // Em implantação: nunca afirmar que o pedido foi salvo se a API não confirmar.
  }catch{
   // Falha de conexão: oferecer encaminhamento manual abaixo.
  }finally{setLeadSending(false);}
  const number=process.env.NEXT_PUBLIC_ANTARES_WHATSAPP?.replace(/\D/g,'');
  if(!number||number.length<11||number.length>13){
   setFormStatus('Não foi possível enviar seu pedido neste momento. Copie a mensagem abaixo para encaminhá-la à nossa equipe.');
   return;
  }
  const href='https://wa.me/'+number+'?text='+encodeURIComponent(text);
  window.open(href,'_blank','noopener,noreferrer');
  setFormStatus('Abrimos o WhatsApp para você confirmar o envio. Se a conversa não aparecer, copie a mensagem abaixo para encaminhá-la à nossa equipe.');
 }
 async function copyQuote(){
  try{await navigator.clipboard.writeText(quoteDraft);setFormStatus('Mensagem copiada. Você pode enviá-la ao atendimento do planetário.');}
  catch{setFormStatus('Selecione e copie a mensagem no campo abaixo.');}
 }
 const proposalForm = (
<form onSubmit={submit}>
      <div className="premium-form-heading"><strong>Vamos planejar essa aventura?</strong><span>* Campos obrigatórios</span></div>
      <div className="premium-form-grid">
       <label>Seu nome <span aria-hidden="true">*</span><input required name="nome" maxLength={120} autoComplete="name" placeholder="Nome do responsável"/></label>
       <label>Escola ou instituição <span aria-hidden="true">*</span><input required name="instituicao" maxLength={150} placeholder="Nome da instituição"/></label>
       <label>Cidade <span aria-hidden="true">*</span><input required name="cidade" maxLength={100} autoComplete="address-level2" placeholder="Cidade do atendimento"/></label>
       <label>WhatsApp <span aria-hidden="true">*</span><input required name="telefone" type="tel" inputMode="tel" maxLength={22} autoComplete="tel" placeholder="(61) 99999-9999"/></label>
       <label>{reactBitsPreview?'Tipo de atendimento':'Público'}<select name="publico" defaultValue="Escola"><option>Escola</option><option>Associação</option><option>Empresa</option><option>Evento particular</option></select></label>
       <label>Participantes estimados<input name="alunos" type="number" min="1" max="100000" placeholder="A combinar"/></label>
       <label>Data desejada<input name="data" type="date" min={today||undefined}/></label>
      </div>
      <label>Observações <span className="premium-optional-label">(opcional)</span><textarea name="mensagem" rows={3} maxLength={gameInterested?690:800} placeholder="Conte sobre a turma, horários ou necessidades especiais da instituição (sem dados pessoais de crianças)."/></label>
      <label className="premium-game-interest">
       <input type="checkbox" name="gameUpdatesOptIn" checked={gameInterested} onChange={e=>setGameInterested(e.target.checked)}/>
       <span><strong>{reactBitsPreview?'Quero receber novidades do jogo ANTARES Kids':'Também quero receber novidades do futuro jogo ANTARES Kids'} <em>Opcional</em></strong>
        <small>Ao marcar, você autoriza nossa equipe a entrar em contato sobre novidades do jogo. Você poderá pedir para não receber mais essas mensagens quando quiser.</small>
       </span>
      </label>
      <label className="premium-consent"><input required type="checkbox"/> Autorizo o contato em resposta a este pedido de orçamento. Entendo que os dados serão usados para esse atendimento.</label>
      <input className="premium-honeypot" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
      <button className="premium-button premium-form-submit" type="submit" disabled={leadSending}>{leadSending?"Registrando pedido...":"Solicitar minha proposta"} <Send size={17}/></button>
      {formStatus&&<p role="status" aria-live="polite" className="premium-form-status">{formStatus}</p>}
      {quoteDraft&&<div className="premium-quote-preview"><label>Mensagem preparada<textarea readOnly rows={7} value={quoteDraft} aria-label="Mensagem de orçamento pronta para copiar"/></label><button type="button" onClick={copyQuote} className="premium-copy-quote">Copiar mensagem</button></div>}
      <small className="premium-form-disclaimer">{reactBitsPreview?'Nossa equipe analisará sua solicitação e poderá entrar em contato pelo WhatsApp informado. Se houver uma falha no envio, você poderá copiar sua mensagem para encaminhá-la ao atendimento.':'Nossa equipe analisará sua solicitação antes de preparar uma proposta. Se não conseguir enviar por aqui, você poderá encaminhar sua mensagem pelo WhatsApp.'}</small>
     </form>
 );
 const stopped=paused||reduce;
 useEffect(()=>{const svg=orbitSvg.current;if(!svg)return;if(stopped)svg.pauseAnimations();else svg.unpauseAnimations();},[stopped]);
 return <div className={'premium-kids'+(dark?' premium-night':'')+(reactBitsPreview?' premium-cinematic-sky':'')}>
  <div className="premium-galaxy-backdrop" aria-hidden="true"><div className="premium-galaxy-nebula"/><div className="premium-stars-layer far"/><div className="premium-stars-layer near"/><div className="premium-comet comet-a"/><div className="premium-comet comet-b"/><div className="premium-comet comet-c"/></div>
  <header className={'premium-header'+(reactBitsPreview?' premium-preview-header':'')}>
    {!reactBitsPreview&&<a href="#inicio" className="premium-logo"><span>✦</span> ANTARES <small>PLANETÁRIO KIDS</small></a>}
    <nav aria-label="Navegação da vitrine">
      <a href="#experiencia">Experiência</a>
      <a href="#viagens">Viagens</a>
      <a href="#jogo">Jogo</a>
      <a href="#escolas">Escolas</a>
      {reactBitsPreview?<StarBorderBudgetAction location="nav"/>:<a className="premium-nav-cta" href="#orcamento">Pedir orçamento <ArrowRight size={16}/></a>}
    </nav>
    {!reactBitsPreview&&<button className="premium-theme" onClick={()=>setDark(v=>!v)} aria-label={dark?'Ativar tema claro':'Ativar tema escuro'}>{dark?'☀️':'🌙'}</button>}
  </header>
  <main><section className="premium-hero" id="inicio"><div className="premium-copy"><span className="premium-eyebrow">✦ O UNIVERSO VAI ATÉ SUA ESCOLA</span>{reactBitsPreview&&<span className="premium-reactbits-hero-note">✨ TESTE REACT BITS ATIVO</span>}<h1>Uma experiência espacial <em>{reactBitsPreview?<GradientText colors={['#68e6ff','#c7acff','#ffc77b','#68e6ff']} animationSpeed={4} variant="flow" scale={2} glow={0.25}>inesquecível começa aqui!</GradientText>:'inesquecível começa aqui!'}</em></h1><p>O ANTARES Kids leva ciência, imaginação e uma experiência imersiva até sua escola. E essa aventura vai continuar no universo digital em breve.</p><div className="premium-hero-cta">{reactBitsPreview?<StarBorderHeroActions/>:<><a href="#orcamento" className="premium-hero-primary">Pedir orçamento <ArrowRight size={17}/></a><a href="#jogo" className="premium-hero-secondary">Conhecer o jogo <ArrowRight size={16}/></a></>}</div><div className="premium-trust"><span>✦ Experiência imersiva</span><span>✦ Educativo e divertido</span><span>✦ Na sua escola</span><span>✦ Jogo em breve</span></div></div>
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
   {reactBitsPreview && <OrbitasCinematograficas />}
   <section className="premium-ecosystem" aria-labelledby="premium-ecosystem-title">
    <div className="premium-ecosystem-heading"><span>✦ O ECOSSISTEMA ANTARES</span><h2 id="premium-ecosystem-title">Uma experiência que começa na escola e continua nas descobertas</h2></div>
    {reactBitsPreview
      ? <div className="premium-magic-bento-wrap">
          <MagicBento
            className="premium-magic-bento-grid"
            items={ecosystemBentoItems}
            columns={3}
            rowHeight={210}
            gap={14}
            radius={22}
            theme="dark"
            glowColor="#9bd7ff"
            textAutoHide={false}
            enableBorderGlow
            enableSpotlight
            spotlightRadius={320}
            enableStars={false}
            enableTilt
            enableMagnetism={false}
            clickEffect={false}
            intro
            disableAnimations={reduce}
          />
        </div>
      : <div className="premium-ecosystem-grid">
          {ecosystemCards.map(card=><article key={card.title}>
            <span className="premium-ecosystem-icon" aria-hidden="true">{card.icon}</span>
            <h3>{card.title}</h3><p>{card.description}</p>
          </article>)}
        </div>}
   </section>
   <section id="experiencia" className="premium-section"><div className="premium-section-title"><span>✦ COMO FUNCIONA</span><h2>A escola vira um portal para o espaço!</h2><p>A aventura acontece em três passos simples.</p></div><div className="premium-three"><article><div>🚚</div><b>01</b><h3>Chegamos e montamos</h3><p>Levamos a estrutura do planetário móvel até o local combinado.</p></article><article><div>🪐</div><b>02</b><h3>A turma entra na cúpula</h3><p>As crianças mergulham em uma experiência imersiva.</p></article><article><div>🚀</div><b>03</b><h3>Exploramos juntos</h3><p>Uma viagem guiada cheia de descobertas e perguntas.</p></article></div></section>
   <section className="premium-showcase" aria-label="Experiências ilustradas do planetário"><div className="premium-section-title"><span>✦ CONHEÇA NOSSO UNIVERSO</span><h2>Uma experiência para lembrar</h2><p>Da cúpula às estrelas: conheça possibilidades de visitas, jornadas e eventos.</p></div>{reactBitsPreview && !reduce && galleryAvailable ? <div className="premium-reactbits-gallery-area"><p className="premium-reactbits-gallery-hint">A galeria se movimenta sozinha. Arraste ou deslize para explorar; ao interagir, o movimento pausa. Toque em uma imagem para ampliar.</p><div className="premium-reactbits-gallery-frame"><CircularGallery items={reactBitsGalleryItems} bend={1.6} itemSize={0.83} itemAspect={1.1} gap={0.24} wave={0.55} fadeEdges={0.12} shadow={0.32} textColor="#f8fbff" font="bold 25px system-ui" scrollSpeed={1} scrollEase={0.07} autoScroll={0.85} showTitles={true} grayscale={false} openOnClick={true} intro={true} /></div><p className="premium-reactbits-gallery-credit">Imagens astronômicas reais e material ilustrativo; não são registros de eventos realizados pelo ANTARES. Créditos: <a href="https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-and-miri-composite-image/" target="_blank" rel="noopener noreferrer">NASA/ESA/CSA/STScI (Carina)</a> · <a href="https://science.nasa.gov/asset/webb/pillars-of-creation-nircam-image/" target="_blank" rel="noopener noreferrer">NASA/ESA/CSA/STScI (Pilares)</a> · <a href="https://science.nasa.gov/photojournal/jewel-of-the-solar-system/" target="_blank" rel="noopener noreferrer">NASA/JPL-Caltech/SSI/Cornell (Saturno)</a> · <a href="https://science.nasa.gov/resource/blue-marble/" target="_blank" rel="noopener noreferrer">NASA Goddard (Terra)</a>.</p></div> : <>{reactBitsPreview && <p className="premium-reactbits-gallery-hint">Galeria em versão estática para preservar a acessibilidade e a compatibilidade deste dispositivo.</p>}<div className="premium-showcase-grid">{showcasePhotos.map(card=><article key={card.title}><MarketingPhoto src={card.src} fallback={card.fallback} alt={card.alt} width={700} height={450} className="premium-showcase-photo"/><div><h3>{card.title}</h3><p>{card.desc}</p></div></article>)}</div><p className="premium-showcase-disclaimer">Fotografias ilustrativas de outras experiências e do espaço. Não representam eventos realizados pelo ANTARES. <span className="premium-photo-credits">Créditos: <a href="https://www.eso.org/public/images/upr_IMG_6184-CC/" target="_blank" rel="noopener noreferrer">ESO / P. Horálek</a> · <a href="https://unsplash.com/photos/photography-of-astronaut-beside-satellite-OLlj17tUZnU" target="_blank" rel="noopener noreferrer">NASA / Unsplash</a> · <a href="https://commons.wikimedia.org/wiki/File:SPB-MobilesPlanetariumINTENSE%C2%A9SPB_FotoF.-M_(9).jpg" target="_blank" rel="noopener noreferrer">SPB Kommunikation</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>) · <a href="https://unsplash.com/photos/night-sky-with-milky-way-observatory-and-people-stargazing-dU4dX1l0UFM" target="_blank" rel="noopener noreferrer">Scott Goodwill / Unsplash</a>. </span></p></>}</section>
   <section id="viagens" className={'premium-section premium-journeys'+(reactBitsPreview?' premium-journeys-cinematic':'')}>
    <div className="premium-section-title">
     <span>PARA CADA TURMA</span>
     <h2>Uma aventura para cada idade</h2>
     <p>Escolha uma faixa etária para conhecer algumas possibilidades de conteúdo.</p>
    </div>
    <div className="premium-age-tabs" role="tablist" aria-label="Faixas etárias">
     {(Object.keys(journeys) as Age[]).map(a=><button
       role="tab"
       aria-selected={age===a}
       aria-controls="premium-journey-panel"
       id={`premium-age-tab-${Object.keys(journeys).indexOf(a)}`}
       key={a}
       onClick={()=>setAge(a)}
      >{a}</button>)}
    </div>
    <div className="premium-journey-grid" id="premium-journey-panel" role="tabpanel" aria-label={age}>
     {journeys[age].map(([emoji,title,description])=>reactBitsPreview
       ? <SpotlightCard
          key={title}
          className="premium-journey-spotlight"
          theme="dark"
          spotlightColor="#a7e2ff"
          spotlightSize={260}
          intensity={0.24}
          softness={0.8}
          borderGlow={0.85}
          proximity={110}
          smoothing={0.2}
          ambient={false}
          flare={false}
         >
          <div className="premium-journey-visual">
           <JourneyArtwork kind={journeyArtByTitle[title]??'saturn'}/>
          </div>
          <div className="premium-journey-copy">
           <h3>{title}</h3>
           <p>{description}</p>
          </div>
         </SpotlightCard>
       : <article key={title}><span>{emoji}</span><h3>{title}</h3><p>{description}</p></article>)}
    </div>
   </section>
   <section id="jogo" className={'premium-game-reveal'+(reactBitsPreview?' premium-game-cinematic':'')} aria-labelledby="premium-game-title">
    <div className="premium-game-content">
     <span className="premium-game-eyebrow">✦ UM NOVO CAPÍTULO DO UNIVERSO ANTARES</span>
     <h2 id="premium-game-title">A aventura continua <em>além da cúpula.</em></h2>
     <p>Astro, Lunna e Pixel estão se preparando para uma nova jornada educativa. Em breve, as crianças poderão continuar descobrindo o espaço em uma experiência digital ANTARES.</p>
     {reactBitsPreview&&<div className="premium-game-micro-benefits" aria-label="O que vem por aí">
      <span>✦ Aprender brincando</span>
      <span>✦ Descobrir o universo</span>
      <span>✦ Viajar com os mascotes</span>
     </div>}
     <div className="premium-game-soon">EM BREVE</div>
     <small>Prévia ilustrativa do futuro jogo ANTARES Kids. Lançamento ainda não anunciado.</small>
    </div>
    <figure className={'premium-game-art'+(reactBitsPreview?' premium-game-art-cinematic':'')} aria-label="Arte conceitual do futuro jogo ANTARES com Astro, Lunna, Pixel e planetas">
     <div className="premium-game-planet premium-game-planet-a" aria-hidden="true"/>
     <div className="premium-game-planet premium-game-planet-b" aria-hidden="true"/>
     <div className="premium-game-planet premium-game-planet-c" aria-hidden="true"/>
     <div className="premium-game-orbit premium-game-orbit-one" aria-hidden="true"/>
     <div className="premium-game-orbit premium-game-orbit-two" aria-hidden="true"/>
     {reactBitsPreview
      ? <Image
         src="/vitrine/mascotes-jogo-novas-poses.webp"
         alt="Lunna flutuando e apontando para uma estrela, Astro explorando um mapa de constelações e Pixel voando acima deles"
         width={700}
         height={467}
         className="premium-game-new-pose-art"
        />
      : <>
         <div className="premium-game-cast">
          <Image src="/mascotes/lunna.png" alt="" width={185} height={238} className="premium-game-figure premium-game-lunna"/>
          <Image src="/mascotes/astro.png" alt="" width={200} height={254} className="premium-game-figure premium-game-astro"/>
          <Image src="/mascotes/pixel.png" alt="" width={140} height={155} className="premium-game-figure premium-game-pixel"/>
         </div>
         <figcaption>JOGO EDUCATIVO ANTARES <strong>EM BREVE</strong></figcaption>
        </>}
    </figure>
   </section>
   <ProvaSocial experimental={reactBitsPreview}/>
   <section id="escolas" className={'premium-school'+(reactBitsPreview?' premium-school-cinematic':'')}><div><span>ESCOLAS E INSTITUIÇÕES</span><h2>O universo pode voltar todos os anos.</h2><p>Planeje visitas recorrentes com turmas diferentes. Pacotes e condições especiais são definidos em proposta personalizada.</p><a className="premium-button" href="#orcamento">Conhecer as possibilidades <ArrowRight size={17}/></a></div><div className="premium-school-art premium-school-picture">
       <Image
        src={reactBitsPreview?'/vitrine/cupula-cinematografica-astro.webp':'/vitrine/cupula-escola-antares.webp'}
        alt={reactBitsPreview?'Ilustração cinematográfica de cúpula de planetário móvel com Astro apresentando a experiência':'Imagem conceitual de cúpula inflável de planetário móvel, sem pessoas, em pátio escolar'}
        width={533}
        height={400}
        className="premium-school-photo"
       />
       {!reactBitsPreview&&<small className="premium-school-credit">Ilustração digital de um planetário móvel. Não é uma foto do ANTARES.</small>}
      </div></section>
    <section id="orcamento" className={'premium-section premium-contact premium-contact-v2'+(reactBitsPreview?' premium-contact-cinematic':'')}>
     <div>
      <span>PRONTOS PARA DECOLAR?</span>
      <h2>Peça sua proposta personalizada.</h2>
      <p>{reactBitsPreview?'Conte sobre sua escola, evento ou instituição. Nossa equipe analisará suas informações e poderá preparar uma proposta sob medida.':'Conte sobre sua escola ou instituição. Nossa equipe poderá organizar uma proposta conforme a quantidade de participantes, a data e o tipo de experiência.'}</p>
      {reactBitsPreview
        ? <div className="premium-contact-benefits" aria-label="Benefícios do atendimento">
           <SpotlightCard className="premium-contact-benefit-card" theme="dark" spotlightColor="#b0e8ff" spotlightSize={185} intensity={0.32} borderGlow={0.82} softness={0.8} proximity={70} smoothing={0.18} flare={false}>
             <span className="premium-contact-benefit-icon"><ShieldCheck size={21} aria-hidden="true"/></span>
             <strong>Atendimento personalizado</strong>
             <small>Uma proposta pensada para sua instituição.</small>
           </SpotlightCard>
           <SpotlightCard className="premium-contact-benefit-card" theme="dark" spotlightColor="#aedaff" spotlightSize={185} intensity={0.32} borderGlow={0.82} softness={0.8} proximity={70} smoothing={0.18} flare={false}>
             <span className="premium-contact-benefit-icon"><CalendarDays size={21} aria-hidden="true"/></span>
             <strong>Data combinada</strong>
             <small>Planejamento conforme a agenda do evento.</small>
           </SpotlightCard>
           <SpotlightCard className="premium-contact-benefit-card premium-contact-benefit-wide" theme="dark" spotlightColor="#a9ccff" spotlightSize={185} intensity={0.32} borderGlow={0.82} softness={0.8} proximity={70} smoothing={0.18} flare={false}>
             <span className="premium-contact-benefit-icon"><Send size={20} aria-hidden="true"/></span>
             <strong>Proposta sob medida</strong>
             <small>Para escolas, associações e eventos.</small>
           </SpotlightCard>
          </div>
        : <div className="premium-contact-highlights">
       <span><ShieldCheck size={16}/> Atendimento personalizado</span>
       <span><CalendarDays size={16}/> Data combinada com a escola</span>
       <span><MessageCircle size={16}/> Retorno pelo WhatsApp</span>
      </div>}
      <div className="premium-robot"><Image src="/mascotes/pixel.png" width={105} height={110} alt="PIXEL, o robô companheiro do ANTARES"/><small>{reactBitsPreview?'Pixel pronto para ajudar a planejar sua próxima aventura espacial!':'BIP! BIP! SUA AVENTURA COMEÇA AQUI!'}</small></div>
      {reactBitsPreview&&<p className="premium-contact-whatsapp-info"><MessageCircle size={17} aria-hidden="true"/> Após sua solicitação, nossa equipe poderá continuar o atendimento pelo WhatsApp informado.</p>}
      <p className="premium-privacy"><ShieldCheck size={17}/> Formulário destinado a adultos responsáveis. Não solicitamos dados pessoais de crianças.</p>
     </div>
     {reactBitsPreview
       ? <ProposalStarFrame>
           <SpotlightCard
             className="premium-contact-bento-form"
             theme="dark"
             spotlightColor="#98ddff"
             spotlightSize={390}
             intensity={0.24}
             softness={0.76}
             borderGlow={0.96}
             proximity={150}
             smoothing={0.22}
             ambient
             flare={false}
           >{proposalForm}</SpotlightCard>
         </ProposalStarFrame>
       : proposalForm}
    </section>
   {reactBitsPreview?<AnimatedFaq/>:<section className="premium-section premium-faq"><div className="premium-section-title"><span>DÚVIDAS FREQUENTES</span><h2>Perguntas de quem vai viajar</h2></div><details><summary>O planetário vai até a escola?</summary><p>Sim. A equipe leva a estrutura móvel e combina previamente o espaço necessário.</p></details><details><summary>Quantas crianças participam?</summary><p>A capacidade depende da cúpula utilizada. As turmas são organizadas em sessões.</p></details><details><summary>Também atende eventos e associações?</summary><p>Sim. Basta informar o formato do evento no pedido de orçamento.</p></details><details><summary>É indicado para quais idades?</summary><p>As experiências podem ser planejadas para diferentes faixas etárias. Conte a idade aproximada da turma nas observações para que a equipe avalie os conteúdos adequados.</p></details><details><summary>O jogo ANTARES já está disponível?</summary><p>Ainda não! Estamos preparando o jogo educativo ANTARES Kids, sem data de lançamento anunciada. Para saber das novidades, marque a opção de interesse no formulário.</p></details></section>}
   {reactBitsPreview&&<div className="premium-endcap" data-vitrine-end>
      <StarBorderBackToTop />
   </div>}
  </main>
  {!reactBitsPreview&&<footer className="premium-footer"><div><strong>✦ ANTARES · PLANETÁRIO KIDS</strong><p>Descobrindo o universo, uma escola de cada vez.</p></div><a href="#inicio">Voltar ao início ↑</a></footer>}
  {reactBitsPreview?<StarBorderBudgetAction location="floating"/>:<a href="#orcamento" className="premium-floating" aria-label="Solicitar orçamento"><MessageCircle size={20}/> Orçamento</a>}
 </div>;
}
