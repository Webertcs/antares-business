# BLOCO 27 — FECHAMENTO ÚNICO DO ANTARES BUSINESS

**Objetivo:** completar a homologação operacional e preparar a entrega ao proprietário do planetário, usando a branch GitHub feature/bloco-02d-seguranca e Neon production existentes.

## FRENTE 1 — GRAVAÇÕES REAIS (ACEITE POR ÁREA)

**Pré-condições obrigatórias:** snapshot recuperável no Neon, sessão de proprietário autenticada, credenciais protegidas, dados verdadeiros/autorizados e verificação das flags atuais. Nunca ligar todas as flags juntas.

| Área | Como autorizar/testar | Conferência de aceite |
| --- | --- | --- |
| Minha Empresa | Liberar somente ANTARES_PROVIDER_WRITES_ENABLED; salvar identificação verdadeira | Reabrir o cadastro e conferir quatro campos; desligar a flag após a operação |
| Agenda | Liberar somente ANTARES_AGENDA_WRITES_ENABLED; criar cúpulas reais e vínculo da escola aceita | Conferir cúpula e capacidade, cliente vinculado e apresentação sem conflito; desligar após teste |
| Contratos | Liberar somente ANTARES_CONTRACT_WRITES_ENABLED apenas para um acordo verdadeiro | Conferir proposta, modalidade e status; nunca assinar ou confirmar contrato fictício |
| Educacional | Liberar somente ANTARES_EDUCATION_WRITES_ENABLED para uma turma realmente informada | Conferir instituição, turma, professor e participantes, evitando dados pessoais desnecessários |
| Financeiro | Liberar somente ANTARES_FINANCE_WRITES_ENABLED com capacidade financeira válida e origem configurada | Conferir título/baixa no extrato; não simular pagamentos inexistentes |

**Critério:** HTTP de sucesso + releitura pelo CRM + conferência do negócio. Apenas build, teste SQL reversível ou botão habilitado **não** satisfazem aceite positivo. Se der erro, desligar a flag e investigar antes de tentar de novo. Repetições podem duplicar cadastros.

## FRENTE 2 — CONFIGURAÇÃO DO CLIENTE

- [ ] Nome/razão social do prestador, CPF/CNPJ, endereço e representante aprovados pelo proprietário.
- [ ] Duas cúpulas: nome, código e capacidade por sessão, confirmados.
- [ ] Conta do proprietário e acesso do colaborador, cada um com permissão apropriada.
- [ ] Revisar a Escola 01, hoje cadastro de teste, antes de usar em operação real.
- [ ] Confirmar valores, condições comerciais, sinal, contratos e PDF com o cliente.
- [ ] Conferir se uma proposta aceita aparece na Agenda e se as cúpulas corretas surgem nos relatórios.

## FRENTE 3 — ENTREGA

- [ ] Rotacionar credenciais eventualmente expostas em prints (.env.local, banco e capacidades).
- [ ] Conferir ambiente de publicação, HTTPS, domínio, variáveis protegidas e banco correto.
- [ ] Fazer snapshot + restaurabilidade documentada; garantir que não haja operações duplicadas.
- [ ] Testar login/logout, proprietário versus colaborador e acesso direto às rotas protegidas.
- [ ] Testar PWA Android: instalação, ícone, abertura, navegação, formulários e PDFs.
- [ ] Formalizar aceite do responsável e registrar pendências da próxima versão.

## ROTEIRO DE EXECUÇÃO

1. Rodar build **uma única vez** após atualizar o código e abrir a Central de Fechamento.
2. Confirmar snapshot e dados do cliente; não avançar com campos fictícios.
3. Habilitar somente uma flag por vez, reiniciar um único servidor, registrar uma operação autorizada e conferir via GET.
4. Desabilitar a flag após cada teste controlado; salvar .env.local, reiniciar e conferir o bloqueio.
5. Registrar observações de Android, publicar somente após rotacionar segredos e obter aceite.

## REGRA DE SEGURANÇA

Este bloco não altera a produção, não executa migração, não libera flags e não inventa nenhuma informação empresarial. A branch de homologação é opcional; gravações reais em production são definitivas e não se desfazem pelo ROLLBACK de testes SQL anteriores.
