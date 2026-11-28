import { NextResponse } from 'next/server';
import { requireDeveloper } from '@/lib/equipe/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
  const developer=await requireDeveloper();
  if(!developer)return NextResponse.json({error:'Acesso técnico restrito.'},{status:403,headers});
  return NextResponse.json({application:'responding',authentication:'verified',accessCheck:'completed',technicalOnly:developer.technicalOnly},{headers});
}
