-- Admin listing insert notify + seller alerts for new comments.
-- Ensures signup (auth.users) and listing submissions both email admin via invoke_admin_notify.
-- Also notifies listing owners in-app (and by email) on new comments.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'chat_message',
      'listing_comment',
      'listing_approved',
      'listing_rejected',
      'listing_reported',
      'listing_expires_soon'
    )
  );

CREATE OR REPLACE FUNCTION public.notify_admin_on_listing_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.invoke_admin_notify(
    'new_listing',
    jsonb_build_object(
      'listing_id', NEW.id,
      'seller_id', NEW.seller_id,
      'title', NEW.title,
      'status', NEW.status,
      'price', NEW.price,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_admin_notify ON public.listings;
CREATE TRIGGER on_listing_admin_notify
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_listing_created();

CREATE OR REPLACE FUNCTION public.notify_seller_on_listing_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  listing_row public.listings%ROWTYPE;
  preview text;
  seller_email text;
BEGIN
  SELECT * INTO listing_row
  FROM public.listings
  WHERE id = NEW.listing_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Do not notify the seller about their own comment.
  IF listing_row.seller_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  preview := left(btrim(NEW.body), 140);

  PERFORM public.create_notification(
    listing_row.seller_id,
    'listing_comment',
    'New comment on your listing',
    preview,
    '/listing/' || listing_row.id::text,
    jsonb_build_object(
      'listing_id', listing_row.id,
      'comment_id', NEW.id,
      'author_id', NEW.author_id
    )
  );

  SELECT email INTO seller_email FROM auth.users WHERE id = listing_row.seller_id;

  IF seller_email IS NOT NULL AND length(trim(seller_email)) > 0 THEN
    PERFORM public.invoke_user_notify(
      'listing_comment_email',
      jsonb_build_object(
        'to_email', seller_email,
        'listing_id', listing_row.id,
        'listing_title', listing_row.title,
        'comment_preview', preview
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_comment_created ON public.listing_comments;
CREATE TRIGGER on_listing_comment_created
  AFTER INSERT ON public.listing_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_on_listing_comment();
