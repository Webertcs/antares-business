import { NextResponse } from 'next/server';

/**
 * Fontes astronômicas fechadas e verificadas. Evita CORS no WebGL e impede
 * que a rota funcione como proxy aberto (SSRF).
 * A vitrine oficial continua sem depender desta rota experimental.
 */
const PHOTOS = {
 nebulosa:'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/webb/science/2022/07/STScI-01G8GYD8B1H306SSPR4MY6NGN0.png?fit=clip&w=1000&h=690',
 pilares:'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/webb/science/2022/10/STScI-01GGF8H15VZ09MET9HFBRQX4S3.png?fit=clip&w=750&h=1000',
 saturno:'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia17/pia17474/PIA17474.jpg?fit=clip&w=1000&h=690',
 terra:'https://assets.science.nasa.gov/dynamicimage/assets/science/esd/climate/2023/12/ImageWall5_1920x1200-80.jpg?fit=clip&w=1000&h=690',
 galaxia:'https://assets.science.nasa.gov/dynamicimage/assets/science/missions/webb/science/2022/07/STScI-01G8H1K2BCNATEZSKVRN9Z69SR.png?fit=clip&w=1000&h=1000'
} as const;

export async function GET(_request: Request,{params}:{params:Promise<{foto:string}>}){
 const {foto}=await params;
 if(!Object.prototype.hasOwnProperty.call(PHOTOS,foto)){
  return new NextResponse('Imagem não encontrada',{status:404});
 }
 const url=PHOTOS[foto as keyof typeof PHOTOS];
 try {
  const upstream=await fetch(url,{signal:AbortSignal.timeout(12000),next:{revalidate:86400}});
  const type=(upstream.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!upstream.ok || (type!=='image/jpeg' && type!=='image/png' && type!=='image/webp')){
   throw new Error('Resposta inválida do servidor de imagens');
  }
  const payload=await upstream.arrayBuffer();
  if(payload.byteLength<1000 || payload.byteLength>7_000_000)throw new Error('Tamanho inesperado');
  return new NextResponse(payload,{headers:{
    'Content-Type':type,
    'Cache-Control':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    'X-Content-Type-Options':'nosniff'
  }});
 } catch {
  return new NextResponse('Imagem temporariamente indisponível',{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
