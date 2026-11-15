# ANTARES BUSINESS — PADRÃO DE REFINAMENTO E ENTREGA

## Objetivo
Aplicar um pente-fino **página por página** ao CRM operacional (Next.js 16 + Neon), sem modificar regras de negócio, tabelas, autenticação ou flags. A Oficina V1 é laboratório interno, não é o CRM do cliente.

## Padrão único para cada página
1. **Navegação:** voltar ao painel sempre visível; links corretos; menu responsivo; não criar becos sem saída.
2. **Identidade:** marca ANTARES, tipografia, azul aprovado, cartões e espaçamento consistentes.
3. **Texto comercial:** remover jargões, pré-integração, migração, V1 e homologação dos componentes destinados ao cliente; manter alertas úteis e verdadeiros.
4. **Estados:** carregando, sem registros, indisponível, erro e sucesso claros; nunca ocultar uma falha real.
5. **Acessibilidade:** teclado, foco visível, contraste e comportamento responsivo.
6. **Segurança:** deixar flags desabilitadas; manter rotas técnicas protegidas por sessão do developer owner; jamais confiar apenas em botões escondidos.
7. **Teste:** uma rodada de navegação e build por lote, além de verificação funcional somente se o fluxo mudou.

## Roteiro de páginas (uma por vez, em lotes coesos)
| Ordem | Página | Escopo |
| --- | --- | --- |
| 01 | Oficina interna | Saída visível para o Dashboard; aviso explícito de demonstração. Não integrar ao produto operacional |
| 02 | Dashboard | Revisar cabeçalho, atalhos, estados vazios, configuração e barras laterais |
| 03 | Comercial / Clientes | Orçamentos, propostas, contatos, contratos e PDFs sem mensagens técnicas |
| 04 | Agenda / Operações | Visão de calendário, reservas, cúpulas e retorno consistente |
| 05 | Financeiro | Títulos, extratos, relatórios, situações de bloqueio com texto comercial |
| 06 | Educacional / Fidelização | Turmas, escolas, relacionamentos e estados vazios |
| 07 | Equipe / Configurações | Usuários, convites, Minha Empresa, separação das ferramentas internas |
| 08 | Vitrine Kids | Experiência da escola/visitante, acessibilidade e contato WhatsApp |

## Hospedagem
**Candidata prioritária: Netlify**, com GitHub e Neon atuais. O ANTARES usa SSR, APIs e sessão autenticada, portanto NÃO usar publicação estática pura. Fazer pré-visualização de deploy com credenciais de ambiente apropriadas, validação de autenticação e API, domínio/HTTPS, PDF e limites de recursos.

**AWS:** avaliar quando houver necessidade concreta de infraestrutura, observabilidade ou carga maior. A documentação consultada de AWS Amplify gerenciado menciona Next.js até v15, enquanto este projeto utiliza Next.js 16; confirmar compatibilidade antes de migrar.

## Pendências externas que não são falhas do pente-fino
- Dados reais da empresa e duas cúpulas fornecidos pelo responsável.
- Homologação positiva das gravações pelas APIs com autorização e backup.
- Rotação de segredos potencialmente expostos em screenshots.
- Deploy em HTTPS e conferência em ambiente publicado.
- PWA já validado localmente; não repetir o mesmo teste sem motivo.
