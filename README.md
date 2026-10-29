# ANTARES BUSINESS · Bloco 01 (protótipo navegável)

Base visual independente do Guia do Hóspede. **Não usa banco de dados, não autentica usuários e não está pronta para produção.**

## Pré-requisitos
Node.js 20.9+ e npm.

## Rodar
```bash
npm install
npm run dev
```
Abrir http://localhost:3000 e visitar http://localhost:3000/vitrine.

## Entregue
- Layout responsivo do CRM, menu lateral, dashboard e áreas funcionais demonstrativas.
- Checklist interativo local (não persistido).
- Vitrine kids com ilustrações em emoji, movimento reduzido para quem solicita e âncoras de navegação.
- Dados e valores explicitamente fictícios, sem acesso a sistemas reais.

## Pendente do Bloco 01
- Criar um **projeto Supabase separado** ou uma migração segura após backup/exportação confirmados; NÃO reutilizar as tabelas atuais do Guia do Hóspede.
- Instalar e configurar Supabase SSR Auth com cookies, gerenciamento de sessões e proteção das rotas.
- Criar tabelas `organizations`, `profiles`, `organization_members` e políticas RLS por empresa; testes de isolamento e papéis proprietário/ajudante.
- Instalar shadcn/ui após rodar o setup oficial e padronizar os componentes.
- Testar build, responsividade e acessibilidade em máquina com dependências instaladas.
- Criar repositório GitHub próprio e configurar deployment de homologação.

## Atenção
Os botões de WhatsApp e pedido de orçamento da vitrine estão expressamente desativados até receber os contatos do planetário e implementar captação segura. Não publicar como sistema operacional.


### Refinamento 01B — 28/10/2026
- Agenda mensal, semanal e lista navegáveis no protótipo. São eventos fictícios, sem gravação no banco.
- Cargo operacional renomeado para **Colaborador**.
- Astro e Lunna: inserir arquivos originais dos mascotes em `public/` após disponibilização; não substituir por desenhos genéricos.
- Marca original do planetário: validar autorização do proprietário antes de aplicar a arte em logomarca e PDFs.
- Minijogo pré-orçamento: **ideia em avaliação**, fora do MVP aprovado. Não bloquear pedido de orçamento por jogo.
