# ANTARES — CHECKLIST 13D (homologacao visual e funcional)
Nao liberar o produto somente por build aprovado. Nao habilitar flags de escrita durante estes testes.

## PWA e mobile
- [ ] npm.cmd run build sem erros.
- [ ] /manifest.webmanifest abre e retorna JSON de manifest (Next.js).
- [ ] /antares-icon.svg abre sem erros.
- [ ] Chrome DevTools > Application > Manifest apresenta ANTARES BUSINESS e icone.
- [ ] Chrome em Android: verificar se aparece 'Instalar aplicativo' / 'Adicionar a tela inicial'. Pode variar por navegador.
- [ ] Abrir /, /clientes, /fidelizacao, /educacional, /intelligence em viewport 390x844; sem scroll horizontal inesperado.
- [ ] Testar menu, inputs, foco, campos e contraste em dispositivo movel.
- [ ] Confirmar que o sistema exige login apos encerrar sessao.
- [ ] Sem promessa de funcionamento offline: nao ha service worker de cache nesta entrega.

## Comercial e PDF
- [ ] Abrir documento de proposta aceita em /comercial/documentos/[id].
- [ ] Inserir dados de prestador para teste local, sem publicar documentos.
- [ ] Chrome > Imprimir > Salvar PDF; conferir A4, margens, quebra de pagina e assinaturas.
- [ ] Inspecionar conteudo: 100 participantes, valores, sinal previsto, validade e forma de pagamento.
- [ ] Mudar para minuta: aviso NAO ASSINADA visivel.
- [ ] Conferir que observacoes internas nao aparecem sem escolha explicita.
- [ ] Se layout exceder uma pagina, registrar ajuste de impressao como pendencia.

## Funcional e liberacao
- [ ] Agenda: testar criacao real pela aplicacao e protecao contra conflitos (ainda pendente).
- [ ] Contratos: testar API com dono autenticado, observando confirmacao verdadeira (ainda pendente).
- [ ] Turmas: testar gravacao com dono autenticado (ainda pendente).
- [ ] Financeiro: homologar fluxos positivos e reversao com controle de autorizacao (ainda pendente).
- [ ] Rotacionar credenciais e segredos eventualmente expostos antes de entrega.
- [ ] Confirmar backup, HTTPS, dominio, permissao e teste com cliente.
