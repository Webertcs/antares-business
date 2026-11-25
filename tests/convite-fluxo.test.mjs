// Regressão estática da trilha de convite. A validação de sessão real é feita na homologação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('login comum preserva redirecionamento sem aceite', () => {
 const actions=file('src/app/auth/sign-in/actions.ts');
 const login=file('src/app/auth/sign-in/LoginForm.tsx');
 assert.ok(actions.includes("if(/^[a-f0-9]{64}$/.test(token))return { error: '', inviteReady: true };"));
 assert.ok(actions.includes("redirect('/');"));
 assert.ok(login.includes('valid?signInAndAccept:signInAction'));
});

test('aceite acontece após login explícito, com sessão e resposta de sucesso', () => {
 const login=file('src/app/auth/sign-in/LoginForm.tsx');
 const start=login.indexOf('async function signInAndAccept');
 const end=login.indexOf('function LoginFormContent');
 const flow=login.slice(start,end);
 const order=['await signInAction(previous,form)','if(result.error)','result.inviteReady!==true',"await fetch('/api/equipe/convites/aceitar'","credentials:'same-origin'",'if(!response.ok||data.success!==true)',"window.location.replace('/')"];
 let last=-1;
 for(const part of order){const index=flow.indexOf(part);assert.ok(index>last,part);last=index;}
 assert.ok(!login.includes('useEffect'));
});

test('API mantém guardas originais e função restrita de aceite', () => {
 const api=file('src/app/api/equipe/convites/aceitar/route.ts');
 for(const part of ['assertSensitiveWriteAllowed(request)','auth.getSession()','user.emailVerified !== true','createHash(\'sha256\')','public.accept_team_invitation','user.email.trim().toLowerCase()'])assert.ok(api.includes(part),part);
});

test('trilha tem três etapas e não oferece aceite sem login', () => {
 const convite=file('src/app/convite/ConviteClient.tsx');
 assert.ok(convite.includes('3 etapas'));
 assert.ok(!convite.includes('onClick={accept}'));
 assert.ok(!convite.includes('/api/equipe/convites/aceitar'));
 assert.ok(convite.includes('{valid?<div'));
 for(const [path,step] of [['src/app/auth/primeiro-acesso/page.tsx',1],['src/app/auth/verificar-email/page.tsx',2],['src/app/auth/sign-in/LoginForm.tsx',3]])assert.ok(file(path).includes('Etapa '+step+' de 3'));
});
