# ANTARES BUSINESS — BLOCO 15: ENTREGA CONSOLIDADA

## 1. Agenda operacional
- [x] Funcoes para vincular cliente, criar cupula e reservar com protecao de conflitos.
- [x] Tela de preparacao de vinculos e reserva vinculada a proposta aceita.
- [x] Teste Neon 14G por ROLLBACK (nao equivale a teste HTTP positivo).
- [ ] Cadastrar as cupulas reais com capacidade confirmada pelo cliente.
- [ ] Testar operacoes POST com proprietario logado antes de habilitar para o cliente.

## 2. Gravações e seguranca
- [x] Contratos, turmas, prestador e agenda com API de escrita fechada por flag.
- [x] Testes transacionais negativos/reversiveis no Neon.
- [ ] Verificar privilegios no script 15-fechamento-seguro.mjs.
- [ ] Homologar POSTs reais com owner autenticado, backup e dados de homologacao controlados.
- [ ] Rotacionar credenciais de banco e segredos eventualmente expostos.
- [ ] Confirmar separacao entre proprietario e colaborador.

## 3. Finalizacao e entrega
- [x] PWA instalavel no Chrome, PDFs em A4 revisados.
- [ ] Teste Android com cliente; fechar navegacao e legibilidade mobile.
- [ ] Salvar prestador definitivo com dados verdadeiros e aprovados pelo titular.
- [ ] Confirmar hospedagem, HTTPS, dominio e backup de producao.
- [ ] Conferir proposta aprovada -> reserva -> cúpula -> calendario -> documentos.

### Ordem de implantacao
1. Revisar o SQL 14E e 14F, inclusive tabelas operacionais e roles, antes de executar em production.
2. Confirmar snapshot; caso revisados, aplicar 14E e depois 14F; nunca repetir 14G.
3. Executar verificacao somente leitura: node --env-file=.env.local scripts/15-fechamento-seguro.mjs
4. Manter as CINCO flags de gravacao em false enquanto nao houver teste autenticado positivo.
5. Liberar operacoes individualmente, somente apos homologacao e rotacao de segredos.

**Criterio de liberacao**: builds e testes anonimos aprovados nao substituem verificacao de gravacao pelo proprietario real. Sem aceite do cliente e cúpulas reais nao ha agenda operacional concluida.
