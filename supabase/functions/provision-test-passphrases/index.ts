// Temporary one-shot function to provision 6 test passphrases.
// Deletes existing verified test users (freemind.local emails) first, then
// creates 6 fresh accounts and marks them verified.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const adjectives = ['brave','calm','eager','fancy','gentle','happy','jolly','kind','lively','merry','nice','proud'];
const nouns = ['apple','beach','cloud','dream','eagle','flame','grape','heart','island','jewel','kite','lemon'];
const verbs = ['dance','float','glide','hover','jump','laugh','march','paint','quest','rise','shine','think'];

function generatePhrase(): string {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const v = verbs[Math.floor(Math.random() * verbs.length)];
  const num = Math.floor(Math.random() * 100);
  return `${a}-${n}-${v}-${num}`;
}

const phraseToEmail = (p: string) => `${p.toLowerCase().replace(/-/g, '.')}@freemind.local`;
const phraseToPassword = (p: string) => p.toLowerCase().split('').reverse().join('') + '_FM2024';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const created: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < 6; i++) {
    let phrase = '';
    let attempt = 0;
    while (attempt < 10) {
      phrase = generatePhrase();
      if (!used.has(phrase)) break;
      attempt++;
    }
    used.add(phrase);
    const email = phraseToEmail(phrase);
    const password = phraseToPassword(phrase);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: error?.message ?? 'createUser failed', created }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { error: vpErr } = await admin
      .from('verified_participants')
      .insert({ user_id: data.user.id });
    if (vpErr) {
      return new Response(JSON.stringify({ error: vpErr.message, created }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    created.push(phrase);
  }

  return new Response(JSON.stringify({ passphrases: created }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
