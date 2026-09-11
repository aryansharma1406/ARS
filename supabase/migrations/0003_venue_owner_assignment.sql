-- Create the venue and assign its owner in one transaction, under the admin's session.
CREATE OR REPLACE FUNCTION public.admin_create_venue_with_owner(payload jsonb, owner jsonb DEFAULT NULL)
RETURNS public.venues
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  owner_user public.users;
  result public.venues;
  owner_name text;
  owner_email text;
  owner_phone text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;

  IF owner IS NOT NULL THEN
    PERFORM public.assert_fields(owner, ARRAY['name','email','phone']);
    owner_name := btrim(owner->>'name');
    owner_email := lower(btrim(owner->>'email'));
    owner_phone := btrim(owner->>'phone');
    IF coalesce(length(owner_name),0) NOT BETWEEN 1 AND 120
      OR coalesce(length(owner_email),0) NOT BETWEEN 3 AND 254
      OR owner_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      OR coalesce(length(owner_phone),0) NOT BETWEEN 5 AND 30
      OR owner_phone !~ '^[+0-9() .-]+$' THEN
      RAISE EXCEPTION 'Owner: enter a valid name, email and phone number.';
    END IF;

    BEGIN
      SELECT u.* INTO STRICT owner_user
      FROM public.users u JOIN auth.users a ON a.id = u.id
      WHERE lower(u.email) = owner_email AND lower(a.email) = owner_email
        AND a.email_confirmed_at IS NOT NULL
      FOR UPDATE OF u;
    EXCEPTION
      WHEN no_data_found THEN
        RAISE EXCEPTION 'Owner: no confirmed account matches this email. Ask the owner to register and confirm their email first.';
      WHEN too_many_rows THEN
        RAISE EXCEPTION 'Owner: multiple accounts match this email. Resolve the duplicate accounts before assigning a venue.';
    END;
    IF NOT owner_user.active OR owner_user.role NOT IN ('customer','venue_owner') THEN
      RAISE EXCEPTION 'Owner: choose an active customer or venue-owner account.';
    END IF;
  END IF;

  result := public.save_venue(payload);
  IF owner IS NOT NULL THEN
    IF owner_user.role = 'customer' THEN
      PERFORM public.admin_set_user_access(owner_user.id, 'venue_owner', true);
    END IF;
    UPDATE public.users SET name = owner_name, phone = owner_phone WHERE id = owner_user.id;
    PERFORM public.admin_assign_owner(owner_user.id, result.id, true);
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_venue_with_owner(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_create_venue_with_owner(jsonb,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
