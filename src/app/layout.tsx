import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata = {title:'ANTARES BUSINESS · Planetários',description:'Gestão e experiências espaciais para planetários',applicationName:'ANTARES BUSINESS',appleWebApp:{capable:true,title:'ANTARES'},icons:{icon:'/antares-icone-512.png',apple:'/antares-icone-512.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#123c92'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
