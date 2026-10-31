import Image from 'next/image';
'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Volume2,VolumeX,Pause,Play,Send,ShieldCheck,MessageCircle} from 'lucide-react';
import './premium.css';
const worlds=[
 {id:'sol',name:'Sol',icon:'☀️',fact:'O Sol é uma estrela! Sua luz leva cerca de oito minutos para chegar à Terra.',duration:0},
 {id:'mercurio',name:'Mercúrio',icon:'🪨',fact:'Mercúrio é o planeta mais próximo do Sol e dá uma volta nele em apenas 88 dias.',duration:13},
 {id:'venus',name:'Vênus',icon:'🌕',fact:'Vênus é o planeta mais quente do nosso Sistema Solar.',duration:19},
 {id:'terra',name:'Terra',icon:'🌎',fact:'A Terra é nosso lar e tem água líquida em grande quantidade na superfície.',duration:27},
 {id:'marte',name:'Marte',icon:'🔴',fact:'Marte é chamado de planeta vermelho por causa do óxido de ferro em sua superfície.',duration:35},
 {id:'jupiter',name:'Júpiter',icon:'🟠',fact:'Júpiter é o maior planeta do Sistema Solar e possui uma tempestade gigante.',duration:46},
 {id:'saturno',name:'Saturno',icon:'🪐',fact:'Os anéis de Saturno são feitos principalmente de gelo e fragmentos de rochas.',duration:58}
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
 const [mascot,setMascot]=useState<'Astro'|'Lunna'>('Astro');
 const [formStatus,setFormStatus]=useState('');
 const [dark,setDark]=useState(false);
 const [reduce,setReduce]=useState(false);
 useEffect(()=>{setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);setVoiceAvailable('speechSynthesis'in window);return()=>{window.speechSynthesis?.cancel();};},[]);
 function selectWorld(w:World){
  setWorld(w);setMascot(m=>m==='Astro'?'Lunna':'Astro');
  if(!mute&&voiceAvailable){
   window.speechSynthesis.cancel();
   const utter=new SpeechSynthesisUtterance(w.fact);
   utter.lang='pt-BR';utter.rate=.93;utter.pitch=1.08;
   window.speechSynthesis.speak(utter);
  }
 }
 function toggleSound(){
  if(!mute)window.speechSynthesis?.cancel();
  setMute(v=>!v);
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
 return <div className={'premium-kids'+(dark?' premium-night':'')}>
  <header className="premium-header"><a href="#inicio" className="premium-logo"><span>✦</span> ANTARES <small>PLANETÁRIO KIDS</small></a><nav aria-label="Navegação da vitrine"><a href="#experiencia">Experiência</a><a href="#viagens">Viagens</a><a href="#escolas">Escolas</a><a className="premium-nav-cta" href="#orcamento">Pedir orçamento <ArrowRight size={16}/></a></nav><button className="premium-theme" onClick={()=>setDark(v=>!v)} aria-label={dark?'Ativar tema claro':'Ativar tema escuro'}>{dark?'☀️':'🌙'}</button></header>
  <main><section className="premium-hero" id="inicio"><div className="premium-copy"><span className="premium-eyebrow">✦ O UNIVERSO VAI ATÉ SUA ESCOLA</span><h1>Uma viagem espacial <em>inesquecível!</em></h1><p>Uma cúpula de descobertas, planetas e histórias. A ciência ganha vida em uma experiência que encanta pequenos exploradores.</p><div className="premium-actions"><a className="premium-button" href="#orcamento">Levar o planetário à escola <ArrowRight size={18}/></a><a className="premium-ghost" href="#experiencia">Descobrir a experiência</a></div><div className="premium-trust"><span>✦ Educativo</span><span>✦ Para crianças</span><span>✦ Na sua escola</span></div></div>
   <div className="premium-universe"><div className="premium-sky"><div className={'premium-orbits'+(stopped?' is-paused':'')}>
     {worlds.slice(1).map((w,i)=><div className="premium-orbit" key={w.id} style={{width:(27+i*11.7)+'%',height:(27+i*11.7)+'%',animationDuration:w.duration+'s',animationPlayState:stopped?'paused':undefined}}><button type="button" className={'premium-world premium-world-'+w.id+(world.id===w.id?' chosen':'')} style={{animationDuration:w.duration+'s',animationPlayState:stopped?'paused':undefined}} aria-label={'Descobrir '+w.name} onClick={()=>selectWorld(w)}>{w.icon}</button></div>)}
     <button type="button" className={'premium-sun'+(world.id==='sol'?' chosen':'')} onClick={()=>selectWorld(worlds[0])} aria-label="Descobrir o Sol">☀️</button>
    </div><div className="premium-universe-controls"><button onClick={()=>setPaused(v=>!v)} aria-label={paused?'Retomar órbitas':'Pausar órbitas'}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'Continuar':'Pausar'}</button><button onClick={toggleSound} aria-label={mute?'Ativar narração':'Silenciar narração'} disabled={!voiceAvailable}>{mute?<VolumeX size={16}/>:<Volume2 size={16}/>} {mute?'Ouvir':'Silenciar'}</button></div></div>
    <div className="premium-crew"><button className={'premium-mascot'+(mascot==='Astro'?' speaking':'')} onClick={()=>setMascot('Astro')} aria-label="Selecionar Astro"><Image src="/mascotes/astro.svg" alt="" width={115} height={150} className="premium-character-image"/><strong>ASTRO</strong></button><div className="premium-speech" aria-live="polite"><b>{mascot} apresenta {world.name}!</b><p>{world.fact}</p><small>Toque nos planetas e descubra o universo.</small></div><button className={'premium-mascot'+(mascot==='Lunna'?' speaking':'')} onClick={()=>setMascot('Lunna')} aria-label="Selecionar Lunna"><Image src="/mascotes/lunna.svg" alt="" width={115} height={150} className="premium-character-image"/><strong>LUNNA</strong></button></div>
    <p className="premium-motion-note">As órbitas são ilustrativas, não representam distâncias reais. Use Pausar para explorar com calma.</p>
   </div></section>
   <section id="experiencia" className="premium-section"><div className="premium-section-title"><span>COMO FUNCIONA</span><h2>A escola vira um portal para o espaço!</h2><p>A aventura acontece em três passos simples.</p></div><div className="premium-three"><article><div>🚚</div><b>01</b><h3>Chegamos e montamos</h3><p>Levamos a estrutura do planetário móvel até o local combinado.</p></article><article><div>🪐</div><b>02</b><h3>A turma entra na cúpula</h3><p>As crianças mergulham em uma experiência imersiva.</p></article><article><div>🚀</div><b>03</b><h3>Exploramos juntos</h3><p>Uma viagem guiada cheia de descobertas e perguntas.</p></article></div></section>
   <section id="viagens" className="premium-section premium-journeys"><div className="premium-section-title"><span>PARA CADA TURMA</span><h2>Uma aventura para cada idade</h2><p>Escolha uma faixa etária para conhecer algumas possibilidades de conteúdo.</p></div><div className="premium-age-tabs" role="tablist" aria-label="Faixas etárias">{(Object.keys(journeys) as Age[]).map(a=><button role="tab" aria-selected={age===a} key={a} onClick={()=>setAge(a)}>{a}</button>)}</div><div className="premium-journey-grid">{journeys[age].map(([emoji,title,description])=><article key={title}><span>{emoji}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
   <section id="escolas" className="premium-school"><div><span>ESCOLAS E INSTITUIÇÕES</span><h2>O universo pode voltar todos os anos.</h2><p>Planeje visitas recorrentes com turmas diferentes. Pacotes e condições especiais são definidos em proposta personalizada.</p><a className="premium-button" href="#orcamento">Conhecer as possibilidades <ArrowRight size={17}/></a></div><div className="premium-school-art" aria-hidden="true">🏫 <span>🌟</span> 🪐</div></section>
   <section id="orcamento" className="premium-section premium-contact"><div><span>PRONTOS PARA DECOLAR?</span><h2>Leve essa experiência para sua escola!</h2><p>Conte sobre sua instituição. A equipe poderá preparar uma proposta conforme o número de participantes e o formato da visita.</p><div className="premium-robot"><Image src="/mascotes/nexo.svg" width={105} height={110} alt="NEXO, o robô companheiro do ANTARES"/><small>BIP! BIP! SUA AVENTURA COMEÇA AQUI!</small></div><p className="premium-privacy"><ShieldCheck size={17}/> Formulário destinado a adultos responsáveis. Não solicitamos dados pessoais de crianças.</p></div><form onSubmit={submit}><div className="premium-form-grid"><label>Seu nome<input required name="nome" maxLength={120} autoComplete="name"/></label><label>Escola ou instituição<input required name="instituicao" maxLength={150}/></label><label>Cidade<input required name="cidade" maxLength={100}/></label><label>WhatsApp<input required name="telefone" type="tel" maxLength={22} autoComplete="tel"/></label><label>Público<select name="publico" defaultValue="Escola"><option>Escola</option><option>Associação</option><option>Empresa</option><option>Evento particular</option></select></label><label>Participantes estimados<input name="alunos" type="number" min="1" max="100000"/></label><label>Data desejada<input name="data" type="date"/></label></div><label>Observações<textarea name="mensagem" rows={3} maxLength={800}/></label><label className="premium-consent"><input required type="checkbox"/> Autorizo o contato em resposta a este pedido de orçamento. Entendo que os dados serão usados para esse atendimento.</label><button className="premium-button" type="submit">Preparar pedido <Send size={17}/></button>{formStatus&&<p role="status" className="premium-form-status">{formStatus}</p>}<small>Prévia comercial: sem gravação no CRM até concluir a integração autorizada.</small></form></section>
   <section className="premium-section premium-faq"><div className="premium-section-title"><span>DÚVIDAS FREQUENTES</span><h2>Perguntas de quem vai viajar</h2></div><details><summary>O planetário vai até a escola?</summary><p>Sim. A equipe leva a estrutura móvel e combina previamente o espaço necessário.</p></details><details><summary>Quantas crianças participam?</summary><p>A capacidade depende da cúpula utilizada. As turmas são organizadas em sessões.</p></details><details><summary>Também atende eventos e associações?</summary><p>Sim. Basta informar o formato do evento no pedido de orçamento.</p></details></section>
  </main><footer className="premium-footer"><div><strong>✦ ANTARES · PLANETÁRIO KIDS</strong><p>Descobrindo o universo, uma escola de cada vez.</p></div><a href="#inicio">Voltar ao início ↑</a></footer>
  <a href="#orcamento" className="premium-floating" aria-label="Solicitar orçamento"><MessageCircle size={20}/> Orçamento</a>
 </div>;
}
