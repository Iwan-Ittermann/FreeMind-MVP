import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { password } = await req.json();
    if (typeof password !== "string" || !ADMIN_PASSWORD || !ctEq(password, ADMIN_PASSWORD)) {
      return Response.json({ ok: false, error: "invalid_password" }, { status: 401, headers: corsHeaders });
    }

    const { data: signups, error } = await supabase
      .from("signups")
      .select("id, email, created_at, confirmed_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return Response.json({ ok: true, signups: signups ?? [] }, { headers: corsHeaders });
  } catch (err) {
    console.error("admin2-overview error:", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500, headers: corsHeaders });
  }
});
