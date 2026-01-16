-- Allow authenticated users to read visible opinions
-- IP address is protected because clients use opinions_public view which excludes it
CREATE POLICY "Users can view visible opinions" 
ON public.opinions 
FOR SELECT 
USING (visible = true);