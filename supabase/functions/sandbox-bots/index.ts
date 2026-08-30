import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Playground bots (A / B / C).
 *
 * Idempotent: for every human opinion in the sandbox topic each bot
 *  - rates it with a strong disagreement, and
 *  - opens a chat and sends three intro messages.
 *
 * Works for two targets, both resolved from app_settings:
 *  - `sandbox` → the open sandbox question (/go)
 *  - `archive` → the reopened August question (/aug-test); there only opinions
 *    created after `archive_reopened_at` are touched, so the finished August
 *    discussion stays frozen.
 * It can never be pointed at the real event question.
 */

const SANDBOX_BOTS = [
  {
    id: '00000000-0000-0000-0000-0000000000b1',
    label: 'Bot A',
    opinion:
      'I am Bot A. Social media is toxic because outrage travels faster than nuance — and we all keep feeding it.',
    disagreement: 9,
    messages: [
      'Hi! I am Bot A — a bot, not a human.',
      'I strongly disagree with your opinion, on purpose: that is how you can see how the graph reacts.',
      'Reply if you like, then rate how respectful you found me. That rating is what earns bridge points.',
    ],
  },
  {
    id: '00000000-0000-0000-0000-0000000000b2',
    label: 'Bot B',
    opinion:
      'I am Bot B. It is not the platforms, it is us: we use them exactly as we secretly want to.',
    disagreement: 10,
    messages: [
      'Hey, Bot B here. Also a bot.',
      'I rated your opinion as very different from mine — feel free to disagree right back.',
      'Try the respect slider on this chat and watch your node move in the circle.',
    ],
  },
  {
    id: '00000000-0000-0000-0000-0000000000b3',
    label: 'Bot C',
    opinion:
      'I am Bot C. Social media is not toxic at all — people simply notice disagreement for the first time.',
    disagreement: 10,
    messages: [
      'Hello, I am Bot C. Bot A and Bot B are around too.',
      'We three disagree with everyone here — that keeps the sandbox lively.',
      'Send a message, rate the respect, and see what the graph does. Nothing here is permanent.',
    ],
  },
];

const ARCHIVE_BOTS = [
  {
    id: '00000000-0000-0000-0000-0000000000b1',
    label: 'Bot A',
    opinion:
      'I am Bot A. This question was settled in August — I still think the old answers were far too polite.',
    disagreement: 9,
    messages: [
      'Hi! I am Bot A — a bot, not a human.',
      'I strongly disagree with your opinion, on purpose: that is how you can see how the circle reacts.',
      'Reply if you like, then rate how respectful you found me. That rating is what earns bridge points.',
    ],
  },
  {
    id: '00000000-0000-0000-0000-0000000000b2',
    label: 'Bot B',
    opinion:
      'I am Bot B. Nothing said here changes anything — people only argue to feel right.',
    disagreement: 10,
    messages: [
      'Hey, Bot B here. Also a bot.',
      'I rated your opinion as very different from mine — feel free to disagree right back.',
      'Try the respect slider on this chat and watch your node move in the circle.',
    ],
  },
  {
    id: '00000000-0000-0000-0000-0000000000b3',
    label: 'Bot C',
    opinion:
      'I am Bot C. Everyone here already agrees with each other and just does not notice it.',
    disagreement: 10,
    messages: [
      'Hello, I am Bot C. Bot A and Bot B are around too.',
      'We three disagree with everyone here — that keeps this playground lively.',
      'Send a message, rate the respect, and see what the circle does. Nothing here is permanent.',
    ],
  },
];

const BOT_IDS = SANDBOX_BOTS.map((b) => b.id);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let target: 'sandbox' | 'archive' = 'sandbox';
    try {
      const body = await req.json();
      if (body?.target === 'archive') target = 'archive';
    } catch {
      /* no body → sandbox */
    }

    const settingKey =
      target === 'archive' ? 'archive_topic_short_code' : 'sandbox_topic_short_code';
    const BOTS = target === 'archive' ? ARCHIVE_BOTS : SANDBOX_BOTS;

    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', settingKey)
      .maybeSingle();
    const shortCode = (setting?.value ?? '').trim();
    if (!shortCode) return json({ error: `${target} not configured` }, 400);

    // Freeze line for the reopened archive: bots ignore everything older.
    let cutoff: string | null = null;
    let cutoffMs = 0;
    if (target === 'archive') {
      const { data: reopened } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'archive_reopened_at')
        .maybeSingle();
      cutoff = (reopened?.value ?? '').trim() || null;
      if (!cutoff) return json({ error: 'archive not reopened' }, 400);
      // Postgres text timestamps ("… 13:40:00+00") need the ISO separator.
      cutoffMs = new Date(cutoff.replace(' ', 'T')).getTime();
      if (Number.isNaN(cutoffMs)) return json({ error: 'invalid reopen timestamp' }, 400);
    }

    const { data: topic } = await supabase
      .from('topics')
      .select('id')
      .eq('short_code', shortCode)
      .maybeSingle();
    if (!topic) return json({ error: `${target} topic missing` }, 400);
    const topicId = topic.id as string;

    // All opinions in the target topic
    const { data: opinions, error: opErr } = await supabase
      .from('opinions')
      .select('id, user_id, visible, created_at')
      .eq('topic_id', topicId);
    if (opErr) throw opErr;

    // Ensure each bot has an opinion
    const botOpinionId = new Map<string, string>();
    for (const bot of BOTS) {
      const existing = (opinions ?? []).find((o) => o.user_id === bot.id);
      if (existing) {
        botOpinionId.set(bot.id, existing.id as string);
        continue;
      }
      const { data: inserted, error } = await supabase
        .from('opinions')
        .insert({
          topic_id: topicId,
          user_id: bot.id,
          text: bot.opinion,
          visible: true,
          status: 'Visible',
        })
        .select('id')
        .single();
      if (error) throw error;
      botOpinionId.set(bot.id, inserted.id as string);
    }

    const humans = (opinions ?? []).filter(
      (o) =>
        o.visible !== false &&
        !BOT_IDS.includes(o.user_id as string) &&
        // Archive: only opinions posted after the reopening are playground material.
        (!cutoff || new Date(String(o.created_at ?? 0)).getTime() >= cutoffMs),
    );
    if (humans.length === 0) return json({ ok: true, handled: 0 });

    let ratings = 0;
    let chats = 0;
    let messages = 0;

    for (const human of humans) {
      const humanOpinionId = human.id as string;

      for (const bot of BOTS) {
        const botOpId = botOpinionId.get(bot.id)!;

        // 1. Strong disagreement rating (bot → human)
        const { data: existingRating } = await supabase
          .from('opinion_ratings')
          .select('id')
          .eq('rater_opinion_id', botOpId)
          .eq('target_opinion_id', humanOpinionId)
          .maybeSingle();
        if (!existingRating) {
          const { error } = await supabase.from('opinion_ratings').insert({
            topic_id: topicId,
            rater_opinion_id: botOpId,
            target_opinion_id: humanOpinionId,
            disagreement: bot.disagreement,
          });
          if (!error) ratings++;
        }

        // 2. Accepted chat request so the edge shows up
        const { data: existingReq } = await supabase
          .from('chat_requests')
          .select('id')
          .eq('topic_id', topicId)
          .or(
            `and(requester_opinion_id.eq.${botOpId},target_opinion_id.eq.${humanOpinionId}),and(requester_opinion_id.eq.${humanOpinionId},target_opinion_id.eq.${botOpId})`,
          )
          .maybeSingle();
        if (!existingReq) {
          await supabase.from('chat_requests').insert({
            topic_id: topicId,
            requester_opinion_id: botOpId,
            target_opinion_id: humanOpinionId,
            status: 'accepted',
          });
        }

        // 3. Chat
        const { data: existingChat } = await supabase
          .from('chats')
          .select('id')
          .eq('topic_id', topicId)
          .or(
            `and(opinion_a_id.eq.${botOpId},opinion_b_id.eq.${humanOpinionId}),and(opinion_a_id.eq.${humanOpinionId},opinion_b_id.eq.${botOpId})`,
          )
          .maybeSingle();

        let chatId = existingChat?.id as string | undefined;
        if (!chatId) {
          const { data: created, error } = await supabase
            .from('chats')
            .insert({
              topic_id: topicId,
              opinion_a_id: botOpId,
              opinion_b_id: humanOpinionId,
              title: bot.label,
            })
            .select('id')
            .single();
          if (error) continue;
          chatId = created.id as string;
          chats++;
        }

        // 4. Three intro messages — only once per chat
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .eq('sender_id', bot.id);
        if ((count ?? 0) === 0) {
          const now = Date.now();
          const rows = bot.messages.map((content, i) => ({
            chat_id: chatId,
            sender_id: bot.id,
            content,
            created_at: new Date(now + i * 1000).toISOString(),
          }));
          const { error } = await supabase.from('chat_messages').insert(rows);
          if (!error) messages += rows.length;
        }
      }
    }

    return json({ ok: true, humans: humans.length, ratings, chats, messages });
  } catch (e) {
    console.error('sandbox-bots failed', e);
    return json({ error: (e as Error).message }, 500);
  }
});
