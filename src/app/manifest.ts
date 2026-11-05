import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{
 return {name:'ANTARES BUSINESS — Planetário',short_name:'ANTARES',
 description:'CRM de planetário móvel: agenda, comercial e gestão.',
 start_url:'/',scope:'/',display:'standalone',
 background_color:'#f4f7fc',theme_color:'#123c92',
 icons:[{src:'/antares-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};
}
