-- ANTARES CRM | Etapa 3: identificação das partes nas minutas
-- Executar no Neon SQL Editor após revisão e backup.
-- Migração aditiva: não altera registros existentes.
BEGIN;
ALTER TABLE public.antares_contract_drafts
  ADD COLUMN IF NOT EXISTS contractor_document text,
  ADD COLUMN IF NOT EXISTS contractor_address text,
  ADD COLUMN IF NOT EXISTS contractor_legal_name text,
  ADD COLUMN IF NOT EXISTS provider_legal_name text,
  ADD COLUMN IF NOT EXISTS provider_document text,
  ADD COLUMN IF NOT EXISTS provider_address text,
  ADD COLUMN IF NOT EXISTS provider_representative text;
COMMENT ON COLUMN public.antares_contract_drafts.contractor_document IS 'CPF ou CNPJ da contratante; não preencher automaticamente sem confirmação';
COMMENT ON COLUMN public.antares_contract_drafts.contractor_address IS 'Endereço completo da contratante';
COMMENT ON COLUMN public.antares_contract_drafts.contractor_legal_name IS 'Razão social ou nome civil da contratante';
COMMENT ON COLUMN public.antares_contract_drafts.provider_legal_name IS 'Razão social ou nome civil da contratada';
COMMENT ON COLUMN public.antares_contract_drafts.provider_document IS 'CPF ou CNPJ da contratada';
COMMENT ON COLUMN public.antares_contract_drafts.provider_address IS 'Endereço completo da contratada';
COMMENT ON COLUMN public.antares_contract_drafts.provider_representative IS 'Representante legal da contratada';
COMMIT;
-- IMPORTANTE: o salvamento atual utiliza a função
-- public.antares_save_contract_draft(...). Os novos campos só serão
-- persistidos depois de uma atualização auditada dessa função e da API.
-- Não habilitar campos editáveis no frontend antes dessa etapa.
