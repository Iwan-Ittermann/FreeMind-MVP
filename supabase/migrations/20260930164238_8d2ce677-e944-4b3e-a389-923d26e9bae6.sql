CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique ON public.app_settings(key);

CREATE OR REPLACE FUNCTION public.pin_stream_entry(_topic_id uuid, _cycle integer, _point_index integer, _node_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key text;
BEGIN
  _key := 'stream_entry_' || _topic_id::text || '_' || _cycle::text || '_' || _point_index::text;
  INSERT INTO public.app_settings (key, value)
  VALUES (_key, _node_id::text)
  ON CONFLICT (key) DO NOTHING;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pin_stream_entry(uuid, integer, integer, uuid) TO anon, authenticated;