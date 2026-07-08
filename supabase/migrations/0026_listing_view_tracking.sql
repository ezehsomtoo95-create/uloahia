-- Return whether a unique view was recorded so clients can refresh counts accurately.
CREATE OR REPLACE FUNCTION public.record_listing_view(
  listing_uuid uuid,
  p_visitor_id text,
  p_is_guest boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already_viewed boolean;
BEGIN
  IF p_visitor_id IS NULL OR length(trim(p_visitor_id)) = 0 THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.listings
    WHERE id = listing_uuid
      AND status = 'approved'
  ) THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.listings
    WHERE id = listing_uuid
      AND seller_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM public.listing_views
  WHERE visitor_id LIKE 'guest:%'
    AND created_at < now() - interval '24 hours';

  IF p_is_guest THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.listing_views
      WHERE listing_id = listing_uuid
        AND visitor_id = p_visitor_id
        AND created_at >= now() - interval '24 hours'
    ) INTO already_viewed;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.listing_views
      WHERE listing_id = listing_uuid
        AND visitor_id = p_visitor_id
    ) INTO already_viewed;
  END IF;

  IF already_viewed THEN
    RETURN false;
  END IF;

  DELETE FROM public.listing_views
  WHERE listing_id = listing_uuid
    AND visitor_id = p_visitor_id;

  INSERT INTO public.listing_views (listing_id, visitor_id)
  VALUES (listing_uuid, p_visitor_id);

  UPDATE public.listings
  SET views = views + 1
  WHERE id = listing_uuid;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_listing_view(uuid, text, boolean) TO anon, authenticated;
