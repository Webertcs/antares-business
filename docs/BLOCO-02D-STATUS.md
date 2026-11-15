# Bloco 02D — segurança e gestão de equipe

## Nesta branch
- Autorização centralizada no servidor (`requireMember` e `requireOwner`).
- Vínculo ativo ambíguo (mais de uma organização para a mesma conta) bloqueado em vez de usar `LIMIT 1` silencioso.
- Dashboard mantém redirecionamento ao login para usuário deslogado e recusa acesso sem vínculo válido.
- Endpoint de equipe continua somente leitura. Convites não podem ser criados por POST arbitrário.

## Ainda NÃO implementado / não homologado
- Convites com token único, expiração, hash persistido, aceite vinculado a identidade autenticada e e-mail verificado.
- Ativação e suspensão transacionais com trilha de auditoria, proteção do último proprietário e testes concorrentes.
- Política de autorização tenant-scoped em todas as futuras APIs de negócios.
- Migrações RLS devidamente testadas com papéis PostgreSQL dedicados.
- Correções de npm audit (especialmente dependências transitivas de Neon Auth beta).
- Build, lint e testes locais: ainda não executados nesta branch.

## Validação mínima no Windows
1. `git fetch origin`
2. `git switch feature/bloco-02d-seguranca`
3. `npm.cmd run build`
4. `npm.cmd audit --omit=dev`
5. Testar /, /equipe, logout e /sem-acesso sem alterar dados.

**Não fazer deploy comercial antes de concluir a matriz de permissões, migrações e auditoria de dependências.**
