CREATE OR REPLACE FUNCTION public.pin_stream_entry(_topic_id uuid, _cycle integer, _point_index integer, _node_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key text;
BEGIN
  -- Nur echte, sichtbare Meinungen dieses Themas dürfen festgehalten werden.
  IF NOT EXISTS (
    SELECT 1 FROM public.opinions
    WHERE id = _node_id AND topic_id = _topic_id AND COALESCE(visible, true)
  ) THEN
    RETURN false;
  END IF;

  _key := 'stream_entry_' || _topic_id::text || '_' || _cycle::text || '_' || _point_index::text;
  INSERT INTO public.app_settings (key, value)
  VALUES (_key, _node_id::text)
  ON CONFLICT (key) DO NOTHING;
  RETURN FOUND;
END;
$$;