-- Server-only code verification. Keep customer and anonymous source access unchanged.
GRANT SELECT (id, code, venue_id, active) ON public.sources TO service_role;
NOTIFY pgrst, 'reload schema';
