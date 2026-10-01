GRANT SELECT ON public.sim_personas TO anon, authenticated;
CREATE POLICY "Anyone can read sim personas" ON public.sim_personas FOR SELECT TO anon, authenticated USING (true);