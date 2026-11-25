# ANTARES — revisão final da entrega (20/11/2026)

**Estado:** branch de homologação. Não fazer merge ou deploy automático antes dos testes. Nenhuma alteração de banco ou credenciais neste pacote.

## Mudanças deste pacote

- Restaurada a imagem PNG com transparência na barra lateral, acima do tipo de acesso. Os ícones quadrados do PWA permanecem na configuração da aplicação.
- A página Meu perfil continua permitindo alteração de senha, mas com formulário recolhido por padrão.
- A Central Operacional possui um atalho direto para Eventos.
- As contagens de alunos indicam explicitamente o **total por evento**; não são capacidade por sessão.
- A página Primeiro acesso explica que novos colaboradores exigem convite e orienta pessoas já cadastradas para recuperação de senha.
- Adicionada conferência **somente leitura** do vínculo de proprietário entre Neon Auth e equipe.
- Testes estáticos de regressão visual adicionados em `tests/entrega-visual.test.mjs`.

## Primeiro acesso do proprietário

A conta do proprietário **já foi visualizada no Neon Auth**. Portanto **NÃO** executar `scripts/61-criar-proprietario.mjs` nem fazer novo cadastro sem investigar.

1. Conferir o vínculo, sem escrita: `node --env-file=.env.local scripts/62-verificar-acesso-proprietario.mjs`.
2. Somente com resultado **APTO**, o proprietário pode acessar o novo domínio e usar **Esqueceu a senha?** para definir uma senha própria por link enviado ao e-mail cadastrado.
3. Conferir que ele enxerga **Proprietário**, que o administrador técnico mantém seu acesso e que funções exclusivas da equipe estão protegidas.

Não trocar nem compartilhar a senha do administrador técnico. Não executar SQL para promover um usuário apenas porque o e-mail corresponde.

## Homologação antes de publicar

- Preservar alterações locais não commitadas do desenvolvedor (package.json, lockfile, imagens e scripts). Esta branch está no GitHub e **não contém** esses arquivos locais.
- Em um checkout isolado, executar `npm ci`, `node --test tests/entrega-visual.test.mjs` e `npm run build`.
- Conferir no desktop e no celular: logo lateral sem fundo quadrado, login, perfil, recuperação de senha, agenda, clientes, propostas, eventos, cancelamento e conclusão.
- Testar dados reais **somente em ambiente autorizado** e nunca criar uma reserva de teste em produção para validar interface.

## Bloqueios que este pacote não resolve

1. **Regra antiga de capacidade da cúpula na reserva:** a correção SQL `scripts/58b-reserva-unica-sem-bloqueio-capacidade.sql` está preparada, mas ainda exige snapshot, comparação das funções reais no Neon e homologação. A UI não deve prometer reserva livre de bloqueio enquanto a função do banco não for atualizada com segurança.
2. **Aceite real da escola:** PR #2 ainda exige validação de migração e aplicação coerente com as reservas/contratos antes do merge.
3. **Segurança:** PR #4 registra vulnerabilidades de dependências e necessidade de auditoria de RLS e permissões. Não liberar implantação definitiva enquanto houver bloqueadores de severidade alta/crítica sem tratamento.
4. **Marca no navegador:** se o navegador conservar o favicon antigo, verificar cache/PWA separadamente da logo lateral.

Esses pontos são independentes da correção visual e **não foram silenciosamente modificados**.
