
CREATE TABLE public.test_diskussion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL
);

ALTER TABLE public.test_diskussion_replies ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (no auth required for submissions)
CREATE POLICY "Anyone can insert replies"
ON public.test_diskussion_replies
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can read all replies
CREATE POLICY "Admins can view all replies"
ON public.test_diskussion_replies
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
