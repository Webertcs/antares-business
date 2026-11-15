// ANTARES BUSINESS — Homologação integrada do Bloco 02.
// Não cria usuários, não envia convites e não modifica dados no Neon.
// Uma falha reprova o lote; detalhes de segredos nunca são impressos.
import { spawnSync } from 'node:child_process';
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const tests = [
  ['Variáveis de autenticação', () => {
    const keys=['DATABASE_URL','NEON_AUTH_BASE_URL','NEON_AUTH_COOKIE_SECRET'];
    return keys.every(key => {
      const val=process.env[key];
      return Boolean(val && !/^(SUA_|SEU_|SENHA_|HOST$)/.test(val.trim()));
    });
  }],
  ['Convites bloqueados durante homologação', () =>
    process.env.ANTARES_TEAM_WRITES_ENABLED !== 'true'],
  ['Conexão de equipe restrita', () => {
    const r=spawnSync(process.execPath,['scripts/verificar-runtime-team.mjs'],{encoding:'utf8'});
    return r.status === 0 && r.stdout.includes('PASSOU:');
  }],
  ['Compilação do aplicativo', () => {
    const cmd=process.platform==='win32'?'cmd.exe':'npm';
    const r=spawnSync(cmd,process.platform==='win32'?['/d','/s','/c','npm.cmd run build']:['run','build'],{stdio:'ignore',shell:false});
    return r.status===0;
  }],
  ['Auditoria de dependências de produção', () => {
    const cmd=process.platform==='win32'?'cmd.exe':'npm';
    const args=process.platform==='win32'
      ? ['/d','/s','/c','npm.cmd audit --omit=dev --audit-level=high']
      : ['audit','--omit=dev','--audit-level=high'];
    const r=spawnSync(cmd,args,{stdio:'ignore',shell:false});
    return r.status===0;
  }]
];
let fails=0;
for(const [name,run] of tests){
  let ok=false;
  try {ok=run()===true;} catch {ok=false;}
  console.log((ok?'OK':'PENDENTE')+' — '+name);
  if(!ok)fails++;
}
console.log(fails===0
  ? 'VERIFICAÇÕES TÉCNICAS PASSARAM. Ainda falta teste E2E com duas contas e isolamento A/B.'
  : 'BLOCO 02 NÃO HOMOLOGADO: '+fails+' verificação(ões) pendente(s). Nenhum dado do banco foi alterado.');
process.exitCode=fails?1:0;
