-- ANTARES CRM | Limpeza pontual dos numeros ficticios da empresa de teste.
-- Executar manualmente no SQL Editor do Neon, no projeto correto.
-- Preserva nome, endereco e representante. Rejeita operacao se o alvo nao for unico.
BEGIN;

DO $$
DECLARE matches integer;
BEGIN
 SELECT count(*) INTO matches
 FROM public.antares_provider_profiles
 WHERE btrim(legal_name) = 'PLANETÁRIO MÓVEL ANTARES'
   AND btrim(representative) = 'W. COSTA';

 IF matches <> 1 THEN
  RAISE EXCEPTION 'Limpeza cancelada: esperava 1 cadastro de teste e encontrei %.', matches;
 END IF;
END $$;

-- Permitir documento temporariamente vazio durante configuracao inicial.
-- O formulario continua exigindo CPF/CNPJ valido ao salvar novos dados.
ALTER TABLE public.antares_provider_profiles
 DROP CONSTRAINT IF EXISTS antares_provider_profiles_tax_id_check;

ALTER TABLE public.antares_provider_profiles
 ADD CONSTRAINT antares_provider_profiles_tax_id_check
 CHECK (tax_id = '' OR length(btrim(tax_id)) BETWEEN 11 AND 20);

-- Esta coluna foi introduzida pela migracao de telefone.
-- IF NOT EXISTS torna a limpeza segura tambem em ambientes de homologacao sem ela.
ALTER TABLE public.antares_provider_profiles
 ADD COLUMN IF NOT EXISTS contact_phone text;

UPDATE public.antares_provider_profiles
   SET tax_id = '',
       contact_phone = NULL,
       updated_at = now()
 WHERE btrim(legal_name) = 'PLANETÁRIO MÓVEL ANTARES'
   AND btrim(representative) = 'W. COSTA';

COMMIT;

-- Opcional: conferir SEM exibir os documentos:
-- SELECT legal_name, representative, tax_id = '' AS documento_vazio,
--        contact_phone IS NULL AS telefone_vazio
-- FROM public.antares_provider_profiles
-- WHERE btrim(legal_name) = 'PLANETÁRIO MÓVEL ANTARES';
