CREATE OR REPLACE FUNCTION public.fake_node_user_id(_fake_node_id uuid)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ('00000000-0000-4000-8000-' || substring(md5(_fake_node_id::text), 1, 12))::uuid
$$;

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
    WHERE id = OLD.id
      AND user_id = public.fake_node_user_id(OLD.id);
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

DROP TRIGGER IF EXISTS sync_fake_node_opinion_trigger ON public.fake_nodes;

CREATE TRIGGER sync_fake_node_opinion_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.fake_nodes
FOR EACH ROW
EXECUTE FUNCTION public.sync_fake_node_opinion();

INSERT INTO public.opinions (id, topic_id, user_id, text, visible, status)
SELECT
  fn.id,
  fn.topic_id,
  public.fake_node_user_id(fn.id),
  fn.opinion_text,
  true,
  'Visible'
FROM public.fake_nodes fn
WHERE NOT EXISTS (
  SELECT 1
  FROM public.opinions o
  WHERE o.topic_id = fn.topic_id
    AND o.text = fn.opinion_text
)
ON CONFLICT DO NOTHING;
