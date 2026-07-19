-- Email the conversation recipient (buyer or seller) on every new message.
-- Fixes 0039 which only emailed the seller when the buyer sent a message.

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  conv public.conversations%ROWTYPE;
  recipient uuid;
  preview text;
  recipient_email text;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  preview := left(btrim(NEW.body), 140);

  IF NEW.sender_id = conv.buyer_id THEN
    recipient := conv.seller_id;
    UPDATE public.conversations
    SET
      last_message_at = NEW.created_at,
      last_message_preview = preview,
      seller_unread_count = seller_unread_count + 1
    WHERE id = conv.id;
  ELSE
    recipient := conv.buyer_id;
    UPDATE public.conversations
    SET
      last_message_at = NEW.created_at,
      last_message_preview = preview,
      buyer_unread_count = buyer_unread_count + 1
    WHERE id = conv.id;
  END IF;

  -- Skip self-messages (shouldn't happen, but avoid noise).
  IF recipient IS NULL OR recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    recipient,
    'chat_message',
    'New message',
    preview,
    '/messages/' || conv.id::text,
    jsonb_build_object(
      'conversation_id', conv.id,
      'listing_id', conv.listing_id,
      'sender_id', NEW.sender_id,
      'message_id', NEW.id
    )
  );

  -- Always email the person being messaged (buyer or seller).
  SELECT email INTO recipient_email
  FROM auth.users
  WHERE id = recipient;

  IF recipient_email IS NOT NULL AND length(trim(recipient_email)) > 0 THEN
    PERFORM public.invoke_user_notify(
      'new_message',
      jsonb_build_object(
        'to_email', recipient_email,
        'to', recipient_email,
        'conversation_id', conv.id,
        'listing_id', conv.listing_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'recipient_id', recipient,
        'message_preview', preview,
        'message', format(
          'You have a new message on AhiaUlo.%s%s',
          E'\n\n',
          COALESCE(NULLIF(preview, ''), 'Open Chat to view and reply.')
        )
      )
    );
  ELSE
    RAISE WARNING 'message-email skipped: no email for recipient %', recipient;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();
