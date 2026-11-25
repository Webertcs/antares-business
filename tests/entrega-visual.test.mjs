// Verificações estáticas de regressões visuais no ANTARES.
// Executar: node --test tests/entrega-visual.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('logo do menu é diferente do ícone quadrado do PWA', () => {
  const dashboard = file('src/app/DashboardClient.tsx');
  const metadata = file('src/app/layout.tsx');
  assert.match(dashboard, /logoMenuFallback\?"\/antares-logo-vertical\.png":"\/antares-logo-menu-transparente\.png"/);
  assert.doesNotMatch(dashboard, /logoMenuFallback\?"\/antares-logo-vertical\.png":"\/antares-icon-512\.png"/);
  assert.match(metadata, /icons:\{icon:'\/antares-icon-512\.png'/);
});

test('alteração de senha permanece disponível sem ocupar todo o perfil', () => {
  const profile = file('src/app/perfil/ProfileClient.tsx');
  assert.match(profile, /<details[^>]*>/);
  assert.match(profile, /<summary[^>]*>Alterar senha<\/summary>/);
  assert.match(profile, /<form ref=\{passwordForm\} action=\{passwordAction\}/);
});

test('primeiro acesso sem convite mostra recuperação, não cadastro', () => {
  const first = file('src/app/auth/primeiro-acesso/page.tsx');
  assert.match(first, /href="\/auth\/esqueci-senha"/);
  assert.match(first, /:valid\?\s*<form action=\{action\}/);
});

test('total de alunos é identificado como total do evento', () => {
  const event = file('src/app/eventos/[id]/page.tsx');
  assert.match(event, /Alunos previstos no evento/);
  assert.match(event, /Alunos atendidos no evento/);
});

test('operações têm atalho direto para eventos', () => {
  const dashboard = file('src/app/DashboardClient.tsx');
  assert.match(dashboard, /onClick=\{\(\)=>router\.push\('\/eventos'\)\}>Ver eventos/);
});
