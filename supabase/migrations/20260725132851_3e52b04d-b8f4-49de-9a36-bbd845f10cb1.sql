
CREATE TABLE public.faq_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faq_items TO anon, authenticated;
GRANT ALL ON public.faq_items TO service_role;

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQ items are publicly readable"
  ON public.faq_items FOR SELECT
  USING (true);

CREATE TRIGGER update_faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
