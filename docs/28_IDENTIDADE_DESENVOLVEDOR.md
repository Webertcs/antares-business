# ANTARES — Proprietário / Desenvolvedor

O campo `team_members.role` continua sendo `owner`: todas as validações de autorização permanecem inalteradas.

No painel, somente o usuário autenticado cujo ID corresponde a `ANTARES_DEVELOPER_SUBJECT` é identificado como **Proprietário / Desenvolvedor**. Os demais owners aparecem como **Proprietário**, e colaboradores como **Colaborador**.

Para configurar no ambiente local, escolha o `auth_subject` **da sua própria conta owner ativa** (Neon: consulta seletiva em `public.team_members`), adicione ao `.env.local`:

```dotenv
ANTARES_DEVELOPER_SUBJECT=ID_DA_SUA_CONTA_AUTH
```

Salve e reinicie o servidor. Não compartilhe prints do .env.local.

**Importante:** este título é uma identificação visual, não uma concessão de permissões. Não há novo papel no banco, migração, alteração da organização, ou promoção de outro usuário.

**PWA:** já revisado e testado pelo desenvolvedor. Manter como concluído; não solicitar nova homologação repetida. Na liberação externa, revisar apenas os itens próprios do ambiente de publicação.
