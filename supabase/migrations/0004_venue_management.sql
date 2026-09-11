-- Venue contact details belong to a venue, never to the shared login profile.
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS owner_email text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.venues ADD CONSTRAINT deleted_venues_inactive CHECK (deleted_at IS NULL OR NOT active);

-- Recover the assignment email only. Earlier per-venue names/phones were not stored.
UPDATE public.venues v SET owner_email = (
  SELECT u.email FROM public.venue_owners o JOIN public.users u ON u.id=o.user_id
  WHERE o.venue_id=v.id AND o.active ORDER BY o.created_at,o.id LIMIT 1
) WHERE v.owner_email IS NULL;

CREATE OR REPLACE FUNCTION public.admin_save_venue_details(payload jsonb, target_id uuid DEFAULT NULL, owner jsonb DEFAULT NULL)
RETURNS public.venues LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  owner_user public.users;
  result public.venues;
  contact_name text;
  contact_email text;
  contact_phone text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF target_id IS NOT NULL THEN
    SELECT * INTO result FROM public.venues WHERE id=target_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venue unavailable' USING ERRCODE='42501'; END IF;
  END IF;
  IF owner IS NOT NULL THEN
    PERFORM public.assert_fields(owner, ARRAY['name','email','phone']);
    contact_name := btrim(owner->>'name');
    contact_email := lower(btrim(owner->>'email'));
    contact_phone := btrim(owner->>'phone');
    IF coalesce(length(contact_name),0) NOT BETWEEN 1 AND 120
      OR coalesce(length(contact_email),0) NOT BETWEEN 3 AND 254
      OR contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      OR coalesce(length(contact_phone),0) NOT BETWEEN 5 AND 30
      OR contact_phone !~ '^[+0-9() .-]+$' THEN
      RAISE EXCEPTION 'Owner: enter a valid name, email and phone number.';
    END IF;
    BEGIN
      SELECT u.* INTO STRICT owner_user FROM public.users u JOIN auth.users a ON a.id=u.id
      WHERE lower(u.email)=contact_email AND lower(a.email)=contact_email AND a.email_confirmed_at IS NOT NULL
      FOR UPDATE OF u;
    EXCEPTION
      WHEN no_data_found THEN RAISE EXCEPTION 'Owner: no confirmed account matches this email. Ask the owner to register and confirm their email first.';
      WHEN too_many_rows THEN RAISE EXCEPTION 'Owner: multiple accounts match this email. Resolve the duplicate accounts first.';
    END;
    IF NOT owner_user.active OR owner_user.role NOT IN ('customer','venue_owner') THEN
      RAISE EXCEPTION 'Owner: choose an active customer or venue-owner account.';
    END IF;
    IF target_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.venue_owners WHERE venue_id=target_id AND user_id=owner_user.id AND active
    ) THEN RAISE EXCEPTION 'Owner: edit contact details for an existing assigned owner only.'; END IF;
  END IF;
  result := public.save_venue(payload, target_id);
  IF owner IS NOT NULL THEN
    IF owner_user.role='customer' THEN
      PERFORM public.admin_set_user_access(owner_user.id,'venue_owner',true);
    END IF;
    IF target_id IS NULL THEN PERFORM public.admin_assign_owner(owner_user.id,result.id,true); END IF;
    UPDATE public.venues SET owner_name=contact_name,owner_email=contact_email,owner_phone=contact_phone
      WHERE id=result.id RETURNING * INTO result;
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_venue_details(jsonb,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_save_venue_details(jsonb,uuid,jsonb) TO authenticated;

-- Replace the previous creation function so older callers also stop changing profiles.
CREATE OR REPLACE FUNCTION public.admin_create_venue_with_owner(payload jsonb, owner jsonb DEFAULT NULL)
RETURNS public.venues LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  RETURN public.admin_save_venue_details(payload,NULL,owner);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_venue(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  UPDATE public.venues SET active=false,deleted_at=now() WHERE id=target_id AND deleted_at IS NULL;
  -- Keep all financial and audit references intact. Inactive venues deny owner/staff access.
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_venue(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_venue(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.business_venues(target_venue uuid DEFAULT NULL) RETURNS SETOF public.venues
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$ BEGIN
  IF NOT public.is_admin() AND public.app_role() IS DISTINCT FROM 'venue_owner' THEN RAISE EXCEPTION 'Business access required' USING ERRCODE='42501'; END IF;
  IF target_venue IS NOT NULL AND NOT public.is_admin() AND NOT coalesce(public.is_venue_owner(target_venue),false) THEN RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT * FROM public.venues v WHERE v.deleted_at IS NULL
    AND (target_venue IS NULL OR v.id=target_venue) AND (public.is_admin() OR public.is_venue_owner(v.id));
END $$;
NOTIFY pgrst, 'reload schema';
