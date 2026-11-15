# ANTARES BUSINESS GRAN MASTER — V1 / ESTADO REAL
Data de consolidação: 2026-10-29

## Implementado e observado
- Next.js + Neon Auth; proprietário autenticado.
- CRM: escolas, empresas, associações e particulares, contatos, apresentações.
- SQL 03 implantado no Neon production; três tabelas, três funções.
- Cadastro de cliente, contato e apresentação observado funcionando no navegador local.
- SQL com role EXECUTE-only e RLS; verificador local CRM03 passou quatro verificações.

## Publicado nesta rodada, mas ainda não implantado
- sql/04_V1_NUCLEO_COMERCIAL.sql: propostas, contratos, cúpulas, reservas, extrato e auditoria.
- /api/business: leitura restrita à organização do proprietário, sem mutação.
- /operacoes: central de operações com propostas, contratos, agenda, financeiro e auditoria.
- Menu do painel com acesso à central.

## BLOQUEIOS (não ocultar)
- A nova migração SQL 04 NÃO foi executada. Até lá /api/business retorna 503.
- Rotas de gravação comercial, anticolisão da agenda, estornos e trilha auditável automática ainda não implementados.
- Painel principal possui indicadores e agenda de demonstração, não consolidados com dados reais.
- Vitrine, PDFs, PWA, WhatsApp, fidelização, inteligência e relatórios analíticos pendentes de integração real.
- ANTARES_CRM_WRITES_ENABLED e ANTARES_CRM_SECURITY_APPROVED foram habilitados pelo operador para uso local; desabilitar antes de exposição pública.
- Bloco 02 (convites/equipe) permanece sem homologação E2E.
- Auditoria npm de dependências de autenticação apontou vulnerabilidades altas/crítica e não foi corrigida.
- Senhas que já apareceram em imagens/chat devem ser substituídas fora do repositório.
- NÃO fazer merge na main nem abrir publicação comercial com os bloqueios acima.

## Implantação futura
1. Revisar segurança e permissões das novas tabelas/funções; registrar um ponto de recuperação no Neon.
2. Implantar uma única migração 04, após revisão.
3. Desenvolver operações de escrita controladas de propostas, contratos, reservas, movimentações e auditoria.
4. Fechar autenticação de colaboradores, CI, testes de isolamento A/B e critérios de aceite.
5. Realizar uma rodada final de build, testes de operações, recuperação e segurança.
