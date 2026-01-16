-- Phase 2: Backend Functions for Topic Management

-- 2.1 Create topic RPC (Admin only)
CREATE OR REPLACE FUNCTION public.create_topic(
  _title TEXT,
  _description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _topic_id UUID;
  _slug TEXT;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Generate random slug: sanitized title + random suffix
  _slug := lower(regexp_replace(_title, '[^a-zA-Z0-9]+', '-', 'g')) 
           || '-' || substring(md5(random()::text), 1, 8);
  
  INSERT INTO public.topics (title, description, url_slug, status, created_by)
  VALUES (_title, _description, _slug, 'Active', _uid)
  RETURNING id INTO _topic_id;
  
  PERFORM log_audit('create_topic', 'topics', _topic_id, 
    jsonb_build_object('title', _title, 'slug', _slug));
  
  RETURN _topic_id;
END;
$$;

-- 2.2 Update topic status RPC (Admin only)
CREATE OR REPLACE FUNCTION public.update_topic_status(
  _topic_id UUID,
  _new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF _new_status NOT IN ('Active', 'Archived', 'Deleted') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  
  UPDATE public.topics SET status = _new_status WHERE id = _topic_id;
  
  PERFORM log_audit('update_topic_status', 'topics', _topic_id,
    jsonb_build_object('new_status', _new_status));
END;
$$;

-- 2.3 Join topic RPC (User)
CREATE OR REPLACE FUNCTION public.join_topic(
  _topic_slug TEXT,
  _ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _topic_id UUID;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find topic by slug (only Active topics can be joined)
  SELECT id INTO _topic_id 
  FROM public.topics 
  WHERE url_slug = _topic_slug AND status = 'Active';
  
  IF _topic_id IS NULL THEN
    RAISE EXCEPTION 'Topic not found or inactive';
  END IF;
  
  -- Insert or do nothing if already joined
  INSERT INTO public.user_topics (user_id, topic_id, ip_address)
  VALUES (_uid, _topic_id, _ip_address)
  ON CONFLICT (user_id, topic_id) DO NOTHING;
  
  PERFORM log_audit('join_topic', 'user_topics', _topic_id,
    jsonb_build_object('user_id', _uid));
  
  RETURN _topic_id;
END;
$$;

-- 2.4 Check if user has joined a topic
CREATE OR REPLACE FUNCTION public.has_joined_topic(_topic_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_topics
    WHERE user_id = auth.uid() AND topic_id = _topic_id
  )
$$;

-- 2.5 Get user's joined topics
CREATE OR REPLACE FUNCTION public.get_user_topics()
RETURNS TABLE(
  topic_id UUID,
  title TEXT,
  description TEXT,
  url_slug TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    t.id as topic_id,
    t.title,
    t.description,
    t.url_slug,
    t.status,
    ut.joined_at
  FROM public.user_topics ut
  JOIN public.topics t ON t.id = ut.topic_id
  WHERE ut.user_id = auth.uid()
  ORDER BY ut.joined_at DESC
$$;

-- 2.6 Create court case RPC (Admin only)
CREATE OR REPLACE FUNCTION public.create_court_case(
  _report_id UUID,
  _court_name TEXT DEFAULT NULL,
  _case_number TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _case_id UUID;
  _topic_id UUID;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get topic_id from report via content
  SELECT 
    CASE 
      WHEN r.content_type = 'Opinion' THEN o.topic_id
      WHEN r.content_type = 'ChatMessage' THEN ch.topic_id
    END INTO _topic_id
  FROM public.reports r
  LEFT JOIN public.opinions o ON r.content_id = o.id AND r.content_type = 'Opinion'
  LEFT JOIN public.chat_messages cm ON r.content_id = cm.id AND r.content_type = 'ChatMessage'
  LEFT JOIN public.chats ch ON cm.chat_id = ch.id
  WHERE r.id = _report_id;

  IF _topic_id IS NULL THEN
    RAISE EXCEPTION 'Report not found or topic cannot be determined';
  END IF;

  INSERT INTO public.court_cases (report_id, topic_id, court_name, case_number, status, decision_type)
  VALUES (_report_id, _topic_id, _court_name, _case_number, 'Inactive', 'Pending')
  RETURNING id INTO _case_id;

  PERFORM log_audit('create_court_case', 'court_cases', _case_id,
    jsonb_build_object('report_id', _report_id, 'topic_id', _topic_id));

  RETURN _case_id;
END;
$$;

-- 2.7 Approve court case RPC (Admin only)
CREATE OR REPLACE FUNCTION public.approve_court_case(_case_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  UPDATE public.court_cases 
  SET status = 'Active', admin_id = _uid, updated_at = now()
  WHERE id = _case_id;
  
  PERFORM log_audit('approve_court_case', 'court_cases', _case_id, NULL);
END;
$$;

-- 2.8 Update court case decision RPC (Admin only)
CREATE OR REPLACE FUNCTION public.update_court_case_decision(
  _case_id UUID,
  _decision_type TEXT,
  _decision_date DATE DEFAULT NULL,
  _court_name TEXT DEFAULT NULL,
  _case_number TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
  _report_id UUID;
  _content_id UUID;
  _content_type TEXT;
  _notice TEXT;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _decision_type NOT IN ('Pending', 'Dismissed', 'Acquittal', 'Conviction') THEN
    RAISE EXCEPTION 'Invalid decision type';
  END IF;

  -- Get report info
  SELECT cc.report_id INTO _report_id FROM public.court_cases cc WHERE cc.id = _case_id;
  SELECT r.content_id, r.content_type INTO _content_id, _content_type 
  FROM public.reports r WHERE r.id = _report_id;

  -- Update court case
  UPDATE public.court_cases 
  SET decision_type = _decision_type,
      decision_date = _decision_date,
      court_name = COALESCE(_court_name, court_name),
      case_number = COALESCE(_case_number, case_number),
      updated_at = now()
  WHERE id = _case_id;

  -- Update content based on decision
  IF _decision_type = 'Pending' THEN
    _notice := 'Ein Gerichtsverfahren ist anhängig.';
  ELSIF _decision_type IN ('Dismissed', 'Acquittal') THEN
    _notice := 'Verdacht nicht bestätigt / Freispruch.';
    -- Lift soft-delete
    IF _content_type = 'Opinion' THEN
      UPDATE public.opinions SET visible = true, status = 'Visible', notice_text = _notice WHERE id = _content_id;
    ELSIF _content_type = 'ChatMessage' THEN
      UPDATE public.chat_messages SET visible = true, status = 'Visible', notice_text = _notice WHERE id = _content_id;
    END IF;
  ELSIF _decision_type = 'Conviction' THEN
    _notice := 'Justiziabilität festgestellt.';
    -- Keep soft-delete
    IF _content_type = 'Opinion' THEN
      UPDATE public.opinions SET notice_text = _notice WHERE id = _content_id;
    ELSIF _content_type = 'ChatMessage' THEN
      UPDATE public.chat_messages SET notice_text = _notice WHERE id = _content_id;
    END IF;
  END IF;

  PERFORM log_audit('update_court_case_decision', 'court_cases', _case_id,
    jsonb_build_object('decision_type', _decision_type, 'content_id', _content_id));
END;
$$;