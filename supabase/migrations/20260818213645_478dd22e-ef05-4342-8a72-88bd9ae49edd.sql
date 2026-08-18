CREATE TABLE public.question_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  email text,
  ai_draft text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_submissions TO authenticated;
GRANT ALL ON public.question_submissions TO service_role;
ALTER TABLE public.question_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read question submissions"
  ON public.question_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.polarization_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  wave text NOT NULL,
  least_liked_score integer,
  most_liked_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, wave)
);
GRANT SELECT, INSERT ON public.polarization_responses TO authenticated;
GRANT ALL ON public.polarization_responses TO service_role;
ALTER TABLE public.polarization_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own polarization response"
  ON public.polarization_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own polarization response"
  ON public.polarization_responses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));