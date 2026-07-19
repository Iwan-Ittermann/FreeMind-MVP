import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://freemind.chat',
  'https://www.freemind.chat',
  'https://freemind.city',
  'https://freemind-prototype.lovable.app',
  'https://id-preview--263b4482-adcc-41e3-a0e0-126a5b67d787.lovable.app',
  'http://localhost:8080',
];
const buildCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
});

// Get password from environment variable - never hardcode!
const getAdminPassword = () => Deno.env.get('ADMIN_PASSWORD') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: buildCorsHeaders(req.headers.get("origin")) });
  }

  try {
    const { password } = await req.json();
    const adminPassword = getAdminPassword();

    // Verify password
    if (!adminPassword || password !== adminPassword) {
      console.log('Failed admin password verification attempt');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        { status: 401, headers: { ...buildCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated' }),
        { status: 401, headers: { ...buildCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's token to get their ID
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    
    if (userError || !user) {
      console.log('Failed to get user:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated' }),
        { status: 401, headers: { ...buildCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has admin role
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (existingRole) {
      console.log('User already has admin role:', user.id);
      return new Response(
        JSON.stringify({ success: true, message: 'Already admin' }),
        { headers: { ...buildCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
      );
    }

    // Grant admin role
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: user.id, role: 'admin' });

    if (insertError) {
      console.error('Failed to grant admin role:', insertError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to grant admin role' }),
        { status: 500, headers: { ...buildCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
      );
    }

    // Log audit entry
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'grant_admin_role',
        collection_name: 'user_roles',
        record_id: user.id,
        user_id: user.id,
        details: { role: 'admin', granted_via: 'edge_function' }
      });

    if (auditError) {
      console.warn('Failed to log audit entry:', auditError.message);
    }

    console.log('Admin role granted to user:', user.id);
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...buildCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Verify admin password error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...buildCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
    );
  }
});
