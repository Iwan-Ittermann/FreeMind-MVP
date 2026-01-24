-- Drop table if exists and recreate
DROP TABLE IF EXISTS public.app_settings;

-- Create app_settings table for site-wide configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "App settings are publicly readable"
ON public.app_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update app settings"
ON public.app_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert settings
CREATE POLICY "Admins can insert app settings"
ON public.app_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default site title
INSERT INTO public.app_settings (key, value) 
VALUES ('site_title', 'FreeMind - Free and Safe Online Conversations');