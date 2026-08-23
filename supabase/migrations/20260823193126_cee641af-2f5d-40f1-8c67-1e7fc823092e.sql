ALTER TABLE public.push_prefs ADD COLUMN IF NOT EXISTS new_bridge_points boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.notify_on_bridge_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_diff numeric;
  v_points integer;
BEGIN
  IF NEW.kind <> 'understanding' THEN
    RETURN NEW;
  END IF;

  SELECT o.user_id INTO v_owner FROM public.opinions o WHERE o.id = NEW.target_opinion_id;
  IF v_owner IS NULL OR v_owner = NEW.rater_id THEN
    RETURN NEW;
  END IF;

  SELECT e.value INTO v_diff
  FROM public.rating_events e
  WHERE e.kind = 'difference'
    AND e.rater_id = NEW.rater_id
    AND e.target_opinion_id = NEW.target_opinion_id
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_diff IS NULL THEN
    SELECT r.disagreement INTO v_diff
    FROM public.opinion_ratings r
    JOIN public.opinions ro ON ro.id = r.rater_opinion_id AND ro.user_id = NEW.rater_id
    WHERE r.target_opinion_id = NEW.target_opinion_id
    LIMIT 1;
  END IF;

  v_points := GREATEST(0, ROUND((NEW.value / 10.0) * COALESCE(v_diff, 5)))::integer;

  INSERT INTO public.notifications (user_id, topic_id, chat_id, opinion_id, type, title, body, link)
  VALUES (v_owner, NEW.topic_id, NEW.chat_id, NEW.target_opinion_id, 'bridge_points',
          'Brückenpunkte erhalten',
          'Du hast ' || v_points || ' Brückenpunkte für deine Meinung erhalten.',
          '/go');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_bridge_points ON public.rating_events;
CREATE TRIGGER trg_notify_bridge_points
AFTER INSERT ON public.rating_events
FOR EACH ROW EXECUTE FUNCTION public.notify_on_bridge_points();