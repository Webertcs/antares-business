-- ANTARES 55B: modelo reutilizavel do checklist operacional.
-- Executar no Neon SQL Editor apos backup. Usa tabela exclusiva para nao conflitar com modelos legados. Nao altera eventos nem checklists existentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_operational_checklist_defaults (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  CONSTRAINT antares_operational_checklist_defaults_array CHECK (jsonb_typeof(items)='array'),
  CONSTRAINT antares_operational_checklist_defaults_size CHECK (octet_length(items::text)<=24000)
);
ALTER TABLE public.antares_operational_checklist_defaults ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_operational_checklist_defaults FROM PUBLIC;
REVOKE ALL ON public.antares_operational_checklist_defaults FROM antares_team_runtime;
CREATE OR REPLACE FUNCTION public.antares_save_checklist_template(
  p_subject text,p_items jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE v_org uuid; v_item jsonb; v_count integer;
BEGIN
 IF nullif(btrim(coalesce(p_subject,'')),'') IS NULL OR
    p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR
    octet_length(p_items::text)>24000 THEN
   RAISE EXCEPTION 'Modelo invalido';
 END IF;
 v_count:=jsonb_array_length(p_items);
 IF v_count>80 THEN RAISE EXCEPTION 'Limite de 80 itens'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
 LOOP
   IF jsonb_typeof(v_item)<>'string' OR
      length(btrim(v_item #>> '{}')) NOT BETWEEN 2 AND 160 THEN
     RAISE EXCEPTION 'Item invalido';
   END IF;
 END LOOP;
 SELECT organization_id INTO STRICT v_org
 FROM public.team_members
 WHERE auth_subject=p_subject AND active=true AND role='owner';
 INSERT INTO public.antares_operational_checklist_defaults(organization_id,items,updated_at,updated_by)
 VALUES(v_org,p_items,now(),p_subject)
 ON CONFLICT(organization_id) DO UPDATE SET
 items=excluded.items,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 RETURN v_count;
END;$$;
CREATE OR REPLACE FUNCTION public.antares_read_checklist_template(p_subject text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE v_org uuid;v_items jsonb;
BEGIN
 SELECT organization_id INTO STRICT v_org
 FROM public.team_members WHERE auth_subject=p_subject AND active=true
 AND role IN ('owner','collaborator');
 SELECT items INTO v_items FROM public.antares_operational_checklist_defaults
 WHERE organization_id=v_org;
 RETURN coalesce(v_items,'[]'::jsonb);
END;$$;
REVOKE ALL ON FUNCTION public.antares_save_checklist_template(text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.antares_read_checklist_template(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_save_checklist_template(text,jsonb) TO antares_team_runtime;
GRANT EXECUTE ON FUNCTION public.antares_read_checklist_template(text) TO antares_team_runtime;
COMMIT;