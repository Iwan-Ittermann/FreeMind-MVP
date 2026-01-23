-- Drop the database function with hardcoded password
-- The secure edge function verify-admin-password now handles admin role granting
DROP FUNCTION IF EXISTS public.grant_admin_role(text);