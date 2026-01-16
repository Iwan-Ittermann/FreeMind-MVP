-- Add IP address column to opinions table (stored for 1 year minimum)
ALTER TABLE public.opinions 
ADD COLUMN ip_address text;

-- Add IP address columns to reports table
ALTER TABLE public.reports 
ADD COLUMN reporter_ip_address text,
ADD COLUMN reported_user_ip_address text;

-- Create index for potential cleanup queries (by date)
CREATE INDEX idx_opinions_created_at ON public.opinions(created_at);

-- Update report_content function to accept and store IP addresses
CREATE OR REPLACE FUNCTION public.report_content(
  _content_id uuid, 
  _content_type text, 
  _law_book text, 
  _paragraph text, 
  _offense text, 
  _description text DEFAULT NULL,
  _reporter_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _report_id uuid;
  _uid uuid;
  _reported_user_ip text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the IP address of the reported content creator
  IF _content_type = 'Opinion' THEN
    SELECT ip_address INTO _reported_user_ip FROM public.opinions WHERE id = _content_id;
  ELSIF _content_type = 'ChatMessage' THEN
    -- Chat messages don't have IP stored directly, get from the sender's opinion
    SELECT o.ip_address INTO _reported_user_ip 
    FROM public.chat_messages cm
    JOIN public.chats c ON cm.chat_id = c.id
    JOIN public.opinions o ON (o.id = c.opinion_a_id OR o.id = c.opinion_b_id) AND o.user_id = cm.sender_id
    WHERE cm.id = _content_id
    LIMIT 1;
  END IF;

  -- Insert report with IP addresses
  INSERT INTO public.reports (
    content_id, content_type, reporting_user_id, 
    law_book, paragraph, offense, description,
    reporter_ip_address, reported_user_ip_address
  )
  VALUES (
    _content_id, _content_type, _uid, 
    _law_book, _paragraph, _offense, _description,
    _reporter_ip, _reported_user_ip
  )
  RETURNING id INTO _report_id;

  -- Update content status
  IF _content_type = 'Opinion' THEN
    UPDATE public.opinions SET status = 'Reported-Unreviewed' WHERE id = _content_id;
  ELSIF _content_type = 'ChatMessage' THEN
    UPDATE public.chat_messages SET status = 'Reported-Unreviewed' WHERE id = _content_id;
  END IF;

  -- Log audit
  PERFORM public.log_audit('report_content', 'reports', _report_id, 
    jsonb_build_object('content_id', _content_id, 'content_type', _content_type, 'law_book', _law_book, 'paragraph', _paragraph));

  RETURN _report_id;
END;
$$;

-- Create function to submit opinion with IP
CREATE OR REPLACE FUNCTION public.submit_opinion(
  _topic_id uuid,
  _text text,
  _ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _opinion_id uuid;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.opinions (topic_id, user_id, text, ip_address)
  VALUES (_topic_id, _uid, _text, _ip_address)
  RETURNING id INTO _opinion_id;

  RETURN _opinion_id;
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.opinions.ip_address IS 'IP address stored for minimum 1 year for legal compliance. Admin-only access.';
COMMENT ON COLUMN public.reports.reporter_ip_address IS 'IP of the user who submitted the report. Stored until end of statute of limitations.';
COMMENT ON COLUMN public.reports.reported_user_ip_address IS 'IP of the reported content creator. Stored until end of statute of limitations.';