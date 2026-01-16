-- Create a security definer function to grant admin role after password verification
-- This bypasses RLS since we verify the password server-side
CREATE OR REPLACE FUNCTION public.grant_admin_role(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify password (hardcoded for prototype)
  IF _password <> 'Wonderful' THEN
    RETURN false;
  END IF;

  -- Check if role already exists
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin') THEN
    RETURN true;
  END IF;

  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  
  -- Log audit
  PERFORM public.log_audit('grant_admin_role', 'user_roles', _uid, jsonb_build_object('role', 'admin'));
  
  RETURN true;
END;
$$;