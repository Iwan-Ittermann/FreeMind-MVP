CREATE TABLE public.sim_state (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  running_until timestamp with time zone,
  runs_date date NOT NULL DEFAULT current_date,
  runs_today integer NOT NULL DEFAULT 0,
  lease_expires_at timestamp with time zone,
  paused_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sim_state TO anon, authenticated;
GRANT ALL ON public.sim_state TO service_role;
ALTER TABLE public.sim_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sim state" ON public.sim_state FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.sim_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.sim_personas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot integer NOT NULL UNIQUE,
  name text NOT NULL,
  persona text NOT NULL,
  opinion_text text NOT NULL,
  user_id uuid,
  opinion_id uuid,
  active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.sim_personas TO service_role;
ALTER TABLE public.sim_personas ENABLE ROW LEVEL SECURITY;