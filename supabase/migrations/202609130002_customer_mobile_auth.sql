BEGIN;
-- Preserve every existing UUID and record. A phone-only customer has no invented email.
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ADD CONSTRAINT non_customer_email_required CHECK (role = 'customer' OR email IS NOT NULL) NOT VALID;
CREATE OR REPLACE FUNCTION public.provision_auth_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.users(id,name,email,phone,role,active)
 VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'name',''),nullif(NEW.email,''),
 CASE WHEN NEW.phone_confirmed_at IS NOT NULL THEN '+'||ltrim(NEW.phone,'+') ELSE NULL END,'customer',true);
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.sync_customer_auth_contact() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE public.users SET
 email = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN nullif(NEW.email,'') ELSE email END,
 phone = CASE WHEN NEW.phone_confirmed_at IS NOT NULL AND nullif(NEW.phone,'') IS NOT NULL THEN '+'||ltrim(NEW.phone,'+') ELSE phone END
 WHERE id=NEW.id AND role='customer';
 RETURN NEW;
END $$;
CREATE TRIGGER sync_customer_auth_contact AFTER UPDATE OF phone,phone_confirmed_at,email,email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_customer_auth_contact();
-- Existing booking RPCs copy the optional account email. Keep their NOT NULL
-- snapshots and financial logic intact; an absent email is an empty contact, not an identity.
CREATE OR REPLACE FUNCTION public.optional_customer_email_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.customer_email := coalesce(NEW.customer_email,''); RETURN NEW; END $$;
CREATE TRIGGER optional_order_email BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.optional_customer_email_snapshot();
CREATE TRIGGER optional_ticket_email BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.optional_customer_email_snapshot();
-- Consent preferences also use an empty optional email; no email consent without one.
CREATE OR REPLACE FUNCTION public.optional_marketing_email() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 NEW.email := coalesce(NEW.email,'');
 IF NEW.email='' THEN NEW.email_marketing:=false; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER optional_marketing_email BEFORE INSERT OR UPDATE ON public.customer_marketing_preferences FOR EACH ROW EXECUTE FUNCTION public.optional_marketing_email();
CREATE OR REPLACE FUNCTION public.customer_whatsapp_login_consent() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE mobile text; account_email text; snapshot jsonb;
BEGIN
 IF public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Customer access required' USING ERRCODE='42501'; END IF;
 SELECT '+'||ltrim(phone,'+'),coalesce(email,'') INTO mobile,account_email FROM auth.users WHERE id=auth.uid() AND phone_confirmed_at IS NOT NULL;
 IF mobile IS NULL OR mobile !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'Verified mobile required' USING ERRCODE='22023'; END IF;
 INSERT INTO public.customer_marketing_preferences(customer_id,phone,email,whatsapp,notice_version)
 VALUES(auth.uid(),mobile,account_email,true,'ars-marketing-v1')
 ON CONFLICT(customer_id) DO UPDATE SET phone=excluded.phone,whatsapp=true,
 sms=CASE WHEN customer_marketing_preferences.phone=excluded.phone THEN customer_marketing_preferences.sms ELSE false END,
 notice_version=excluded.notice_version,updated_at=now();
 SELECT to_jsonb(p) INTO snapshot FROM public.customer_marketing_preferences p WHERE customer_id=auth.uid();
 INSERT INTO public.customer_marketing_consent_log(customer_id,preferences,notice_version) VALUES(auth.uid(),snapshot,'ars-marketing-v1');
END $$;
REVOKE ALL ON FUNCTION public.sync_customer_auth_contact(),public.optional_customer_email_snapshot(),public.optional_marketing_email(),public.customer_whatsapp_login_consent() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_whatsapp_login_consent() TO authenticated;
COMMIT;
