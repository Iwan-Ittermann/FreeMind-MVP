import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Get password from environment variable - never hardcode!
const getAdminPassword = () => Deno.env.get('ADMIN_PASSWORD') || '';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    const adminPassword = getAdminPassword();

    if (!adminPassword || password !== adminPassword) {
      console.log('Unauthorized reset-database attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete in order respecting foreign key constraints
    // 1. Delete chat_messages (references chats)
    const { error: msgError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (msgError) throw msgError;

    // 2. Delete chat_ratings (references chats)
    const { error: ratingsError } = await supabase
      .from('chat_ratings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (ratingsError) throw ratingsError;

    // 3. Delete chats (references opinions)
    const { error: chatsError } = await supabase
      .from('chats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (chatsError) throw chatsError;

    // 4. Delete chat_requests (references opinions)
    const { error: requestsError } = await supabase
      .from('chat_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (requestsError) throw requestsError;

    // 5. Delete opinions (references topics)
    const { error: opinionsError } = await supabase
      .from('opinions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (opinionsError) throw opinionsError;

    return new Response(
      JSON.stringify({ success: true, message: 'Database reset successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reset database error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
