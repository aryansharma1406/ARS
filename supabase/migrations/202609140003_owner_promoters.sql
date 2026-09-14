BEGIN;
CREATE OR REPLACE FUNCTION public.owner_add_promoter(payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE venue uuid; assigned uuid[]; source public.sources; result uuid; rate numeric;
BEGIN
 PERFORM public.assert_fields(payload,ARRAY['venue_id','existing_id','name','email','phone','code','event_ids','commission_percentage']);
 venue:=(payload->>'venue_id')::uuid;
 IF NOT coalesce(public.is_venue_owner(venue),false) THEN RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
 IF nullif(payload->>'existing_id','') IS NOT NULL THEN
  SELECT * INTO source FROM public.sources WHERE id=(payload->>'existing_id')::uuid;
  IF source.id IS NULL OR NOT coalesce(public.is_venue_owner(source.venue_id),false) THEN RAISE EXCEPTION 'Promoter access denied' USING ERRCODE='42501'; END IF;
 END IF;
 rate:=(payload->>'commission_percentage')::numeric;
 IF rate IS NULL OR rate NOT BETWEEN 0 AND 100 OR coalesce(length(btrim(payload->>'name')),0) NOT BETWEEN 1 AND 150
 OR coalesce(length(payload->>'email'),0)>254 OR coalesce(length(payload->>'phone'),0)>30 THEN
 RAISE EXCEPTION 'Enter valid promoter details and commission from 0 to 100.' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(payload->>'email'),'') IS NOT NULL AND payload->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email.' USING ERRCODE='22023'; END IF;
 IF coalesce(payload->>'code','') !~ '^[A-Z0-9_-]{1,80}$' THEN RAISE EXCEPTION 'Use letters, numbers, underscores or hyphens in the referral code.' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(payload->'event_ids') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose event assignments.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(array_agg(DISTINCT value::uuid),'{}') INTO assigned FROM jsonb_array_elements_text(payload->'event_ids');
 IF EXISTS(SELECT 1 FROM unnest(assigned) AS x(id) WHERE NOT EXISTS(SELECT 1 FROM public.events e WHERE e.id=x.id AND e.venue_id=venue)) THEN RAISE EXCEPTION 'Events must belong to this venue.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.sources(name,email,phone,code,venue_id,commission_percentage,event_ids,active)
 VALUES(btrim(payload->>'name'),nullif(btrim(payload->>'email'),''),nullif(btrim(payload->>'phone'),''),payload->>'code',venue,rate,assigned,true) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.owner_add_promoter(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_add_promoter(jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
