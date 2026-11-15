-- ANTARES Fidelização: adiamento de alertas, sem alterar a data real da visita.
-- Executar no Neon somente após backup e revisão; esta migração não é aplicada automaticamente.
BEGIN;
CREATE TABLE IF NOT EXISTS public.antares_relationship_snoozes (
 organization_id uuid NOT NULL,
 client_id uuid NOT NULL,
 snoozed_until date NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,client_id),
 FOREIGN KEY(client_id) REFERENCES public.crm_clients(id) ON DELETE RESTRICT
);
ALTER TABLE public.antares_relationship_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_relationship_snoozes FORCE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.antares_relationship_snooze_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL,
 client_id uuid NOT NULL,
 actor text NOT NULL,
 previous_until date,
 new_until date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.antares_relationship_snooze_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antares_relationship_snooze_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.antares_relationship_snooze_audit FROM PUBLIC,antares_team_runtime,antares_public_inbox_login;
REVOKE ALL ON public.antares_relationship_snoozes FROM PUBLIC,antares_team_runtime,antares_public_inbox_login;
CREATE OR REPLACE FUNCTION public.antares_snooze_relationship_alert(
 p_actor text,p_client uuid,p_until date
) RETURNS date LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_org uuid;v_old date;v_today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 SELECT organization_id INTO STRICT v_org FROM public.team_members
 WHERE auth_subject=p_actor AND active=true AND role='owner';
 IF p_client IS NULL OR p_until IS NULL OR p_until<=v_today OR p_until>v_today+90
 OR NOT EXISTS(SELECT 1 FROM public.crm_clients WHERE id=p_client AND organization_id=v_org)
 THEN RAISE EXCEPTION 'Adiamento invalido'; END IF;
 SELECT snoozed_until INTO v_old FROM public.antares_relationship_snoozes
 WHERE organization_id=v_org AND client_id=p_client FOR UPDATE;
 INSERT INTO public.antares_relationship_snoozes(organization_id,client_id,snoozed_until)
 VALUES(v_org,p_client,p_until)
 ON CONFLICT(organization_id,client_id)
 DO UPDATE SET snoozed_until=excluded.snoozed_until,updated_at=now();
 INSERT INTO public.antares_relationship_snooze_audit
 (organization_id,client_id,actor,previous_until,new_until)
 VALUES(v_org,p_client,p_actor,v_old,p_until);
 RETURN p_until;
EXCEPTION WHEN no_data_found OR too_many_rows THEN RAISE EXCEPTION 'Proprietario nao autorizado';
END $$;
REVOKE ALL ON FUNCTION public.antares_snooze_relationship_alert(text,uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.antares_snooze_relationship_alert(text,uuid,date) TO antares_team_runtime;
COMMIT;
