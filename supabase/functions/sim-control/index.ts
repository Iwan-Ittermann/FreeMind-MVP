// Public control endpoint for the /sim discussion simulation.
// status: anyone. start: anyone, but server-enforced limits (max 4 runs/day,
// one run at a time, 90 seconds). stop: anyone.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

const RUN_MS = 90_000;
const DAILY_LIMIT = 4;

type Admin = ReturnType<typeof createClient>;

async function publicState(admin: Admin) {
  const { data: s } = await admin.from('sim_state').select('*').eq('id', 1).single();
  const today = new Date().toISOString().slice(0, 10);
  const runsToday = s && s.runs_date === today ? s.runs_today : 0;
  const runningUntil = s?.running_until ? new Date(s.running_until).getTime() : 0;
  return {
    running: runningUntil > Date.now(),
    runningUntil: runningUntil > Date.now() ? new Date(runningUntil).toISOString() : null,
    runsToday,
    runsLeft: Math.max(0, DAILY_LIMIT - runsToday),
    pausedReason: s?.paused_reason ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const action = body.action ?? 'status';

    if (action === 'status') {
      return json(await publicState(admin));
    }

    if (action === 'stop') {
      await admin.from('sim_state').update({ running_until: null }).eq('id', 1);
      return json(await publicState(admin));
    }

    if (action === 'start') {
      const state = await publicState(admin);
      if (state.running) return json(state); // someone else already started it
      if (state.pausedReason) return json({ ...state, error: 'paused' }, 409);
      if (state.runsLeft <= 0) return json({ ...state, error: 'daily-limit' }, 429);

      const today = new Date().toISOString().slice(0, 10);
      const { data: updated } = await admin
        .from('sim_state')
        .update({
          running_until: new Date(Date.now() + RUN_MS).toISOString(),
          runs_date: today,
          runs_today: state.runsToday + 1,
          lease_expires_at: null,
        })
        .eq('id', 1)
        .select('id');
      if (!updated || updated.length === 0) return json({ error: 'state-missing' }, 500);

      // Kick off the tick chain (fire and forget).
      const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sim-tick`;
      fetch(selfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ hop: 0 }),
      }).catch((e) => console.error('sim-control kickoff failed', e));

      return json(await publicState(admin));
    }

    return json({ error: 'unknown-action' }, 400);
  } catch (e) {
    console.error('sim-control failed', e);
    return json({ error: 'unexpected' }, 500);
  }
});
