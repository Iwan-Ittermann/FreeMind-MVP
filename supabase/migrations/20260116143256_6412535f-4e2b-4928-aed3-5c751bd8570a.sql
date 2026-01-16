-- =====================================================
-- SECURE IP ADDRESS: Create view and restrict base table
-- =====================================================

-- Step 1: Create a secure public view that EXCLUDES ip_address
-- This view uses security_invoker so RLS still applies
CREATE OR REPLACE VIEW public.opinions_public
WITH (security_invoker = on) AS
SELECT 
  id,
  topic_id,
  user_id,
  text,
  created_at,
  visible,
  status,
  notice_text
FROM public.opinions;

-- Step 2: Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.opinions_public TO authenticated;
GRANT SELECT ON public.opinions_public TO anon;

-- Step 3: Drop the existing permissive public SELECT policy
DROP POLICY IF EXISTS "Visible opinions are publicly readable" ON public.opinions;

-- Step 4: Create restrictive policies on the BASE table
-- Only admins can see all columns (including ip_address)
CREATE POLICY "Admins can view all opinions with IP" 
ON public.opinions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Owners can see their own opinions (including ip_address for their own)
CREATE POLICY "Users can view own opinions" 
ON public.opinions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Step 5: Create an RLS policy for the VIEW that enforces visibility
-- The view itself doesn't have RLS, but we need to ensure only visible opinions show
-- We handle this by creating a function-based check

-- Create a secure function to check if opinion is viewable
CREATE OR REPLACE FUNCTION public.can_view_opinion(_opinion_id uuid, _visible boolean, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _visible = true 
    OR public.has_role(auth.uid(), 'admin'::app_role) 
    OR auth.uid() = _user_id
$$;

-- Step 6: Recreate the view with visibility filter built-in
DROP VIEW IF EXISTS public.opinions_public;

CREATE VIEW public.opinions_public
WITH (security_invoker = on) AS
SELECT 
  id,
  topic_id,
  user_id,
  text,
  created_at,
  visible,
  status,
  notice_text
FROM public.opinions
WHERE 
  visible = true 
  OR public.has_role(auth.uid(), 'admin'::app_role) 
  OR auth.uid() = user_id;

-- Re-grant permissions after recreating
GRANT SELECT ON public.opinions_public TO authenticated;
GRANT SELECT ON public.opinions_public TO anon;

-- Step 7: Add a comment explaining the security model
COMMENT ON VIEW public.opinions_public IS 
'Secure view that exposes opinion data WITHOUT the ip_address column. 
Use this view for all public/client queries. 
The ip_address column is only accessible to admins via the base table or SECURITY DEFINER functions.';