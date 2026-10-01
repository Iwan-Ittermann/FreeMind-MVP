// Simulation tick for /sim: one bundled LLM call per tick writes messages,
// ratings and occasionally activates a new persona. Self-invokes every ~8s
// with a hop budget (max 9 hops = 90s) and stops when sim_state.running_until
// has passed or a pause reason is set.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SIM_PERSONAS, SIM_TOPIC_TITLE } from '../_shared/sim-personas.ts';

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

const MAX_HOPS = 9;
const INITIAL_ACTIVE = 24;

type Admin = ReturnType<typeof createClient>;

interface PersonaRow {
  id: string;
  slot: number;
  name: string;
  persona: string;
  opinion_text: string;
  user_id: string | null;
  opinion_id: string | null;
  active: boolean;
}

async function getState(admin: Admin) {
  const { data } = await admin.from('sim_state').select('*').eq('id', 1).single();
  return data;
}

async function resolveSimTopicId(admin: Admin): Promise<string | null> {
  const { data: setting } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'sim_topic_short_code')
    .maybeSingle();
  const code = (setting?.value ?? '').trim();
  if (!code) return null;
  const { data: topic } = await admin
    .from('topics')
    .select('id')
    .eq('short_code', code)
    .maybeSingle();
  return topic?.id ?? null;
}

async function ensurePersonaUser(
  admin: Admin,
  topicId: string,
  persona: PersonaRow,
): Promise<{ userId: string; opinionId: string } | null> {
  let userId = persona.user_id;
  if (!userId) {
    const email = `sim+${String(persona.slot).padStart(2, '0')}@freemind.chat`;
    const password = `sim-${crypto.randomUUID()}`;
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { sim: true, demo_name: persona.name },
    });
    if (created?.user) {
      userId = created.user.id;
    } else {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    }
    if (!userId) return null;
    await admin.from('sim_personas').update({ user_id: userId }).eq('id', persona.id);
  }

  let opinionId = persona.opinion_id;
  if (!opinionId) {
    const { data: existing } = await admin
      .from('opinions')
      .select('id')
      .eq('topic_id', topicId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) {
      opinionId = existing.id;
    } else {
      const { data: inserted } = await admin
        .from('opinions')
        .insert({ topic_id: topicId, user_id: userId, text: persona.opinion_text, visible: true })
        .select('id')
        .single();
      opinionId = inserted?.id ?? null;
    }
    if (!opinionId) return null;
    await admin
      .from('sim_personas')
      .update({ opinion_id: opinionId, active: true })
      .eq('id', persona.id);
  }
  return { userId, opinionId };
}

/** Idempotent one-time setup: topic, persona rows, first batch of users. */
async function ensureSeeded(admin: Admin): Promise<string | null> {
  let topicId = await resolveSimTopicId(admin);

  const { count } = await admin
    .from('sim_personas')
    .select('id', { count: 'exact', head: true });
  if (!count) {
    await admin.from('sim_personas').insert(
      SIM_PERSONAS.map((p) => ({
        slot: p.slot,
        name: p.name,
        persona: p.persona,
        opinion_text: p.opinion,
      })),
    );
  }

  if (!topicId) {
    const { data: topic } = await admin
      .from('topics')
      .insert({ title: SIM_TOPIC_TITLE, is_active: true, status: 'Active', url_slug: 'sim', short_code: 'sim1' })
      .select('id, short_code')
      .single();
    if (!topic) return null;
    topicId = topic.id;
    await admin
      .from('app_settings')
      .upsert({ key: 'sim_topic_short_code', value: topic.short_code }, { onConflict: 'key' });
  }

  // Activate the initial batch of personas (users + opinions).
  const { data: personas } = await admin
    .from('sim_personas')
    .select('*')
    .order('slot', { ascending: true });
  const rows = (personas ?? []) as PersonaRow[];
  const toActivate = rows.filter((p) => p.slot < INITIAL_ACTIVE && !p.active);
  for (const p of toActivate) {
    await ensurePersonaUser(admin, topicId!, p);
  }
  return topicId;
}

interface LlmExchange {
  pair: [number, number];
  messages: { from: number; text: string }[];
  rating_a: { empathy: number; disagreement: number };
  rating_b: { empathy: number; disagreement: number };
}

interface LlmResult {
  exchanges?: LlmExchange[];
  new_opinion?: { slot: number; text: string };
}

async function callLlm(apiKey: string, prompt: string): Promise<LlmResult | { error: string; status: number }> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Lovable-AIG-SDK': 'fetch',
    },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra',
      stream: true,
      store: false,
      reasoning: { effort: 'low', summary: 'auto' },
      include: ['reasoning.encrypted_content'],
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'sim_tick',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['exchanges', 'new_opinion'],
            properties: {
              exchanges: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['pair', 'messages', 'rating_a', 'rating_b'],
                  properties: {
                    pair: { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 2 },
                    messages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['from', 'text'],
                        properties: {
                          from: { type: 'integer' },
                          text: { type: 'string' },
                        },
                      },
                    },
                    rating_a: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['empathy', 'disagreement'],
                      properties: {
                        empathy: { type: 'integer', minimum: 0, maximum: 10 },
                        disagreement: { type: 'integer', minimum: 0, maximum: 10 },
                      },
                    },
                    rating_b: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['empathy', 'disagreement'],
                      properties: {
                        empathy: { type: 'integer', minimum: 0, maximum: 10 },
                        disagreement: { type: 'integer', minimum: 0, maximum: 10 },
                      },
                    },
                  },
                },
              },
              new_opinion: {
                type: ['object', 'null'],
                additionalProperties: false,
                required: ['slot', 'text'],
                properties: {
                  slot: { type: 'integer' },
                  text: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    return { error: `llm-${res.status}`, status: res.status };
  }

  // Consume the SSE stream and collect the final output text.
  const reader = res.body?.getReader();
  if (!reader) return { error: 'llm-no-body', status: 500 };
  const decoder = new TextDecoder();
  let buffer = '';
  let outputText = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
          outputText += evt.delta;
        } else if (evt.type === 'response.completed') {
          const out = evt.response?.output ?? [];
          for (const item of out) {
            for (const part of item?.content ?? []) {
              if (part?.type === 'output_text' && typeof part.text === 'string' && !outputText) {
                outputText = part.text;
              }
            }
          }
        }
      } catch {
        /* ignore partial chunks */
      }
    }
  }

  try {
    return JSON.parse(outputText) as LlmResult;
  } catch {
    return { error: 'llm-parse', status: 500 };
  }
}

const clamp10 = (v: unknown) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = (await req.json().catch(() => ({}))) as { hop?: number };
    const hop = Math.max(0, Math.min(MAX_HOPS - 1, Number(body.hop) || 0));

    const state = await getState(admin);
    if (!state?.running_until || new Date(state.running_until).getTime() <= Date.now()) {
      return json({ ok: true, stopped: 'expired' });
    }
    if (state.paused_reason) {
      return json({ ok: true, stopped: 'paused', reason: state.paused_reason });
    }

    // Single-flight lease: only one tick may run at a time.
    const { data: leaseRows } = await admin
      .from('sim_state')
      .update({ lease_expires_at: new Date(Date.now() + 25_000).toISOString() })
      .eq('id', 1)
      .or(`lease_expires_at.is.null,lease_expires_at.lt.${new Date().toISOString()}`)
      .select('id');
    if (!leaseRows || leaseRows.length === 0) {
      return json({ ok: true, stopped: 'lease-held' });
    }

    const topicId = await ensureSeeded(admin);
    if (!topicId) return json({ error: 'seed-failed' }, 500);

    const { data: personaRows } = await admin
      .from('sim_personas')
      .select('*')
      .eq('active', true)
      .order('slot', { ascending: true });
    const personas = (personaRows ?? []) as PersonaRow[];
    if (personas.length < 4) return json({ error: 'not-enough-personas' }, 500);

    // Pick 3 pairs deterministically by hop: rotate through active personas,
    // prefer cross-camp pairs (slot % 4 differs).
    const pairs: [PersonaRow, PersonaRow][] = [];
    const used = new Set<number>();
    for (let k = 0; k < 3; k++) {
      const i = (hop * 3 + k * 7) % personas.length;
      let j = (i + 1 + ((hop + k) % (personas.length - 1))) % personas.length;
      if (j === i) j = (j + 1) % personas.length;
      const a = personas[i];
      const b = personas[j];
      const key = [Math.min(a.slot, b.slot), Math.max(a.slot, b.slot)].join('|');
      if (used.has(key) || !a.user_id || !b.user_id || !a.opinion_id || !b.opinion_id) continue;
      used.add(key);
      pairs.push([a, b]);
    }
    if (pairs.length === 0) return json({ ok: true, stopped: 'no-pairs' });

    // Recent context per pair.
    const pairContexts: string[] = [];
    const chatIds: (string | null)[] = [];
    for (const [a, b] of pairs) {
      const { data: chat } = await admin
        .from('chats')
        .select('id')
        .eq('topic_id', topicId)
        .or(
          `and(opinion_a_id.eq.${a.opinion_id},opinion_b_id.eq.${b.opinion_id}),and(opinion_a_id.eq.${b.opinion_id},opinion_b_id.eq.${a.opinion_id})`,
        )
        .maybeSingle();
      let chatId = chat?.id ?? null;
      let history = '';
      if (chatId) {
        const { data: msgs } = await admin
          .from('chat_messages')
          .select('sender_id, content')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(4);
        history = (msgs ?? [])
          .reverse()
          .map((m) => {
            const who = m.sender_id === a.user_id ? a.name : b.name;
            return `${who}: ${m.content}`;
          })
          .join('\n');
      }
      chatIds.push(chatId);
      pairContexts.push(
        `Paar [${a.slot},${b.slot}] ${a.name} (${a.persona}) und ${b.name} (${b.persona}).\nMeinung ${a.name}: „${a.opinion_text}"\nMeinung ${b.name}: „${b.opinion_text}"\nBisheriger Verlauf:\n${history || '(noch kein Gespräch)'}`,
      );
    }

    const inactive = SIM_PERSONAS.filter(
      (p) => !personas.some((r) => r.slot === p.slot),
    );
    const mayAddOpinion = inactive.length > 0 && hop % 3 === 2;

    const prompt = `Du simulierst eine Online-Diskussion zum Thema „${SIM_TOPIC_TITLE}".
Schreibe für jedes der folgenden Paare einen kurzen, realistischen Dialogwechsel (2-4 Nachrichten, je 1-3 Sätze, deutsch, im Stil der beschriebenen Personen). Die Personen sollen echt wirken: zuhören, widersprechen, aufeinander eingehen.
Bewerte danach für jede Seite: empathy (0-10, wie respektvoll/verständnisvoll empfand diese Seite die andere) und disagreement (0-10, wie groß die inhaltliche Differenz ist).
${mayAddOpinion ? `Zusätzlich darf eine neue Person der Diskussion beitreten. Wähle genau einen Slot aus [${inactive.map((p) => p.slot).join(', ')}] und schreibe deren Meinung (1-2 Sätze). Wenn niemand beitritt, setze new_opinion auf null.` : 'Setze new_opinion auf null.'}

${pairContexts.join('\n\n')}`;

    const apiKey = Deno.env.get('LOVABLE_API_KEY') ?? '';
    if (!apiKey) {
      await admin.from('sim_state').update({ paused_reason: 'no-api-key', running_until: null }).eq('id', 1);
      return json({ error: 'no-api-key' }, 500);
    }

    const result = await callLlm(apiKey, prompt);
    if ('error' in result) {
      if (result.status === 402 || result.status === 403) {
        await admin
          .from('sim_state')
          .update({ paused_reason: result.error, running_until: null })
          .eq('id', 1);
        return json({ ok: true, stopped: 'paused', reason: result.error });
      }
      // 429/5xx/parse errors: skip this hop, chain continues.
      console.error('sim-tick llm error', result.error);
    } else {
      // Write exchanges.
      for (let idx = 0; idx < pairs.length; idx++) {
        const ex = result.exchanges?.[idx];
        if (!ex) continue;
        const [a, b] = pairs[idx];
        let chatId = chatIds[idx];
        if (!chatId) {
          const { data: inserted } = await admin
            .from('chats')
            .insert({ topic_id: topicId, opinion_a_id: a.opinion_id!, opinion_b_id: b.opinion_id! })
            .select('id')
            .single();
          chatId = inserted?.id ?? null;
        }
        if (!chatId) continue;

        let msgCount = 0;
        for (const m of ex.messages ?? []) {
          const sender = m.from === a.slot ? a : m.from === b.slot ? b : null;
          if (!sender?.user_id || !m.text) continue;
          await admin.from('chat_messages').insert({
            chat_id: chatId,
            sender_id: sender.user_id,
            content: String(m.text).slice(0, 2000),
          });
          msgCount++;
        }

        // Mutual ratings (chat_ratings + rating_events for the points graph).
        const ratings = [
          { rater: a, target: b, r: ex.rating_a },
          { rater: b, target: a, r: ex.rating_b },
        ];
        for (const { rater, target, r } of ratings) {
          if (!r) continue;
          const empathy = clamp10(r.empathy);
          const disagreement = clamp10(r.disagreement);
          await admin.from('chat_ratings').upsert(
            {
              chat_id: chatId,
              rater_id: rater.user_id!,
              empathy,
              disagreement,
              message_count: msgCount,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'chat_id,rater_id' },
          );
          await admin.from('rating_events').insert([
            {
              topic_id: topicId,
              rater_id: rater.user_id!,
              kind: 'understanding',
              target_opinion_id: target.opinion_id!,
              chat_id: chatId,
              value: empathy,
            },
            {
              topic_id: topicId,
              rater_id: rater.user_id!,
              kind: 'difference',
              target_opinion_id: target.opinion_id!,
              chat_id: chatId,
              value: disagreement,
            },
          ]);
          await admin.from('opinion_ratings').upsert(
            {
              topic_id: topicId,
              rater_opinion_id: rater.opinion_id!,
              target_opinion_id: target.opinion_id!,
              disagreement,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'rater_opinion_id,target_opinion_id' },
          );
        }
      }

      // Occasionally a new persona joins.
      const no = result.new_opinion;
      if (no && typeof no.slot === 'number' && no.text) {
        const persona = inactive.find((p) => p.slot === no.slot);
        if (persona) {
          const { data: row } = await admin
            .from('sim_personas')
            .select('*')
            .eq('slot', persona.slot)
            .single();
          if (row && !row.active) {
            await admin
              .from('sim_personas')
              .update({ opinion_text: String(no.text).slice(0, 500) })
              .eq('id', row.id);
            await ensurePersonaUser(admin, topicId, { ...row, opinion_text: String(no.text).slice(0, 500) });
          }
        }
      }
    }

    // Chain the next hop after ~8s if time remains.
    const fresh = await getState(admin);
    const remaining = fresh?.running_until
      ? new Date(fresh.running_until).getTime() - Date.now()
      : 0;
    if (hop + 1 < MAX_HOPS && remaining > 12_000 && !fresh?.paused_reason) {
      const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sim-tick`;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const next = async () => {
        await new Promise((r) => setTimeout(r, 8_000));
        try {
          await fetch(selfUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ hop: hop + 1 }),
          });
        } catch (e) {
          console.error('sim-tick self-invoke failed', e);
          await admin
            .from('sim_state')
            .update({ paused_reason: 'chain-broken', running_until: null })
            .eq('id', 1);
        }
      };
      const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } })
        .EdgeRuntime;
      if (edgeRuntime) edgeRuntime.waitUntil(next());
      else await next();
    }

    return json({ ok: true, hop });
  } catch (e) {
    console.error('sim-tick failed', e);
    return json({ error: 'unexpected' }, 500);
  }
});
