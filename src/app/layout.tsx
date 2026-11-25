import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata = {title:'Planetário Móvel ANTARES',description:'Gestão do Planetário Móvel ANTARES',applicationName:'ANTARES BUSINESS',appleWebApp:{capable:true,title:'ANTARES'},icons:{icon:'/antares-icon-512.png?v=2',apple:'/antares-icon-512.png?v=2'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#123c92'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
