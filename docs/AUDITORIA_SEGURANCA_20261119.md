# ANTARES — Auditoria de segurança, 19/11/2026

**Escopo:** branch `feature/entrega-proprietario-20261119` como base. Esta branch de auditoria **não altera o banco e não está pronta para implantação**. Nenhuma credencial, e-mail de usuário ou dado de cliente é incluído aqui.

## 1. Autenticação e dependências (P0 — bloqueia entrega)

O CI do GitHub executa `npm ci`, `npm run build` e `npm audit --omit=dev --audit-level=high`. Em 19/11 o build passou e o `npm audit` reprovou (6 entradas: 1 crítica, 3 altas, 1 moderada, 1 baixa).

- O lockfile do GitHub contém `@neondatabase/auth@0.7.0-beta`; seu grafo fixa `better-auth@1.7.6` e cópias de `zod@4.5.4`. Essas versões foram sinalizadas em `GHSA-965c-763c-88jm`, `GHSA-r4xp-prcw-77qf`, `GHSA-mrhx-c7xc-m3w5` e outras.
- O lockfile registra `next@16.4.3` (alertas resolvidos na linha 16.4.5+). A instalação local do desenvolvedor usou 16.4.6; versões instaladas localmente não comprovam o que o CI ou a implantação usará.
- A falha crítica do Better Auth exige combinações de Magic Link + OAuth. A interface do ANTARES usa e-mail e senha; **a configuração de autenticação gerenciada no Neon ainda não foi inspecionada**. O alerta de dependências não prova exploração, mas reprova o gate de entrega.
- Não editar transitive dependencies manualmente nem executar `npm audit fix --force` na branch de entrega. Primeiro verificar versões oficiais compatíveis do SDK Neon, testar login, recuperação de senha, convite e logout em branch isolada, repetir auditoria.

## 2. Autorizações e isolamento (P0/P1)

**Controles positivos identificados no código:**
- `requireMember` obtém sessão verificada e exige exatamente um vínculo ativo em `team_members`.
- `requireOwner` verifica papel owner; `requireDeveloper` também exige subject técnico.
- Boa parte das rotas sensíveis exige origem correta, limita corpo e usa `getTeamWriteDb` com funções PostgreSQL restritas.
- Consultas comerciais/financeiras verificadas filtram por `organization_id`.

**Pendências encontradas:**
- `src/app/api/agenda/route.ts`, método PATCH: grava diretamente em `public.crm_events` usando `getDb()`, conexão geral. Possui autenticação de proprietário, validação de origem e filtro por organização, mas ainda viola o padrão de **menor privilégio na conexão de escrita**.
- `src/app/api/clientes/contratos/dados-juridicos/route.ts`, método POST: executa INSERT/UPSERT direto em `public.antares_legal_profiles` via `getDb()`, também com proprietário/origem/organização. Migrar para uma função restrita somente após verificar o esquema real.
- O usuário de homologação promovido a owner deve voltar à função mínima necessária ou ter o acesso suspenso antes da entrega ao proprietário real. **Não editar usuários em produção sem autorização e teste de recuperação.**
- Falta teste negativo autenticado com papel collaborator, sem login e com organização fictícia B, sempre num ambiente controlado.
- A API pública de solicitações tem honeypot, validação de origem e chave HMAC para controle de abuso no banco; verificar rate limit efetivo e confiança no IP encaminhado pelo proxy.

## 3. Auditoria somente leitura do Neon (P0 — ainda pendente)

Executar `sql/AUDITORIA_SEGURANCA_NEON_READONLY_20261119.sql` na base correta, usando uma conexão autorizada. O script contém apenas SELECT, retorna **metadados/agregados**, sem nomes, e-mails, sujeitos de autenticação ou IDs de clientes.

Validar:
- `antares_team_runtime`: não é SUPERUSER, não ignora RLS e não tem INSERT/UPDATE/DELETE diretamente nas tabelas de negócio;
- Tabelas e políticas RLS ativas onde necessárias, com privilégios mínimos;
- Funções `SECURITY DEFINER` de dono confiável, `EXECUTE` não concedido a PUBLIC, `search_path` auditado;
- Ausência de identidades com mais de um vínculo ativo, e contagens agregadas de papéis;
- Separação entre a credencial pública de leads, a credencial de leitura e a credencial operacional.

**Atenção:** executar SELECT com usuário administrador NÃO prova que um usuário restrito não consegue ler dados de outra organização. Esse teste exige identidade/credencial de teste e tentativa de acesso negativa em **branch Neon de homologação**, sem alterar produção.

## 4. Testes automáticos

`npm run test:seguranca` verifica invariantes textuais essenciais de sessão, autorização técnica, aceite, recebimento público e financeiro. Esses testes não substituem ensaio de invasão, autorização real nem validação de RLS. O CI também executa build e auditoria de dependências.

## Critério para liberar merge e entrega

- [ ] `npm ci`, `npm run build` e `npm run test:seguranca` passam
- [ ] `npm audit --omit=dev --audit-level=high` passa, ou cada exceção residual tem mitigação documentada, aprovada e testada
- [ ] Neon auditado em somente leitura; nenhuma permissão excessiva sem tratamento
- [ ] Login, recuperação de senha, convites e papéis owner/collaborator/developer testados
- [ ] Acesso anônimo ou entre organizações retorna 403/404 sem dados
- [ ] Duas rotas de gravação direta removidas, ou justificadas/isoladas com conta mínima aprovada e testada
- [ ] Conta de homologação revista antes da entrega; propriedade real validada
- [ ] Nenhum `git merge`, SQL de escrita ou deploy sem homologação explícita

**Status 19/11/2026:** **NÃO LIBERADO PARA ENTREGA.** Nenhuma alteração desta branch deve ser mesclada automaticamente.
