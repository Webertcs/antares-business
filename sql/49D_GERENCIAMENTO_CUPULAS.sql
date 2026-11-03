-- ANTARES 49D | Administracao segura de cupulas.
-- NAO EXECUTAR sem snapshot de production e revisao previa.
-- Pre-requisitos: 14E e 14F aplicadas. Nenhum registro e modificado por esta migracao.
-- Nao habilita ANTARES_AGENDA_WRITES_ENABLED.
BEGIN;

CREATE OR REPLACE FUNCTION public.antares_manage_linked_dome(
  p_subject text,
  p_org uuid,
  p_dome uuid,
  p_action text,
  p_name text DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_capacity integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE
 v_dome public.antares_domes%ROWTYPE;
 v_equipment uuid;
 v_name text;
 v_code text;
 v_capacity integer;
 v_active boolean;
BEGIN
 IF p_subject IS NULL OR p_org IS NULL OR p_dome IS NULL OR p_action NOT IN ('update','deactivate','activate','delete')
 THEN RAISE EXCEPTION 'Dados invalidos'; END IF;

 IF NOT EXISTS (
  SELECT 1 FROM public.team_members
  WHERE organization_id=p_org AND auth_subject=p_subject
    AND active=true AND role='owner'
 ) THEN RAISE EXCEPTION 'Nao autorizado'; END IF;

 SELECT * INTO v_dome FROM public.antares_domes
  WHERE organization_id=p_org AND id=p_dome FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cupula inexistente'; END IF;

 SELECT equipment_id INTO v_equipment FROM public.antares_dome_links
  WHERE organization_id=p_org AND antares_dome_id=p_dome FOR UPDATE;
 IF v_equipment IS NULL THEN RAISE EXCEPTION 'Vinculo operacional ausente'; END IF;

 -- Trava equipamento e apresentacoes concorrentes durante a operacao.
 PERFORM 1 FROM public.equipment
  WHERE organization_id=p_org AND id=v_equipment AND category='dome' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Equipamento operacional nao localizado'; END IF;

 IF p_action='update' THEN
   v_name=btrim(coalesce(p_name,''));
   v_code=btrim(coalesce(p_code,''));
   v_capacity=p_capacity;
   IF length(v_name) NOT BETWEEN 2 AND 100 OR
      length(v_code) NOT BETWEEN 1 AND 30 OR
      v_capacity IS NULL OR v_capacity NOT BETWEEN 1 AND 500
   THEN RAISE EXCEPTION 'Dados invalidos'; END IF;
   IF EXISTS (
    SELECT 1 FROM public.presentations
    WHERE organization_id=p_org AND dome_id=v_equipment
      AND status NOT IN ('cancelled','canceled')
      AND expected_students IS NOT NULL AND expected_students>v_capacity
   ) THEN RAISE EXCEPTION 'Capacidade menor que uma apresentacao vinculada'; END IF;
   UPDATE public.antares_domes SET name=v_name,code=v_code,capacity=v_capacity
    WHERE organization_id=p_org AND id=p_dome;
   UPDATE public.equipment SET name=v_name,asset_code=v_code
    WHERE organization_id=p_org AND id=v_equipment;
   RETURN 'updated';
 ELSIF p_action='deactivate' THEN
   IF EXISTS(
    SELECT 1 FROM public.presentations WHERE organization_id=p_org
     AND dome_id=v_equipment AND starts_at>now()
     AND status NOT IN ('cancelled','canceled')
   ) THEN RAISE EXCEPTION 'Existem apresentacoes futuras vinculadas'; END IF;
   UPDATE public.antares_domes SET active=false WHERE organization_id=p_org AND id=p_dome;
   UPDATE public.equipment SET active=false WHERE organization_id=p_org AND id=v_equipment;
   RETURN 'deactivated';
 ELSIF p_action='activate' THEN
   UPDATE public.antares_domes SET active=true WHERE organization_id=p_org AND id=p_dome;
   UPDATE public.equipment SET active=true WHERE organization_id=p_org AND id=v_equipment;
   RETURN 'activated';
 ELSIF p_action='delete' THEN
   -- Nunca apagar cupulas ja utilizadas em apresentacoes, inclusive canceladas ou passadas.
   IF EXISTS(SELECT 1 FROM public.presentations
      WHERE organization_id=p_org AND dome_id=v_equipment)
   THEN RAISE EXCEPTION 'Cupula possui historico de apresentacoes: desative em vez de excluir'; END IF;
   -- FKs extras ou dependencias novas impedirao exclusao atomica com rollback automatico.
   DELETE FROM public.antares_dome_links
    WHERE organization_id=p_org AND antares_dome_id=p_dome AND equipment_id=v_equipment;
   DELETE FROM public.equipment WHERE organization_id=p_org AND id=v_equipment;
   DELETE FROM public.antares_domes WHERE organization_id=p_org AND id=p_dome;
   RETURN 'deleted';
 END IF;
 RAISE EXCEPTION 'Operacao desconhecida';
END $$;

REVOKE ALL ON FUNCTION public.antares_manage_linked_dome(text,uuid,uuid,text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_manage_linked_dome(text,uuid,uuid,text,text,text,integer) TO antares_team_runtime;

COMMIT;
