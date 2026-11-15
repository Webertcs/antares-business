-- ANTARES: preferencias visuais por colaborador, compartilhadas entre navegadores.
-- Execute uma vez no Neon como neondb_owner. Nenhuma escala ou convite e alterado.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_member_profiles (
 organization_id uuid NOT NULL,
 member_id uuid NOT NULL,
 display_name text NOT NULL,
 photo_data text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id,member_id),
 CONSTRAINT antares_member_profiles_name_length CHECK (char_length(display_name) BETWEEN 1 AND 120),
 CONSTRAINT antares_member_profiles_photo_length CHECK (photo_data IS NULL OR char_length(photo_data)<=180000)
);
ALTER TABLE public.antares_member_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_member_profiles FROM PUBLIC;
REVOKE ALL ON public.antares_member_profiles FROM antares_team_runtime;
CREATE OR REPLACE FUNCTION public.antares_save_member_profile(
 p_subject text,p_organization uuid,p_member uuid,p_name text,p_photo text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.team_members m WHERE m.id=p_member AND m.organization_id=p_organization AND m.auth_subject=p_subject AND m.active=true) THEN
  RAISE EXCEPTION 'Membro nao autorizado';
 END IF;
 IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Nome invalido'; END IF;
 IF p_photo IS NOT NULL AND (char_length(p_photo)>180000 OR p_photo !~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$') THEN RAISE EXCEPTION 'Foto invalida'; END IF;
 INSERT INTO public.antares_member_profiles(organization_id,member_id,display_name,photo_data,updated_at)
 VALUES(p_organization,p_member,btrim(p_name),p_photo,now())
 ON CONFLICT(organization_id,member_id) DO UPDATE SET display_name=excluded.display_name,photo_data=excluded.photo_data,updated_at=now();
END;$$;
ALTER FUNCTION public.antares_save_member_profile(text,uuid,uuid,text,text) OWNER TO neondb_owner;
REVOKE ALL ON FUNCTION public.antares_save_member_profile(text,uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_save_member_profile(text,uuid,uuid,text,text) TO antares_team_runtime;
COMMIT;
