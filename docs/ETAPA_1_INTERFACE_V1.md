# ANTARES BUSINESS V1 — ETAPA 1: ENTREGA DA INTERFACE

## Resultado
A rota autenticada `/oficina` reúne 14 áreas de demonstração visual e funcional:
Visão geral, Clientes, Contatos, Professores, Propostas, Contratos, Agenda,
Cúpulas, Financeiro, Fidelização, Equipe, Relatórios, Vitrine Kids e Configurações.

## Funcionalidades no protótipo
- Navegação, layout responsivo e formulários com edição, busca e remoção.
- Seleção relacional entre clientes, contatos, professores, propostas,
  contratos, apresentações, cúpulas, pagamentos e fidelização.
- Bloqueio visual de exclusão com vínculos e de horários conflitantes.
- Cálculo de proposta por aluno/preço fechado com desconto e sinal.
- Atalhos do fluxo proposta -> contrato -> reserva -> recebimento.
- Prévia impressa de proposta, explicitamente sem validade contratual.
- Relatórios demonstrativos com download CSV e indicadores locais.

## Limites e pendências visíveis
**Não é o CRM homologado nem tem persistência.** Os registros existem
somente na memória da aba e se perdem ao recarregar. A Vitrine Kids
pública existente é acessível por link e ainda precisa ser conectada ao
formulário real de orçamento. Perfis e permissões desta Oficina são
somente representações visuais; controle de acesso à rota é apenas
do proprietário.

Faltam revisão de UX com usuário, acessibilidade completa, fluxos reais
de alteração de status, exportação contratual oficial PDF, notificações,
PWA mobile homologado, e integração do conjunto com Neon.

## Separação de responsabilidades
**Etapa 1 (interface):** oficina integrada pronta para revisão técnica e
homologação visual, sem autorização de operação comercial.
**Etapa 2 (dados):** migrar definições e fluxos para banco, autorizar ações
com privilégios mínimos e realizar testes de isolamento multitenant.
**Etapa 3 (homologação):** teste fim a fim, auditoria e correções, antes do
lançamento.

O workflow npm verifica build/tipagem; a auditoria continua reprovada
por dependências vulneráveis de autenticação. Não retirar o bloqueio.

## Encerramento controlado da Fase 1 — 29/10/2026 (Brasília)
**Estado: implementação da interface encerrada para passagem à Fase 2; homologação do produto pendente.**

Verificação automatizada no commit `33872f5b866c314f7cbf34bb8e2b2b38570c514b`:
- Instalação de dependências: aprovada.
- Compilação de produção e checagem TypeScript: aprovadas.
- Auditoria de dependências: reprovada, bloqueante para comercialização.

O escopo de UI está congelado para a conexão consolidada ao banco. Não confundir
este marco com aceitação do usuário ou validação de uso real: a oficina utiliza
somente dados em memória; a conexão com o Neon, regras autoritativas do servidor,
segurança de autenticação, privacidade, testes de ponta a ponta e revisão da
vitrine pública serão avaliados nas fases seguintes. A branch `main` não foi alterada.
