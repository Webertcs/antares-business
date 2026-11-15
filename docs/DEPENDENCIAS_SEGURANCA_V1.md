# ANTARES V1 - bloqueios de seguranca em dependencias

Verificacao em 2026-10-29/30 (GitHub Actions). O pipeline npm ci e tipos passou; auditoria npm falhou.

Dependencias observadas no lockfile:
- Neon Auth 0.7.0-beta inclui Better Auth 1.7.6 (correcao de advisory GHSA-44jh-23m7-hpcf em 1.7.7).
- Neon Auth inclui Zod 4.5.4 (correcao de GHSA-mrhx-c7xc-m3w5 em 4.6.6).
- A interface de autenticacao inclui cadeia que usa deepmerge 4.3.1 (GHSA-gcqx-w48m-w2h4, sem versao corrigida disponivel no aviso consultado).

Acoes:
1. Nao executar npm audit fix --force. Nao atualizar dependencias transitivas exatas sem testar compatibilidade do Neon Auth.
2. Verificar futuro lancamento corrigido do pacote Neon Auth e da interface.
3. Em branch isolada, testar alteracoes na arvore de dependencias e cobertura de autenticacao.
4. Manter o npm audit bloqueante e a V1 comercial com gravacoes desativadas ate aprovacao.

Esta nota nao substitui auditoria nem confirma explorabilidade dos avisos na configuracao do projeto.
