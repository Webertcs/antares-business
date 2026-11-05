-- ANTARES BLOCO 11: turmas e professores, sem dados pessoais de criancas.
-- Aplicar uma vez na production depois de confirmar snapshot.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_education_groups(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 client_id uuid NOT NULL,
 label text NOT NULL CHECK(length(btrim(label)) BETWEEN 2 AND 120),
 grade_level text NOT NULL DEFAULT '',
 student_count integer NOT NULL DEFAULT 0 CHECK(student_count BETWEEN 0 AND 1000),
 teacher_name text NOT NULL DEFAULT '' CHECK(length(teacher_name)<=120),
 teacher_contact text NOT NULL DEFAULT '' CHECK(length(teacher_contact)<=160),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id),
 FOREIGN KEY(client_id,organization_id) REFERENCES public.crm_clients(id,organization_id)
);
CREATE INDEX IF NOT EXISTS antares_education_groups_school_idx ON public.antares_education_groups(organization_id,client_id);
ALTER TABLE public.antares_education_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_education_groups FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_education_groups FROM PUBLIC,antares_team_runtime;
CREATE OR REPLACE FUNCTION public.antares_education_create_group(
 p_subject text,p_org uuid,p_client uuid,p_label text,p_grade text,p_count integer,
 p_teacher text,p_contact text,p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.team_members WHERE auth_subject=p_subject AND organization_id=p_org AND active AND role='owner')
 THEN RAISE EXCEPTION 'Nao autorizado';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=p_org AND kind='school')
 THEN RAISE EXCEPTION 'Escola invalida';END IF;
 INSERT INTO public.antares_education_groups(organization_id,client_id,label,grade_level,student_count,teacher_name,teacher_contact,notes)
 VALUES(p_org,p_client,p_label,btrim(coalesce(p_grade,'')),p_count,btrim(coalesce(p_teacher,'')),
 btrim(coalesce(p_contact,'')),btrim(coalesce(p_notes,''))) RETURNING id INTO v_id;
 INSERT INTO public.business_audit(organization_id,actor_subject,action,entity_type,entity_id)
 VALUES(p_org,p_subject,'education_group_created','education_group',v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.antares_education_create_group(text,uuid,uuid,text,text,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_education_create_group(text,uuid,uuid,text,text,integer,text,text,text) TO antares_team_runtime;
COMMIT;
SELECT to_regclass('public.antares_education_groups') IS NOT NULL AS turmas_instaladas,
 to_regprocedure('public.antares_education_create_group(text,uuid,uuid,text,text,integer,text,text,text)') IS NOT NULL AS cadastro_protegido;
