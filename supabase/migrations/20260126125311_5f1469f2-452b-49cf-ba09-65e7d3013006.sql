-- Create the update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create tutorial_settings table for customizing tutorial steps
CREATE TABLE public.tutorial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_type text NOT NULL, -- 'onboarding' or 'chat'
  step_id text NOT NULL,
  language text NOT NULL DEFAULT 'de', -- 'en' or 'de'
  custom_title text,
  custom_text text,
  is_muted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (tutorial_type, step_id, language)
);

-- Enable RLS
ALTER TABLE public.tutorial_settings ENABLE ROW LEVEL SECURITY;

-- Tutorial settings are publicly readable (for all users to see customized tutorials)
CREATE POLICY "Tutorial settings are publicly readable" 
ON public.tutorial_settings 
FOR SELECT 
USING (true);

-- Only admins can manage tutorial settings
CREATE POLICY "Admins can manage tutorial settings" 
ON public.tutorial_settings 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_tutorial_settings_updated_at
BEFORE UPDATE ON public.tutorial_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();