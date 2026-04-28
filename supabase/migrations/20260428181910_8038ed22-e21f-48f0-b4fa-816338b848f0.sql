CREATE OR REPLACE FUNCTION public.sync_fake_node_opinion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fake_user_id uuid;
  _existing_opinion_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.opinions
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  _fake_user_id := public.fake_node_user_id(NEW.id);

  SELECT o.id INTO _existing_opinion_id
  FROM public.opinions o
  WHERE o.topic_id = NEW.topic_id
    AND o.text = NEW.opinion_text
  ORDER BY CASE WHEN o.id = NEW.id THEN 0 ELSE 1 END
  LIMIT 1;

  IF _existing_opinion_id IS NOT NULL THEN
    UPDATE public.opinions
    SET visible = true,
        status = 'Visible'
    WHERE id = _existing_opinion_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.opinions (id, topic_id, user_id, text, visible, status)
  VALUES (NEW.id, NEW.topic_id, _fake_user_id, NEW.opinion_text, true, 'Visible')
  ON CONFLICT (id) DO UPDATE
  SET topic_id = EXCLUDED.topic_id,
      user_id = EXCLUDED.user_id,
      text = EXCLUDED.text,
      visible = true,
      status = 'Visible'
  WHERE public.opinions.id = NEW.id;

  RETURN NEW;
END;
$$;
