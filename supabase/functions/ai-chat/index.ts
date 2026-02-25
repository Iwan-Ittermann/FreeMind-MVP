import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOT_USER_ID = "00000000-0000-0000-0000-0000000000a1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId } = await req.json();
    if (!chatId) throw new Error("chatId is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Read system prompt from app_settings
    const { data: promptSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_bot_system_prompt")
      .single();

    const systemPrompt =
      promptSetting?.value ||
      "You are a helpful AI assistant participating in a discussion forum. Be concise, respectful, and encourage constructive dialogue.";

    // 2. Read chat history
    const { data: messages, error: msgError } = await supabase
      .from("chat_messages")
      .select("sender_id, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (msgError) throw msgError;

    // 3. Map to OpenAI format
    const chatMessages = (messages || []).map((m: any) => ({
      role: m.sender_id === BOT_USER_ID ? "assistant" : "user",
      content: m.content,
    }));

    // 4. Call Lovable AI gateway
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...chatMessages,
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const reply =
      aiResult.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // 5. Insert bot reply
    const { error: insertError } = await supabase.rpc("insert_bot_message", {
      _chat_id: chatId,
      _content: reply,
    });

    if (insertError) {
      console.error("Failed to insert bot message:", insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
