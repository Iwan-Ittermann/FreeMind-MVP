// Password-protected demo access for Wedium partners.
// Verifies a shared password (WEDIUM_DEMO_PASSWORD) and hands out one of four
// prepared test accounts (auth user + confirmed signup + opinion on the real
// event topic). Accounts are created idempotently, and all of them are prepared
// as soon as the password is accepted so picking one is instant and reliable.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { passphraseToEmail, passphraseToPassword } from '../_shared/passphrase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface DemoAccount {
  key: string;
  name: string;
  passphrase: string;
  opinion: string;
}

const ACCOUNTS: DemoAccount[] = [
  {
    key: 'mara',
    name: 'Mara',
    passphrase: 'brave-anchor-honor-11',
    opinion:
      'Plattformen sollen für die Inhalte haften, die ihre Algorithmen groß machen — genau wie ein Verlag für seine Titelseite.',
  },
  {
    key: 'jonas',
    name: 'Jonas',
    passphrase: 'clear-delta-gleam-22',
    opinion:
      'Keine neuen Verbote, sondern Transparenz: offene Algorithmen und Datenzugang für Forschung. Erst messen, dann regulieren.',
  },
  {
    key: 'selin',
    name: 'Selin',
    passphrase: 'gentle-garden-bloom-33',
    opinion:
      'Jugendschutz zuerst: klare Altersgrenzen und ein Werbeverbot für alle unter 16. Kinder sind kein Geschäftsmodell.',
  },
  {
    key: 'timo',
    name: 'Timo',
    passphrase: 'bold-river-ignite-44',
    opinion:
      'So wenig Gesetze wie möglich. Gelöscht wird nur, was ein Gericht entschieden hat — sonst entscheiden Konzerne über unsere Meinungsfreiheit.',
  },
];

const publicAccount = (a: DemoAccount) => ({ key: a.key, name: a.name, opinion: a.opinion });

type Admin = ReturnType<typeof createClient>;

async function resolveTopicId(admin: Admin): Promise<string | null> {
  const { data: setting } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'real_topic_short_code')
    .maybeSingle();
  const shortCode = (setting?.value ?? '').trim();
  if (!shortCode) return null;
  const { data: topic } = await admin
    .from('topics')
    .select('id')
    .eq('short_code', shortCode)
    .maybeSingle();
  return topic?.id ?? null;
}

/** Idempotently makes sure the demo account can sign in and has its opinion. */
async function ensureAccount(
  admin: Admin,
  topicId: string,
  account: DemoAccount,
): Promise<boolean> {
  const email = passphraseToEmail(account.passphrase, 'wedium');
  const authPassword = passphraseToPassword(account.passphrase);

  // 1. Auth user.
  let userId: string | null = null;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password: authPassword,
    email_confirm: true,
    user_metadata: { wedium_demo: true, demo_name: account.name, scope: 'wedium' },
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (userId) {
      // Repair the credentials in case the account was created differently before.
      await admin.auth.admin.updateUserById(userId, {
        password: authPassword,
        email_confirm: true,
      });
    }
  }
  if (!userId) return false;

  // 2. Wedium signup row (needed for verified participation).
  const { data: signup } = await admin
    .from('wedium_signups')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  let signupId = signup?.id ?? null;
  if (!signupId) {
    const { data: inserted } = await admin
      .from('wedium_signups')
      .insert({
        email,
        confirmed_at: new Date().toISOString(),
        passphrase: account.passphrase,
        passphrase_issued_at: new Date().toISOString(),
        auth_user_id: userId,
      })
      .select('id')
      .single();
    signupId = inserted?.id ?? null;
  } else {
    await admin.from('wedium_signups').update({ auth_user_id: userId }).eq('id', signupId);
  }
  if (!signupId) return false;

  // 3. Verified participation.
  await admin
    .from('wedium_verified_participants')
    .upsert({ user_id: userId, signup_id: signupId }, { onConflict: 'user_id' });

  // 4. Prepared opinion on the event topic.
  const { data: existingOpinion } = await admin
    .from('opinions')
    .select('id')
    .eq('topic_id', topicId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!existingOpinion) {
    await admin.from('opinions').insert({
      topic_id: topicId,
      user_id: userId,
      text: account.opinion,
      visible: true,
    });
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const expected = Deno.env.get('WEDIUM_DEMO_PASSWORD') ?? '';
    const body = (await req.json().catch(() => ({}))) as {
      password?: unknown;
      accountKey?: unknown;
    };
    const password = typeof body.password === 'string' ? body.password : '';

    if (!expected || password !== expected) {
      return json({ error: 'invalid-password' }, 401);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const topicId = await resolveTopicId(admin);
    if (!topicId) return json({ error: 'no-event-topic' }, 500);

    if (body.accountKey === undefined || body.accountKey === null) {
      // Prepare every account up front so any pick works on the first try.
      for (const a of ACCOUNTS) {
        const ok = await ensureAccount(admin, topicId, a);
        if (!ok) console.error('wedium demo account setup failed', a.key);
      }
      return json({ accounts: ACCOUNTS.map(publicAccount) });
    }

    const account = ACCOUNTS.find((a) => a.key === body.accountKey);
    if (!account) return json({ error: 'unknown-account' }, 400);

    const ok = await ensureAccount(admin, topicId, account);
    if (!ok) return json({ error: 'account-setup-failed' }, 500);

    console.log('wedium demo account handed out', account.key);

    return json({ passphrase: account.passphrase, name: account.name });
  } catch (e) {
    console.error('wedium-demo-access failed', e);
    return json({ error: 'unexpected' }, 500);
  }
});
