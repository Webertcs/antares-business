# Plano de homologação 02D e porta de entrada do 02E

## Entregas presentes na branch
- Autorização de sessão com vínculo ativo único, proprietário ou colaborador.
- Listagem de equipe limitada à organização do proprietário.
- Convite com token aleatório + SHA-256 no banco e expiração de 48 horas.
- Aceite exige sessão de e-mail verificado e mesmo e-mail do convite; operação de banco é atômica.
- Suspensão do colaborador sem exclusão de histórico; servidor bloqueia papel owner.
- Regras de revogação de convite preparadas no SQL (interface/API de revogação ainda não entregues).

## Importante: nenhuma migração foi aplicada ao Neon
Executar **em ordem** somente após revisão em banco de testes:
1. sql/02d_team_invitations_proposta.sql
2. sql/02d_accept_invitation_proposta.sql
3. sql/02d_revoke_and_suspend_proposta.sql

Atenção: migrar a função de aceitação exige revisão de execução sob o papel de banco correto. Evitar testar com credenciais reais de clientes.

## Testes obrigatórios antes do merge
- npm.cmd run build e npm.cmd audit --omit=dev
- Login, logout, conta sem vínculo e contas com mais de um vínculo.
- Proprietário A não lê/suspende membros de B.
- Colaborador não emite convite, não suspende outros membros, não acessa a área owner.
- Tokens inválidos, expirados, revogados e reutilizados falham.
- Aceite com email diferente ou não verificado falha.
- Cliques simultâneos no mesmo convite não criam dois membros.
- A suspensão de owner é proibida em todas as camadas; colaboradores suspensos perdem acesso imediatamente.
- Verificar se função PostgreSQL só é executável pela role do backend e não por roles públicas.
- Garantir audit_events persistente, imutável e escopado por tenant para suspensão, convite e aceite antes do lançamento.
- Validar política anti-CSRF e origem de POST, limitação de taxa, idempotência e resposta ao destinatário correto.
- Corrigir vulnerabilidades de dependências, sobretudo a severidade crítica, antes do deploy.

## Próximo Bloco 02E: primeiro proprietário e organização
- Cadastro inicial não deve permitir criar uma organização sem checagem controlada de identidade.
- Definir fluxo: aprovação administrativa, convite de administrador do SaaS ou onboarding com verificação e cobrança.
- Criação de organization e team_member owner na mesma transação.
- Bloquear duplicações de proprietário ou associação a organização alheia.
- Definir propriedade única e suporte a múltiplas organizações somente com seletor explícito de tenant.
- Interface: dados comerciais, cidade/UF, logotipo, responsável e status de contratação.
- Registrar onboarding e mudanças de proprietário na auditoria.
- Não implementar inscrição pública irrestrita no mesmo endpoint de convites de colaboradores.

**Critério para iniciar a implementação do 02E:** homologação do 02D, banco com privilégios revisados e correção das vulnerabilidades críticas.
