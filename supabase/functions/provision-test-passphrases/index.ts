// One-off admin utility: mint N test passphrases with verified auth users.
// Delete after use.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generatePassphrase, passphraseToEmail, passphraseToPassword } from '../_shared/passphrase.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { password, count } = await req.json();
    const admin = Deno.env.get('ADMIN_PASSWORD') || '';
    if (!admin || password !== admin) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const n = Math.min(Math.max(parseInt(String(count ?? 6), 10) || 6, 1), 20);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const results: { passphrase: string; userId: string }[] = [];
    for (let i = 0; i < n; i++) {
      let created: { passphrase: string; userId: string } | null = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const phrase = generatePassphrase();
        const email = passphraseToEmail(phrase);
        const password = passphraseToPassword(phrase);
        const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
        if (!error && data.user) {
          created = { passphrase: phrase, userId: data.user.id };
        }
      }
      if (!created) continue;
      await supabase.from('verified_participants').insert({ user_id: created.userId });
      results.push(created);
    }
    return new Response(JSON.stringify({ ok: true, passphrases: results }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
