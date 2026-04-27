ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS short_code text;

CREATE OR REPLACE FUNCTION public.generate_topic_short_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  d1 text;
  d2 text;
  l1 text;
  l2 text;
  pattern integer;
  code text;
  tries integer := 0;
BEGIN
  LOOP
    tries := tries + 1;
    IF tries > 200 THEN
      RAISE EXCEPTION 'Unable to generate unique topic short code';
    END IF;

    d1 := floor(random() * 10)::integer::text;
    d2 := floor(random() * 10)::integer::text;
    l1 := chr(97 + floor(random() * 26)::integer);
    l2 := chr(97 + floor(random() * 26)::integer);
    pattern := floor(random() * 6)::integer;

    code := CASE pattern
      WHEN 0 THEN d1 || d2 || l1 || l2
      WHEN 1 THEN d1 || l1 || d2 || l2
      WHEN 2 THEN d1 || l1 || l2 || d2
      WHEN 3 THEN l1 || d1 || d2 || l2
      WHEN 4 THEN l1 || d1 || l2 || d2
      ELSE l1 || l2 || d1 || d2
    END;

    IF NOT EXISTS (SELECT 1 FROM public.topics WHERE short_code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

UPDATE public.topics
SET short_code = public.generate_topic_short_code()
WHERE short_code IS NULL
   OR short_code !~ '^[a-z0-9]{4}$'
   OR length(regexp_replace(short_code, '[^0-9]', '', 'g')) <> 2
   OR length(regexp_replace(short_code, '[^a-z]', '', 'g')) <> 2;

ALTER TABLE public.topics
ALTER COLUMN short_code SET NOT NULL;

ALTER TABLE public.topics
DROP CONSTRAINT IF EXISTS topics_short_code_format;

ALTER TABLE public.topics
ADD CONSTRAINT topics_short_code_format
CHECK (
  short_code ~ '^[a-z0-9]{4}$'
  AND length(regexp_replace(short_code, '[^0-9]', '', 'g')) = 2
  AND length(regexp_replace(short_code, '[^a-z]', '', 'g')) = 2
);

CREATE UNIQUE INDEX IF NOT EXISTS topics_short_code_key
ON public.topics (short_code);

CREATE OR REPLACE FUNCTION public.create_topic(_title text, _description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _topic_id UUID;
  _slug TEXT;
  _short_code TEXT;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  _slug := lower(regexp_replace(_title, '[^a-zA-Z0-9]+', '-', 'g')) 
           || '-' || substring(md5(random()::text), 1, 8);
  _short_code := public.generate_topic_short_code();
  
  INSERT INTO public.topics (title, description, url_slug, short_code, status, created_by)
  VALUES (_title, _description, _slug, _short_code, 'Active', _uid)
  RETURNING id INTO _topic_id;
  
  PERFORM log_audit('create_topic', 'topics', _topic_id, 
    jsonb_build_object('title', _title, 'slug', _slug, 'short_code', _short_code));
  
  RETURN _topic_id;
END;
$function$;