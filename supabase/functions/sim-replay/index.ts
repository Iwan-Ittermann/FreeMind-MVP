// Permanent /sim replay: a fixed 72h timeline loops forever from a fixed epoch.
// Every call (cron each minute + page views) materializes all events up to the
// current frame into the normal discussion tables, so every visitor sees the
// same state. At a new cycle the simulated data is wiped and replay restarts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import timeline from '../_shared/sim-timeline.json' with { type: 'json' };
import { SIM_PERSONAS, SIM_TOPIC_TITLE } from '../_shared/sim-personas.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const EPOCH = Date.UTC(2026, 9, 3, 18, 0, 0); // cycle 0 starts here (UTC)
const D = timeline.duration_seconds as number;
type Admin = ReturnType<typeof createClient>;
type Ev = Record<string, any> & { t: number; type: string };
const EVENTS = timeline.timeline as Ev[];

async function setting(admin: Admin, key: string) {
  const { data } = await admin.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}
const put = (admin: Admin, key: string, value: string) =>
  admin.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

async function topicId(admin: Admin): Promise<string | null> {
  const code = (await setting(admin, 'sim_topic_short_code'))?.trim();
  if (code) {
    const { data } = await admin.from('topics').select('id').eq('short_code', code).maybeSingle();
    if (data) return data.id;
  }
  const short = Array.from({ length: 4 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
  const { data } = await admin.from('topics')
    .insert({ title: SIM_TOPIC_TITLE, is_active: true, status: 'Active', url_slug: 'sim', short_code: short })
    .select('id').single();
  if (!data) return null;
  await put(admin, 'sim_topic_short_code', short);
  return data.id;
}

async function personaRows(admin: Admin) {
  const { count } = await admin.from('sim_personas').select('id', { count: 'exact', head: true });
  if (!count) {
    await admin.from('sim_personas').insert(SIM_PERSONAS.map((p) => ({ slot: p.slot, name: p.name, persona: p.persona, opinion_text: p.opinion })));
  }
  const { data } = await admin.from('sim_personas').select('*').order('slot');
  return new Map((data ?? []).map((r: any) => [r.slot as number, r]));
}

async function ensureUser(admin: Admin, p: any): Promise<string | null> {
  if (p.user_id) return p.user_id;
  const email = `sim+${String(p.slot).padStart(2, '0')}@freemind.chat`;
  const { data: c } = await admin.auth.admin.createUser({
    email, password: `sim-${crypto.randomUUID()}`, email_confirm: true,
    user_metadata: { sim: true, demo_name: p.name },
  });
  let id = c?.user?.id ?? null;
  if (!id) {
    const { data: l } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    id = l?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  }
  if (id) { await admin.from('sim_personas').update({ user_id: id }).eq('id', p.id); p.user_id = id; }
  return id;
}

async function wipe(admin: Admin, tid: string, personas: Map<number, any>) {
  const userIds = [...personas.values()].map((p) => p.user_id).filter(Boolean);
  if (userIds.length) {
    const { data: ops } = await admin.from('opinions').select('id').eq('topic_id', tid).in('user_id', userIds);
    const ids = (ops ?? []).map((o: any) => o.id);
    if (ids.length) {
      const list = ids.join(',');
      const { data: chats } = await admin.from('chats').select('id')
        .or(`opinion_a_id.in.(${list}),opinion_b_id.in.(${list})`);
      const cids = (chats ?? []).map((c: any) => c.id);
      if (cids.length) {
        await admin.from('chat_message_reactions').delete().in('message_id',
          ((await admin.from('chat_messages').select('id').in('chat_id', cids)).data ?? []).map((m: any) => m.id));
        await admin.from('chat_messages').delete().in('chat_id', cids);
        await admin.from('chat_ratings').delete().in('chat_id', cids);
        await admin.from('rating_events').delete().in('chat_id', cids);
        await admin.from('user_blocks').delete().in('chat_id', cids);
      }
      await admin.from('rating_events').delete().in('target_opinion_id', ids);
      await admin.from('opinion_ratings').delete().or(`rater_opinion_id.in.(${list}),target_opinion_id.in.(${list})`);
      await admin.from('chat_requests').delete().or(`requester_opinion_id.in.(${list}),target_opinion_id.in.(${list})`);
      if (cids.length) await admin.from('chats').delete().in('id', cids);
      await admin.from('opinion_ips').delete().in('opinion_id', ids);
      const { error } = await admin.from('opinions').delete().in('id', ids);
      if (error) console.error('wipe opinions', error.message);
    }
  }
  await admin.from('sim_personas').update({ opinion_id: null, active: false }).gte('slot', 0);
  for (const p of personas.values()) { p.opinion_id = null; p.active = false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - EPOCH) / 1000));
  const cycle = Math.floor(elapsed / D);
  const frame = elapsed % D;
  const cycleStart = EPOCH + cycle * D * 1000;

  // Single writer: take a short lease.
  const leaseUntil = new Date(now + 50_000).toISOString();
  const { data: got } = await admin.from('sim_state').update({ lease_expires_at: leaseUntil })
    .eq('id', 1).or(`lease_expires_at.is.null,lease_expires_at.lt.${new Date(now).toISOString()}`).select('id');
  if (!got?.length) return json({ cycle, frame, busy: true });

  try {
    const tid = await topicId(admin);
    if (!tid) return json({ error: 'no topic' }, 500);
    const personas = await personaRows(admin);
    const [cCycle, cT] = ((await setting(admin, 'sim_replay_cursor')) ?? '-1:-1').split(':').map(Number);
    let last = cT;
    let chatMap: Record<string, string> = JSON.parse((await setting(admin, 'sim_replay_chats')) ?? '{}');
    if (cCycle !== cycle) {
      await wipe(admin, tid, personas);
      last = -1;
      chatMap = {};
    }
    const msgCount: Record<string, number> = {};
    let applied = 0;
    const deadline = now + 40_000;

    for (const e of EVENTS) {
      if (e.t <= last || e.t > frame) continue;
      if (Date.now() > deadline) break;
      const at = new Date(cycleStart + e.t * 1000).toISOString();
      if (e.type === 'opinion') {
        const p = personas.get(e.slot);
        const uid = p && await ensureUser(admin, p);
        if (uid && !p.opinion_id) {
          const { data } = await admin.from('opinions')
            .insert({ topic_id: tid, user_id: uid, text: e.text, visible: true, created_at: at }).select('id').single();
          if (data) {
            p.opinion_id = data.id;
            await admin.from('sim_personas').update({ opinion_id: data.id, active: true }).eq('id', p.id);
          }
        }
      } else if (e.type === 'chat_open') {
        const a = personas.get(e.from_slot)?.opinion_id, b = personas.get(e.to_slot)?.opinion_id;
        if (a && b && !chatMap[e.chat]) {
          const { data } = await admin.from('chats')
            .insert({ topic_id: tid, opinion_a_id: a, opinion_b_id: b, created_at: at }).select('id').single();
          if (data) chatMap[e.chat] = data.id;
        }
      } else if (e.type === 'message') {
        const cid = chatMap[e.chat], uid = personas.get(e.sender_slot)?.user_id;
        if (cid && uid) {
          await admin.from('chat_messages').insert({ chat_id: cid, sender_id: uid, content: e.text, created_at: at, visible: true });
        }
      } else if (e.type === 'rating') {
        const cid = chatMap[e.chat];
        const rater = personas.get(e.from_slot), target = personas.get(e.to_slot);
        if (cid && rater?.user_id && target?.opinion_id && rater.opinion_id) {
          if (msgCount[cid] === undefined) {
            const { count } = await admin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('chat_id', cid);
            msgCount[cid] = count ?? 0;
          }
          const dis = Math.round(e.disagreement / 10);
          await admin.from('chat_ratings').upsert({
            chat_id: cid, rater_id: rater.user_id, empathy: e.respect, disagreement: dis,
            message_count: msgCount[cid], created_at: at, updated_at: at,
          }, { onConflict: 'chat_id,rater_id,message_count', ignoreDuplicates: true });
          await admin.from('rating_events').insert([
            { topic_id: tid, rater_id: rater.user_id, kind: 'understanding', target_opinion_id: target.opinion_id, chat_id: cid, value: e.respect, created_at: at },
            { topic_id: tid, rater_id: rater.user_id, kind: 'difference', target_opinion_id: target.opinion_id, chat_id: cid, value: dis, created_at: at },
          ]);
          await admin.from('opinion_ratings').upsert({
            topic_id: tid, rater_opinion_id: rater.opinion_id, target_opinion_id: target.opinion_id,
            disagreement: dis, updated_at: at,
          }, { onConflict: 'rater_opinion_id,target_opinion_id' });
        }
      }
      if (e.type === 'message' && chatMap[e.chat] && msgCount[chatMap[e.chat]] !== undefined) msgCount[chatMap[e.chat]]++;
      last = e.t;
      applied++;
    }
    await put(admin, 'sim_replay_cursor', `${cycle}:${last}`);
    await put(admin, 'sim_replay_chats', JSON.stringify(chatMap));
    return json({ cycle, frame, applied, cursor: last });
  } finally {
    await admin.from('sim_state').update({ lease_expires_at: null }).eq('id', 1);
  }
});
