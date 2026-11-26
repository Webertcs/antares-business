import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, getTeamWriteDb } from '@/lib/equipe/auth';
import { assertSensitiveWriteAllowed } from '@/lib/equipe/write-guard';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store'};
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({error:'Somente o proprietário pode gerenciar colaboradores.'},{status:403,headers});
  const denied = await assertSensitiveWriteAllowed(request);
  if (denied) return denied;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return NextResponse.json({error:'Requisição excessiva.'},{status:413,headers});
    let body;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({error:'JSON inválido.'},{status:400,headers}); }
    if (!body || typeof body.memberId !== 'string' || !uuid.test(body.memberId) || !['reactivate','archive'].includes(body.action))
      return NextResponse.json({error:'Dados inválidos.'},{status:400,headers});
    const db = getTeamWriteDb();
    const check = await db`SELECT p.prosecdef AND pg_get_userbyid(p.proowner)='neondb_owner'
      AND has_function_privilege(current_user,p.oid,'EXECUTE')
      AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS safe
      FROM pg_proc p WHERE p.oid=to_regprocedure('public.antares_manage_collaborator(text,uuid,uuid,text)')`;
    if (check[0]?.safe !== true) return NextResponse.json({error:'Gerenciamento seguro ainda não implantado.'},{status:503,headers});
    const rows = await db`SELECT public.antares_manage_collaborator(${owner.user.id},${owner.organizationId}::uuid,${body.memberId}::uuid,${body.action}) AS success`;
    if (rows[0]?.success !== true) return NextResponse.json({error:'Operação não permitida. Confira a situação do colaborador e os convites pendentes.'},{status:409,headers});
    return NextResponse.json({success:true},{headers});
  } catch { return NextResponse.json({error:'Não foi possível atualizar o acesso.'},{status:500,headers}); }
}
