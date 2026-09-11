-- Additive, optional first-party funnel observations. No payment, ticket or RLS policies are replaced.
CREATE TABLE IF NOT EXISTS public.venue_funnel_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id),
  event_id uuid NOT NULL REFERENCES public.events(id),
  customer_id uuid NOT NULL REFERENCES public.users(id),
  kind text NOT NULL CHECK (kind IN ('event_view','checkout_start')),
  source text NOT NULL DEFAULT 'direct',
  observed_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id,event_id,kind,observed_day)
);
ALTER TABLE public.venue_funnel_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.venue_funnel_observations FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS venue_funnel_reporting ON public.venue_funnel_observations(venue_id,created_at);

CREATE OR REPLACE FUNCTION public.record_venue_funnel(target_event uuid, observation_kind text, referral_source text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_venue uuid;
BEGIN
  IF public.app_role() IS DISTINCT FROM 'customer' THEN RAISE EXCEPTION 'Customer required' USING ERRCODE='42501'; END IF;
  IF observation_kind NOT IN ('event_view','checkout_start') THEN RAISE EXCEPTION 'Invalid observation' USING ERRCODE='22023'; END IF;
  SELECT e.venue_id INTO target_venue FROM public.events e JOIN public.venues v ON v.id=e.venue_id
    WHERE e.id=target_event AND e.published AND v.active;
  IF target_venue IS NULL THEN RAISE EXCEPTION 'Event unavailable' USING ERRCODE='42501'; END IF;
  -- Bounded writes per account; repeat mounts cannot inflate daily observations.
  IF (SELECT count(*) FROM public.venue_funnel_observations WHERE customer_id=auth.uid() AND observed_day=(now() AT TIME ZONE 'Asia/Kolkata')::date) >= 200 THEN RETURN; END IF;
  INSERT INTO public.venue_funnel_observations(venue_id,event_id,customer_id,kind,source)
    VALUES(target_venue,target_event,auth.uid(),observation_kind,
      CASE WHEN EXISTS(SELECT 1 FROM public.sources WHERE venue_id=target_venue AND code=referral_source) THEN left(referral_source,80) ELSE 'direct' END)
    ON CONFLICT(customer_id,event_id,kind,observed_day) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_venue_funnel(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_venue_funnel(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_funnel_report(target_venue uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE report jsonb;
BEGIN
  IF NOT coalesce(public.is_venue_owner(target_venue),false) THEN RAISE EXCEPTION 'Venue access denied' USING ERRCODE='42501'; END IF;
  WITH sessions AS (
    SELECT customer_id,event_id,(array_agg(source ORDER BY created_at))[1] source,
      min(created_at) FILTER(WHERE kind='event_view') viewed,
      min(created_at) FILTER(WHERE kind='checkout_start') started
    FROM public.venue_funnel_observations WHERE venue_id=target_venue AND created_at>=now()-interval '30 days'
    GROUP BY customer_id,event_id
  ), funnel AS (
    SELECT s.*, EXISTS(SELECT 1 FROM public.orders o WHERE o.customer_id=s.customer_id AND o.event_id=s.event_id
      AND o.payment_status='PAID' AND o.created_at>=s.started AND o.created_at<=now()
      AND coalesce(o.razorpay_payment_id,'') NOT LIKE 'test_payment_%') purchased
    FROM sessions s
  ), sources AS (
    SELECT source,count(*) FILTER(WHERE viewed IS NOT NULL) views,count(*) FILTER(WHERE started IS NOT NULL) checkouts,
      count(*) FILTER(WHERE purchased) purchases FROM funnel GROUP BY source
  )
  SELECT jsonb_build_object(
    'views',count(*) FILTER(WHERE viewed IS NOT NULL),
    'checkouts',count(*) FILTER(WHERE started IS NOT NULL),
    'purchases',count(*) FILTER(WHERE purchased),
    'sources',coalesce((SELECT jsonb_agg(to_jsonb(sources)) FROM sources),'[]'::jsonb),
    'first_observation',(SELECT min(created_at) FROM public.venue_funnel_observations WHERE venue_id=target_venue)
  ) INTO report FROM funnel;
  RETURN report;
END $$;
REVOKE ALL ON FUNCTION public.owner_funnel_report(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_funnel_report(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
