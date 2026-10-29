# Executar na raiz C:\desenvolvimento\antares-crm. Apenas produz relatórios locais.
$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Path '.\auditoria-02d' -Force | Out-Null
npm.cmd audit --omit=dev --json | Out-File '.\auditoria-02d\npm-audit.json' -Encoding utf8
npm.cmd ls @neondatabase/auth better-auth zod --all | Out-File '.\auditoria-02d\arvore-dependencias.txt' -Encoding utf8
npm.cmd run build | Tee-Object -FilePath '.\auditoria-02d\build.txt'
Write-Host 'Relatorios criados em auditoria-02d. NAO execute npm audit fix --force.'
