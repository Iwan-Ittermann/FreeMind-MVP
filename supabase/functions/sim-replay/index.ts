// Permanent /sim replay: a fixed 72h timeline loops forever from a fixed epoch.
// Every call (cron each minute + page views) materializes all events up to the
// current frame into the normal discussion tables, so every visitor sees the
// same state. At a new cycle the simulated data is wiped and replay restarts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import socialTimeline from '../_shared/sim-timeline.json' with { type: 'json' };
import augustTimeline from '../_shared/sim-august-timeline.json' with { type: 'json' };
import { SIM_PERSONAS, SIM_TOPIC_TITLE } from '../_shared/sim-personas.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const EPOCH = Date.UTC(2026, 9, 3, 18, 0, 0); // cycle 0 starts here (UTC)
const SPEED = 180;
type Admin = ReturnType<typeof createClient>;
type Ev = Record<string, any> & { t: number; type: string };
type Dataset = 'social' | 'august';
// Each dataset has its own topic, persona slots, cursor and lease; renderer and replay are shared.
const DATASETS: Record<Dataset, { timeline: any; topicKey: string; slotOffset: number; suffix: string; lease: string; title: string; personas: Array<{ slot: number; name: string; persona: string; opinion: string }> }> = {
  social: { timeline: socialTimeline, topicKey: 'sim_topic_short_code', slotOffset: 0, suffix: '', lease: 'lease_expires_at', title: SIM_TOPIC_TITLE,
    personas: SIM_PERSONAS.map((p) => ({ slot: p.slot, name: p.name, persona: p.persona, opinion: p.opinion })) },
  august: { timeline: augustTimeline, topicKey: 'sim_august_topic_short_code', slotOffset: 1000, suffix: '_august', lease: 'august_lease_expires_at',
    title: (augustTimeline as any).topic,
    personas: ((augustTimeline as any).persona_list as any[]).map((p) => ({ slot: p.slot, name: p.name, persona: 'August-Teilnehmer:in (anonymisiert)', opinion: p.opinion })) },
};
let cfg = DATASETS.social;

async function setting(admin: Admin, key: string) {
  const { data } = await admin.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}
const put = (admin: Admin, key: string, value: string) =>
  admin.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

async function topicId(admin: Admin): Promise<string | null> {
  const code = (await setting(admin, cfg.topicKey))?.trim();
  if (code) {
    const { data } = await admin.from('topics').select('id').eq('short_code', code).maybeSingle();
    if (data) return data.id;
  }
  const short = cfg.suffix ? 'au08' : Array.from({ length: 4 }, (_, i) => (i % 2 ? '0123456789' : 'abcdefghijklmnopqrstuvwxyz')[Math.floor(Math.random() * (i % 2 ? 10 : 26))]).join('');
  const { data } = await admin.from('topics')
    .insert({ title: cfg.title, is_active: true, status: 'Active', url_slug: 'sim' + cfg.suffix.replace('_', '-'), short_code: short })
    .select('id').single();
  if (!data) return null;
  await put(admin, cfg.topicKey, short);
  return data.id;
}

async function personaRows(admin: Admin) {
  const lo = cfg.slotOffset, hi = cfg.slotOffset + 999;
  const { data: existing } = await admin.from('sim_personas').select('slot').gte('slot', lo).lte('slot', hi);
  const have = new Set((existing ?? []).map((r: any) => r.slot));
  const missing = cfg.personas.filter((p) => !have.has(p.slot + lo));
  if (missing.length) {
    await admin.from('sim_personas').insert(missing.map((p) => ({ slot: p.slot + lo, name: p.name, persona: p.persona, opinion_text: p.opinion })));
  }
  const { data } = await admin.from('sim_personas').select('*').gte('slot', lo).lte('slot', hi).order('slot');
  return new Map((data ?? []).map((r: any) => [(r.slot as number) - lo, r]));
}

async function ensureUser(admin: Admin, p: any): Promise<string | null> {
  if (p.user_id) return p.user_id;
  const email = `sim+${String(p.slot).padStart(2, '0')}@freemind.chat`; // p.slot is the raw DB slot
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
  await admin.from('sim_personas').update({ opinion_id: null, active: false }).gte('slot', cfg.slotOffset).lte('slot', cfg.slotOffset + 999);
  for (const p of personas.values()) { p.opinion_id = null; p.active = false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const ds = body?.dataset ?? 'social';
  if (ds !== 'social' && ds !== 'august') return json({ error: 'invalid dataset' }, 400);
  cfg = DATASETS[ds as Dataset];
  const timeline = cfg.timeline;
  const D = timeline.duration_seconds as number;
  const REAL_CYCLE_MS = (D / SPEED) * 1000;
  const EVENTS = timeline.timeline as Ev[];
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - EPOCH) / 1000));
  const acceleratedElapsed = elapsed * SPEED;
  const cycle = Math.floor(acceleratedElapsed / D);
  const frame = acceleratedElapsed % D;
  const cycleStart = EPOCH + cycle * REAL_CYCLE_MS;

  // Single writer: take a short lease.
  const leaseUntil = new Date(now + 50_000).toISOString();
  const { data: got } = await admin.from('sim_state').update({ [cfg.lease]: leaseUntil })
    .eq('id', 1).or(`${cfg.lease}.is.null,${cfg.lease}.lt.${new Date(now).toISOString()}`).select('id');
  if (!got?.length) return json({ cycle, frame, busy: true });

  try {
    const tid = await topicId(admin);
    if (!tid) return json({ error: 'no topic' }, 500);
    const personas = await personaRows(admin);
    const [cCycle, cT] = ((await setting(admin, 'sim_replay_cursor' + cfg.suffix)) ?? '-1:-1').split(':').map(Number);
    let last = cT;
    let chatMap: Record<string, string> = JSON.parse((await setting(admin, 'sim_replay_chats' + cfg.suffix)) ?? '{}');
    if (cCycle !== cycle) {
      await wipe(admin, tid, personas);
      last = -1;
      chatMap = {};
    }
    // Batched catch-up: one insert per table and stage instead of one roundtrip per event.
    const pending = EVENTS.filter((e) => e.t > last && e.t <= frame);
    const at = (t: number) => new Date(cycleStart + (t / SPEED) * 1000).toISOString();
    const animationEvents: Array<Record<string, unknown>> = [];
    const chatSpecs = new Map((timeline.chats as Array<{ id: string; a: number; b: number }>).map((c) => [c.id, c]));

    // 1) users + opinions
    const opEvents = pending.filter((e) => e.type === 'opinion' && personas.get(e.slot) && !personas.get(e.slot).opinion_id);
    await Promise.all(opEvents.map((e) => ensureUser(admin, personas.get(e.slot))));
    const opRows = opEvents.filter((e) => personas.get(e.slot)?.user_id);
    if (opRows.length) {
      const { data } = await admin.from('opinions').insert(opRows.map((e) => ({
        topic_id: tid, user_id: personas.get(e.slot).user_id, text: e.text, visible: true, created_at: at(e.t),
      }))).select('id,user_id');
      const byUser = new Map((data ?? []).map((r: any) => [r.user_id, r.id]));
      await Promise.all(opRows.map(async (e) => {
        const p = personas.get(e.slot); const id = byUser.get(p.user_id);
        if (!id) return;
        p.opinion_id = id; p.active = true;
        animationEvents.push({ id: `opinion:${cycle}:${e.t}:${id}`, type: 'opinion', opinionId: id, text: e.text, t: e.t });
        await admin.from('sim_personas').update({ opinion_id: id, active: true }).eq('id', p.id);
      }));
    }

    // 2) chats
    const chatEvents = pending.filter((e) => e.type === 'chat_open' && !chatMap[e.chat]
      && personas.get(e.from_slot)?.opinion_id && personas.get(e.to_slot)?.opinion_id);
    if (chatEvents.length) {
      const { data } = await admin.from('chats').insert(chatEvents.map((e) => ({
        topic_id: tid, opinion_a_id: personas.get(e.from_slot).opinion_id, opinion_b_id: personas.get(e.to_slot).opinion_id, created_at: at(e.t),
      }))).select('id,opinion_a_id,opinion_b_id');
      for (const e of chatEvents) {
        const a = personas.get(e.from_slot).opinion_id, b = personas.get(e.to_slot).opinion_id;
        const row = (data ?? []).find((r: any) => r.opinion_a_id === a && r.opinion_b_id === b);
        if (row) chatMap[e.chat] = row.id;
      }
    }

    // 3) messages (message_count for ratings tracked in memory)
    const msgCount: Record<string, number> = {};
    const known = Object.values(chatMap);
    if (known.length) {
      const { data } = await admin.from('chat_messages').select('chat_id').in('chat_id', known);
      for (const r of data ?? []) msgCount[(r as any).chat_id] = (msgCount[(r as any).chat_id] ?? 0) + 1;
    }
    const msgRows: any[] = [], msgMeta: Ev[] = [];
    const ratingCount = new Map<Ev, number>();
    for (const e of pending) {
      const cid = chatMap[e.chat];
      if (e.type === 'message') {
        const uid = personas.get(e.sender_slot)?.user_id;
        if (cid && uid) {
          msgRows.push({ chat_id: cid, sender_id: uid, content: e.text, created_at: at(e.t), visible: true });
          msgMeta.push(e);
          msgCount[cid] = (msgCount[cid] ?? 0) + 1;
        }
      } else if (e.type === 'rating' && cid) ratingCount.set(e, msgCount[cid] ?? 0);
    }
    if (msgRows.length) {
      const { data } = await admin.from('chat_messages').insert(msgRows).select('id');
      (data ?? []).forEach((m: any, i: number) => {
        const e = msgMeta[i]; const spec = chatSpecs.get(e.chat);
        const targetSlot = spec ? (spec.a === e.sender_slot ? spec.b : spec.a) : null;
        const src = personas.get(e.sender_slot)?.opinion_id;
        const tgt = targetSlot == null ? null : personas.get(targetSlot)?.opinion_id;
        if (src && tgt) animationEvents.push({ id: `message:${cycle}:${e.t}:${m.id}`, type: 'message', chatId: chatMap[e.chat], sourceOpinionId: src, targetOpinionId: tgt, content: e.text, t: e.t });
      });
    }

    // 4) ratings
    const diffRows = new Map<string, any>(), chatRatingRows = new Map<string, any>(), eventRows: any[] = [];
    for (const e of pending) {
      if (e.type === 'difference_rating') {
        const rater = personas.get(e.from_slot), target = personas.get(e.to_slot);
        if (!(rater?.user_id && rater.opinion_id && target?.opinion_id)) continue;
        const v = Math.min(10, Math.max(0, Math.round(e.disagreement)));
        diffRows.set(`${rater.opinion_id}:${target.opinion_id}`, { topic_id: tid, rater_opinion_id: rater.opinion_id, target_opinion_id: target.opinion_id, disagreement: v, updated_at: at(e.t) });
        eventRows.push({ topic_id: tid, rater_id: rater.user_id, kind: 'difference', target_opinion_id: target.opinion_id, value: v, created_at: at(e.t) });
        animationEvents.push({ id: `difference:${cycle}:${e.t}:${rater.opinion_id}:${target.opinion_id}`, type: 'difference_rating', sourceOpinionId: rater.opinion_id, targetOpinionId: target.opinion_id, disagreement: v, t: e.t });
      } else if (e.type === 'rating') {
        const cid = chatMap[e.chat]; const rater = personas.get(e.from_slot), target = personas.get(e.to_slot);
        if (!(cid && rater?.user_id && target?.opinion_id && rater.opinion_id)) continue;
        const dis = Math.round(e.disagreement / 10), mc = ratingCount.get(e) ?? 0, key = `${cid}:${rater.user_id}:${mc}`;
        if (!chatRatingRows.has(key)) chatRatingRows.set(key, { chat_id: cid, rater_id: rater.user_id, empathy: e.respect, disagreement: dis, message_count: mc, created_at: at(e.t), updated_at: at(e.t) });
        eventRows.push(
          { topic_id: tid, rater_id: rater.user_id, kind: 'understanding', target_opinion_id: target.opinion_id, chat_id: cid, value: e.respect, created_at: at(e.t) },
          { topic_id: tid, rater_id: rater.user_id, kind: 'difference', target_opinion_id: target.opinion_id, chat_id: cid, value: dis, created_at: at(e.t) },
        );
        animationEvents.push({ id: `rating:${cycle}:${e.t}:${rater.opinion_id}:${target.opinion_id}`, type: 'rating', chatId: cid, sourceOpinionId: rater.opinion_id, targetOpinionId: target.opinion_id, respect: e.respect, t: e.t });
      }
    }
    await Promise.all([
      diffRows.size ? admin.from('opinion_ratings').upsert([...diffRows.values()], { onConflict: 'rater_opinion_id,target_opinion_id' }) : null,
      chatRatingRows.size ? admin.from('chat_ratings').upsert([...chatRatingRows.values()], { onConflict: 'chat_id,rater_id,message_count', ignoreDuplicates: true }) : null,
      eventRows.length ? admin.from('rating_events').insert(eventRows) : null,
    ]);

    if (pending.length) last = pending[pending.length - 1].t;
    const applied = pending.length;
    // Only animate the most recent moments; older catch-up is already state.
    animationEvents.sort((a, b) => (a.t as number) - (b.t as number));
    const recent = animationEvents.filter((ev) => (ev.t as number) >= frame - 60 * SPEED);
    await put(admin, 'sim_replay_cursor' + cfg.suffix, `${cycle}:${last}`);
    await put(admin, 'sim_replay_chats' + cfg.suffix, JSON.stringify(chatMap));
    return json({ cycle, frame, applied, cursor: last, events: recent });
  } finally {
    await admin.from('sim_state').update({ [cfg.lease]: null }).eq('id', 1);
  }
});
