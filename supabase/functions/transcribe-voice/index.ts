import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();
    if (!messageId) throw new Error("messageId is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get the message with audio_url
    const { data: message, error: msgError } = await supabase
      .from("chat_messages")
      .select("audio_url")
      .eq("id", messageId)
      .single();

    if (msgError || !message?.audio_url) {
      throw new Error("Message not found or no audio URL");
    }

    // 2. Download the audio file via storage API (bucket is private)
    const marker = "/voice-messages/";
    const idx = message.audio_url.indexOf(marker);
    const storagePath = idx >= 0
      ? message.audio_url.substring(idx + marker.length)
      : message.audio_url;
    const { data: audioBlob, error: dlError } = await supabase.storage
      .from("voice-messages")
      .download(storagePath);
    if (dlError || !audioBlob) throw new Error("Failed to download audio");
    const audioBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = "";
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const audioBase64 = btoa(binary);

    // 3. Send to Lovable AI (Gemini) for transcription
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a transcription assistant. Transcribe the audio accurately. Return ONLY the transcription text, nothing else. If you cannot understand the audio or it's empty/silent, return '[inaudible]'. Transcribe in the language spoken.",
            },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: audioBase64,
                    format: "webm",
                  },
                },
                {
                  type: "text",
                  text: "Please transcribe this audio message.",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI transcription failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const transcript =
      aiData.choices?.[0]?.message?.content?.trim() || "[inaudible]";

    // 4. Update the message with transcript
    const { error: updateError } = await supabase
      .from("chat_messages")
      .update({ transcript, content: transcript })
      .eq("id", messageId);

    if (updateError) {
      console.error("Failed to update transcript:", updateError);
      throw new Error("Failed to save transcript");
    }

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-voice error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
