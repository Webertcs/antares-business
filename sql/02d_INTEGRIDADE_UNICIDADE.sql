-- ANTARES 02D: endurecimento de integridade, sem alterar cadastros.
-- Executar APENAS após revisar saída da consulta de duplicatas.
-- Verificação prévia:
-- SELECT auth_subject, count(*) FROM public.team_members
-- WHERE active = true AND auth_subject IS NOT NULL
-- GROUP BY auth_subject HAVING count(*) > 1;
BEGIN;
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.team_members
   WHERE auth_subject IS NOT NULL AND active
   GROUP BY auth_subject HAVING count(*) > 1
 ) THEN
   RAISE EXCEPTION 'Existem identidades com mais de um vinculo ativo. Corrija antes de criar o indice.';
 END IF;
END $$;
-- Uma identidade autenticada só pode ter um vínculo ativo até existir
-- seletor multi-organização autenticado e homologado.
CREATE UNIQUE INDEX IF NOT EXISTS team_members_unique_active_subject
ON public.team_members (auth_subject)
WHERE active = true AND auth_subject IS NOT NULL;

-- Um único convite pendente por organização+endereço. Convites expirados
-- devem ser revogados explicitamente no fluxo de emissão antes de um novo convite.
CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_unique_pending_email
ON public.team_invitations (organization_id, invited_email)
WHERE accepted_at IS NULL AND revoked_at IS NULL;
COMMIT;
