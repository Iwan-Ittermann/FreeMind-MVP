import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId } = await req.json();
    if (!chatId) {
      return new Response(JSON.stringify({ error: 'chatId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, title, topic_id, opinion_a_id, opinion_b_id')
      .eq('id', chatId)
      .maybeSingle();

    if (chatError) throw chatError;
    if (!chat) {
      return new Response(JSON.stringify({ error: 'chat not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (chat.title) {
      return new Response(JSON.stringify({ title: chat.title }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: opinions, error: opinionsError } = await supabase
      .from('opinions')
      .select('id, text')
      .in('id', [chat.opinion_a_id, chat.opinion_b_id]);
    if (opinionsError) throw opinionsError;

    const textA = opinions?.find((o) => o.id === chat.opinion_a_id)?.text ?? '';
    const textB = opinions?.find((o) => o.id === chat.opinion_b_id)?.text ?? '';

    // Names already used in this topic — the model must clearly differ from them.
    const { data: siblings } = await supabase
      .from('chats')
      .select('title')
      .eq('topic_id', chat.topic_id)
      .not('title', 'is', null)
      .limit(200);
    const usedTitles = (siblings ?? [])
      .map((r) => (r.title ?? '').trim())
      .filter(Boolean);

    const norm = (s: string) =>
      s.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const usedNorm = new Set(usedTitles.map(norm));
    const usedWords = new Set(usedTitles.flatMap((tl) => norm(tl).split(' ')).filter((w) => w.length > 3));

    const tooSimilar = (candidate: string) => {
      const n = norm(candidate);
      if (!n) return true;
      if (usedNorm.has(n)) return true;
      const words = n.split(' ').filter((w) => w.length > 3);
      return words.length > 0 && words.every((w) => usedWords.has(w));
    };

    // Rotating style hint keyed off the chat id → variety without randomness drift.
    const STYLES = [
      'eine überraschende Metapher aus der Natur',
      'ein Wortspiel',
      'ein Duell-Name wie bei einem Boxkampf',
      'ein Bild aus Technik oder Maschinen',
      'ein Bild aus dem Alltag oder der Küche',
      'ein Filmtitel-artiger Name',
      'ein Bild aus Wetter oder Jahreszeiten',
      'ein Bild aus Musik oder Tanz',
    ];
    let hash = 0;
    for (let i = 0; i < chatId.length; i++) hash = (Math.imul(31, hash) + chatId.charCodeAt(i)) | 0;
    const style = STYLES[Math.abs(hash) % STYLES.length];

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    let title = '';

    const askAI = async (avoidExtra: string[]) => {
      const avoid = [...usedTitles, ...avoidExtra].slice(-40);
      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-lite',
          temperature: 1.1,
          messages: [
            {
              role: 'system',
              content:
                'Du erfindest kreative deutsche NAMEN für Gespräche zwischen zwei Meinungen — keine Beschreibungen. ' +
                '2 bis 4 Wörter, griffig und bildhaft. Sei eigenwillig und konkret, vermeide Floskeln. ' +
                'Keine Anführungszeichen, kein Punkt am Ende, kein "vs.", keine Erklärung. Antworte nur mit dem Namen.',
            },
            {
              role: 'user',
              content:
                `Meinung A: ${textA}\n\nMeinung B: ${textB}\n\n` +
                `Stilrichtung für diesen Namen: ${style}.\n` +
                (avoid.length
                  ? `Diese Namen sind schon vergeben — dein Name muss sich klar davon unterscheiden (andere Wörter, anderes Bild):\n${avoid.map((x) => `- ${x}`).join('\n')}`
                  : ''),
            },
          ],
        }),
      });

      if (!aiRes.ok) {
        console.error('AI gateway error', aiRes.status, await aiRes.text());
        return '';
      }
      const json = await aiRes.json();
      return (json?.choices?.[0]?.message?.content ?? '').trim().replace(/^["'„»]|["'“«.]$/g, '');
    };

    if (apiKey) {
      title = await askAI([]);
      if (title && tooSimilar(title)) {
        const retry = await askAI([title]);
        if (retry && !tooSimilar(retry)) title = retry;
        else if (retry) title = retry;
      }
    }

    if (!title) {
      // Deterministic fallback: first few words of each opinion.
      const shorten = (s: string) => s.trim().split(/\s+/).slice(0, 3).join(' ');
      title = `${shorten(textA)} vs. ${shorten(textB)}`;
    }
    title = title.slice(0, 60);


    const { error: updateError } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId)
      .is('title', null);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-chat-title failed', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
