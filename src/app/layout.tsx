import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata = {title:'Planetário Móvel ANTARES',description:'Gestão do Planetário Móvel ANTARES',applicationName:'Planetário Móvel ANTARES',appleWebApp:{capable:true,title:'ANTARES'},icons:{icon:'/antares-icon-512.png',apple:'/antares-icon-512.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#123c92'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
