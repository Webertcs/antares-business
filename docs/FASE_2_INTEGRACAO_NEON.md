# ANTARES V1 — Fase 2: implantação consolidada (não executada)

## Estado real
- A base CRM do ciclo 03 já havia sido implantada no Neon.
- A migração comercial consolidada `sql/04_IMPLANTACAO_CONSOLIDADA_V1.sql`
  está preparada, mas **não foi aplicada**.
- A Oficina `/oficina` dispõe agora de leitura autenticada via
  `GET /api/oficina/snapshot`, com oito coleções separadas por organização.
- O rascunho temporário da Oficina **não** é salvo no Neon. Não confundir
  dados locais com dados reais.
- Os endpoints `/api/business`, `/api/business/balanco`,
  `/api/business/exportar` e `/api/business/gravar` já existem.
  A gravação comercial permanece bloqueada por duas flags e verificações
  do papel de escrita restrito, sem autorizar publicação comercial.

## Implantação controlada — ordem única
1. Backup verificável de `neondb`, identificação da branch e credenciais
   operacionais, sem colá-las em chats, commits ou tickets.
2. Revisão da SQL 04 contra o esquema 03 existente e validação do
   isolamento multitenant e das funções SECURITY DEFINER.
3. Aplicar **somente** a migração consolidada SQL 04, em transação,
   sem rodar seus arquivos parciais repetidos.
4. Rodar `scripts/verificar-v1-comercial.mjs` em modo somente leitura.
5. Confirmar o GET da Oficina, o GET de operações, balanço e CSV
   no ambiente autenticado.
6. Testar em ambiente controlado as criações de proposta, contrato,
   cúpula, reserva e extrato; verificar negação entre organizações e
   bloqueios de concorrência. Somente depois considerar autorização
   das flags e homologação.

## Diferenças ainda não persistidas
Professores, fidelização, configurações e equipe visual da Oficina não
são tabelas do esquema comercial 04. Não criar estruturas improvisadas
em produção sem definir minimização de dados, políticas e auditoria.
A equipe real já tem módulo separado de autenticação/permissões.
A vitrine pública e o orçamento precisam de fluxo autorizado e
antispam antes de gravação de visitantes não autenticados.

## Critérios de saída da Fase 2
- Um único conjunto revisado de migrações idempotentes e rollback claro.
- Leitura e gravação persistida de todo fluxo essencial, com IDs
  relacionais reais, não só formulários demonstrativos.
- Autenticação, CSRF/origem, permissão do proprietário, segregação por
  organização, validação de dados e auditoria verificadas.
- Build e testes funcionais aprovados; pendências de dependências
  vulneráveis rastreadas como bloqueio de lançamento.

## Gate para Fase 3 — verificação automatizada adicionada
Executar `node scripts/verificar-fase2-integracao.mjs` apenas em ambiente
seguro, com conexões existentes. O script é somente leitura e checa:
CRM 03, comercial 04, controle de sobreposição, funções de gravação,
papel operacional sem privilégios elevados e ausência de DML direto.

**Bloqueio adicional identificado na revisão:** as funções SECURITY DEFINER
recebem `p_subject` como argumento. Antes de disponibilizar a credencial
de runtime a qualquer cliente ou terceiro, validar se o banco vincula
criptograficamente a identidade à sessão; passar uma string de sujeito
não é prova de identidade. A credencial deve permanecer exclusivamente
no servidor. Revisar também os privilégios EXECUTE do papel restrito,
e os limites de acesso do servidor, antes da homologação.

O preflight estrutural não substitui teste de autorização de duas
organizações, reserva simultânea, CSRF, transações, nem auditoria de
dependências. Fase 3 somente após implantação 04 e provas de fluxo real.
