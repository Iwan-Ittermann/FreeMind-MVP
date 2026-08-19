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
      .select('id, title, opinion_a_id, opinion_b_id')
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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    let title = '';

    if (apiKey) {
      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3.1-flash-lite',
          messages: [
            {
              role: 'system',
              content:
                'Du erfindest kreative deutsche NAMEN für Gespräche zwischen zwei Meinungen — keine Beschreibungen. ' +
                '2 bis 4 Wörter, griffig und bildhaft, gern metaphorisch oder als Duell-Name (z. B. "Kalter Kaffee", "Feuer trifft Wasser", "Klima-Poker"). ' +
                'Keine Anführungszeichen, kein Punkt am Ende, kein "vs.", keine Erklärung. Antworte nur mit dem Namen.',
            },

            {
              role: 'user',
              content: `Meinung A: ${textA}\n\nMeinung B: ${textB}`,
            },
          ],
        }),
      });

      if (aiRes.ok) {
        const json = await aiRes.json();
        title = (json?.choices?.[0]?.message?.content ?? '').trim().replace(/^["'„»]|["'“«.]$/g, '');
      } else {
        console.error('AI gateway error', aiRes.status, await aiRes.text());
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
