# ANTARES CRM — Aprovação interna separada do aceite da escola

**Situação:** alteração preparada em branch isolada. Não publicar nem atualizar o servidor de produção antes da verificação do Neon.

## Decisão comercial

1. O pedido chega em **Oportunidades**.
2. O proprietário escolhe **Preparar proposta**, define valores e salva o rascunho.
3. **Revisar e aprovar** apenas registra a aprovação INTERNA. A proposta permanece sem aceite do cliente e não habilita reservas.
4. O proprietário compartilha a proposta manualmente pelo WhatsApp ou por outro canal.
5. Somente após resposta positiva REAL da instituição, abre **Registrar aceite da escola**, seleciona o canal e registra uma breve referência da confirmação.
6. Depois de confirmado, a proposta passa a `accepted` e pode ser utilizada no fluxo de reserva já existente.

A ação de aceite nunca envia mensagens nem cria contrato, cobrança ou reserva automaticamente.

## Proteções implantadas no código

- Preserva o status `draft` no banco durante a aprovação interna, usando `approved_at` e `approved_by` já existentes.
- Bloqueia alterações de valores e condições depois da aprovação interna nas funções SECURITY DEFINER.
- Registra aceite real com `client_accepted_at`, canal e referência de confirmação (novo conjunto de colunas sem remoção de registros).
- Restringe acesso ao proprietário; gravação somente pela função do banco, com checagens de papel e privilégio.
- Protege reservas e contratos da Vitrine exigindo confirmação explícita; propostas de outros fluxos comerciais preservam suas regras anteriores.
- Propostas históricas da Vitrine com `accepted` sem confirmação explícita ficam identificadas como **Aceite não verificado**. Não são convertidas automaticamente.
- Não altera apresentações e reservas já criadas.

## Implantação controlada no Neon

**Primeiro, fazer backup/snapshot do banco.** Conferir as funções em uso e a existência de outras alterações feitas após os scripts versionados. Aplicar o arquivo:

`migrations/20261114-separar-aprovacao-e-aceite-vitrine.sql`

O script é transacional e não altera os dados existentes, mas substitui funções comerciais; revisar no ambiente de homologação antes da produção.

Conferência somente leitura:

```sql
SELECT p.id, p.title, p.status, p.approved_at, p.client_accepted_at,
 EXISTS (
   SELECT 1 FROM public.vitrine_leads l
   WHERE l.converted_proposal_id=p.id AND l.organization_id=p.organization_id
 ) AS veio_da_vitrine,
 EXISTS (
   SELECT 1 FROM public.antares_proposal_reservations r
   WHERE r.proposal_id=p.id AND r.organization_id=p.organization_id
 ) AS ja_tem_reserva
FROM public.business_proposals p
ORDER BY p.created_at DESC LIMIT 50;
```

```sql
SELECT to_regprocedure('public.business_confirm_client_acceptance(text,uuid,text,text)')
 AS funcao_aceite;
```

## Homologação manual obrigatória

- [ ] Uma nova solicitação aparece como pendente.
- [ ] Salvar rascunho e confirmar a persistência após F5.
- [ ] Aprovar internamente. A tela deve oferecer **Registrar aceite da escola**, sem liberar reserva.
- [ ] A Agenda não deve listar essa solicitação como uma nova reserva disponível.
- [ ] PDF e contato manual permanecem disponíveis.
- [ ] Comprovar o aceite real com um pedido TESTE e inserir canal e referência.
- [ ] Depois do aceite, confirmar status e disponibilidade de reserva, sem criar a reserva.
- [ ] Tentar editar proposta aprovada: deve continuar bloqueado.
- [ ] Conferir que contratos, saldos, eventos, clientes e reservas anteriores permanecem inalterados.
- [ ] Verificar comportamento em celular e respostas HTTP sem sessão de proprietário.
- [ ] Rodar `npm.cmd run build` no Windows e verificar a auditoria de dependências separadamente.

**Observação:** propostas antigas com `accepted` sem `client_accepted_at` exigem conferência humana do aceite. Não preencher o campo automaticamente para simular aprovação do cliente.

## Plano de reversão

Não apagar colunas nem dados de aceite registrados. Se houver falha, retornar a versão anterior da aplicação e bloquear temporariamente novas reservas da Vitrine até avaliar a restauração das funções por snapshot. A reversão do código por si só não é garantia de preservar a distinção dos estados; a implantação deve ser coordenada.
