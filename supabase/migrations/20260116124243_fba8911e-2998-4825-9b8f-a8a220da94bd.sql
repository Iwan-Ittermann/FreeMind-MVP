-- =============================================
-- REPORTING & MODERATION SYSTEM - MVP
-- =============================================

-- 1. Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create laws reference table
CREATE TABLE public.laws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_book text NOT NULL,
  paragraph text NOT NULL,
  offense text NOT NULL,
  version text NOT NULL DEFAULT '2024-01',
  effective_date timestamptz NOT NULL DEFAULT '2024-01-01',
  created_at timestamptz DEFAULT now(),
  UNIQUE (law_book, paragraph, version)
);

ALTER TABLE public.laws ENABLE ROW LEVEL SECURITY;

-- Laws are publicly readable
CREATE POLICY "Laws are publicly readable"
  ON public.laws FOR SELECT
  USING (true);

-- Insert German criminal law provisions for content moderation
INSERT INTO public.laws (law_book, paragraph, offense) VALUES
  ('StGB', '§185', 'Beleidigung'),
  ('StGB', '§186', 'Üble Nachrede'),
  ('StGB', '§187', 'Verleumdung'),
  ('StGB', '§130', 'Volksverhetzung'),
  ('StGB', '§131', 'Gewaltdarstellung'),
  ('StGB', '§184', 'Verbreitung pornografischer Inhalte'),
  ('StGB', '§111', 'Öffentliche Aufforderung zu Straftaten'),
  ('StGB', '§140', 'Belohnung und Billigung von Straftaten'),
  ('StGB', '§241', 'Bedrohung'),
  ('StGB', '§126', 'Störung des öffentlichen Friedens durch Androhung von Straftaten'),
  ('NetzDG', '§1', 'Netzwerkdurchsetzungsgesetz - Anwendungsbereich');

-- 5. Create audit_logs table (append-only)
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  collection_name text NOT NULL,
  record_id uuid,
  user_id uuid REFERENCES auth.users(id),
  timestamp timestamptz DEFAULT now() NOT NULL,
  details jsonb
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- No direct modification allowed - all logging via function
CREATE POLICY "No direct insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);

-- 6. Create security definer function for audit logging
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _collection_name text,
  _record_id uuid,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, collection_name, record_id, user_id, details)
  VALUES (_action, _collection_name, _record_id, auth.uid(), _details);
END;
$$;

-- 7. Add moderation fields to opinions table
ALTER TABLE public.opinions
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Visible',
  ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notice_text text;

-- Add check constraint for status
ALTER TABLE public.opinions
  ADD CONSTRAINT opinions_status_check 
  CHECK (status IN ('Visible', 'Reported-Unreviewed', 'In-Review', 'Soft-Deleted'));

-- 8. Add moderation fields to chat_messages table
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Visible',
  ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notice_text text;

-- Add check constraint for status
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_status_check 
  CHECK (status IN ('Visible', 'Reported-Unreviewed', 'In-Review', 'Soft-Deleted'));

-- 9. Create reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('Opinion', 'ChatMessage')),
  reporting_user_id uuid REFERENCES auth.users(id) NOT NULL,
  law_book text NOT NULL,
  paragraph text NOT NULL,
  offense text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'Unreviewed' CHECK (status IN ('Unreviewed', 'In-Review', 'No-Suspicion', 'Suspicion')),
  admin_id uuid REFERENCES auth.users(id),
  review_timestamp timestamptz
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporting_user_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporting_user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Create report_content function
CREATE OR REPLACE FUNCTION public.report_content(
  _content_id uuid,
  _content_type text,
  _law_book text,
  _paragraph text,
  _offense text,
  _description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _report_id uuid;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert report
  INSERT INTO public.reports (content_id, content_type, reporting_user_id, law_book, paragraph, offense, description)
  VALUES (_content_id, _content_type, _uid, _law_book, _paragraph, _offense, _description)
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

-- 11. Create review_report function (admin only)
CREATE OR REPLACE FUNCTION public.review_report(
  _report_id uuid,
  _new_status text,
  _notice_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _content_id uuid;
  _content_type text;
  _should_hide boolean;
  _final_notice text;
BEGIN
  -- Check admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Validate status
  IF _new_status NOT IN ('In-Review', 'No-Suspicion', 'Suspicion') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Get report details
  SELECT content_id, content_type INTO _content_id, _content_type
  FROM public.reports WHERE id = _report_id;

  IF _content_id IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  -- Determine visibility
  _should_hide := (_new_status = 'Suspicion');
  
  -- Set default notice text for suspicion
  IF _should_hide THEN
    _final_notice := COALESCE(_notice_text, 
      'Dieser Inhalt wurde aufgrund eines begründeten Verdachts auf mögliche Justiziabilität vorläufig ausgeblendet.');
  ELSE
    _final_notice := NULL;
  END IF;

  -- Update report
  UPDATE public.reports 
  SET status = _new_status, admin_id = auth.uid(), review_timestamp = now()
  WHERE id = _report_id;

  -- Update content visibility and status
  IF _content_type = 'Opinion' THEN
    UPDATE public.opinions 
    SET status = CASE WHEN _should_hide THEN 'Soft-Deleted' ELSE 'Visible' END,
        visible = NOT _should_hide,
        notice_text = _final_notice
    WHERE id = _content_id;
  ELSIF _content_type = 'ChatMessage' THEN
    UPDATE public.chat_messages 
    SET status = CASE WHEN _should_hide THEN 'Soft-Deleted' ELSE 'Visible' END,
        visible = NOT _should_hide,
        notice_text = _final_notice
    WHERE id = _content_id;
  END IF;

  -- Log audit
  PERFORM public.log_audit('review_report', 'reports', _report_id,
    jsonb_build_object('new_status', _new_status, 'content_hidden', _should_hide, 'content_id', _content_id));
END;
$$;

-- 12. Create toggle_soft_delete function (admin only)
CREATE OR REPLACE FUNCTION public.toggle_soft_delete(
  _content_id uuid,
  _content_type text,
  _visible boolean,
  _notice_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _content_type = 'Opinion' THEN
    UPDATE public.opinions 
    SET visible = _visible,
        status = CASE WHEN _visible THEN 'Visible' ELSE 'Soft-Deleted' END,
        notice_text = _notice_text
    WHERE id = _content_id;
  ELSIF _content_type = 'ChatMessage' THEN
    UPDATE public.chat_messages 
    SET visible = _visible,
        status = CASE WHEN _visible THEN 'Visible' ELSE 'Soft-Deleted' END,
        notice_text = _notice_text
    WHERE id = _content_id;
  END IF;

  -- Log audit
  PERFORM public.log_audit('toggle_soft_delete', _content_type, _content_id,
    jsonb_build_object('visible', _visible, 'notice_text', _notice_text));
END;
$$;

-- 13. Create unified contents view
CREATE OR REPLACE VIEW public.contents WITH (security_invoker=on) AS
SELECT 
  id AS content_id,
  'Opinion'::text AS content_type,
  user_id AS creator_id,
  text,
  created_at,
  status,
  visible,
  notice_text,
  topic_id
FROM public.opinions
UNION ALL
SELECT 
  id AS content_id,
  'ChatMessage'::text AS content_type,
  sender_id AS creator_id,
  content AS text,
  created_at,
  status,
  visible,
  notice_text,
  NULL::uuid AS topic_id
FROM public.chat_messages;

-- 14. Update RLS policy for opinions to respect visibility
DROP POLICY IF EXISTS "Opinions are publicly readable" ON public.opinions;

CREATE POLICY "Visible opinions are publicly readable"
  ON public.opinions FOR SELECT
  USING (visible = true OR public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- 15. Update RLS policy for chat_messages to respect visibility  
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;

CREATE POLICY "Visible messages are readable by participants"
  ON public.chat_messages FOR SELECT
  USING (
    (visible = true AND is_chat_participant(chat_id, auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
    OR auth.uid() = sender_id
  );