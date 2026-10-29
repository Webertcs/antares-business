# Auditoria de dependências — Bloco 02D (29/10/2026)

## Resultado informado pelo teste local
Comando: `npm.cmd audit --omit=dev`
Resultado: **10 vulnerabilidades (6 low, 3 high, 1 critical)**.

Cadeia de dependências observada:
- `@neondatabase/auth@^0.7.0-beta` inclui `better-auth`, `@better-auth/drizzle-adapter`, `@neondatabase/auth-ui`, `zod` e dependências de e-mail.
- `deepmerge` é instalado por `html-to-text` / `@react-email/render`.
- `npm audit fix --force` sugere `undefined@undefined`, quebrando o grafo; não executar.

## Avisos verificados
- GHSA-44jh-23m7-hpcf: limite de tentativas concorrentes em PostgreSQL; versão corrigida de `@better-auth/drizzle-adapter`: 1.7.7. Impacto concreto depende do armazenamento/configuração de rate limiting.
  https://github.com/advisories/GHSA-44jh-23m7-hpcf
- GHSA-mrhx-c7xc-m3w5: `zod` afetado antes de 4.6.6; correção declarada a partir de 4.6.6.
  https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- GHSA-gcqx-w48m-w2h4: `deepmerge` até 4.3.1; nenhuma versão corrigida indicada no GitHub Advisory no momento da análise.
  https://github.com/advisories/GHSA-gcqx-w48m-w2h4

## Decisão de segurança
- **Não realizar deploy comercial** ou disponibilizar cadastro de clientes antes do saneamento e testes.
- Não alterar versão de `@neondatabase/auth` nem inserir overrides transitivos sem avaliar compatibilidade do serviço gerenciado.
- Não executar `npm audit fix --force`.
- Nenhuma vulnerabilidade foi considerada corrigida por esta auditoria.
- O relatório resumido não explica sozinho qual é a vulnerabilidade marcada crítica. Exportar `npm.cmd audit --json` de forma local e revisar o relatório antes de priorizar a correção; evitar compartilhar dados secretos ou URLs privados.

## Próximos passos
1. Conferir vulnerabilidade **crítica**, versões efetivamente instaladas e uso das dependências na autenticação real.
2. Verificar atualização oficial do SDK Neon Auth que remova dependências inseguras.
3. Caso não exista correção compatível, documentar arquitetura alternativa de autenticação e migração controlada sem interromper acesso.
4. Testar login, senha, recuperação, validação de e-mail, conta desativada, isolamento de tenant e build.
