// Public counter for the /gutefrage landing page. Returns aggregate numbers
// only — never any email addresses.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

export const GUTEFRAGE_GOAL = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const [{ count }, { data: setting }] = await Promise.all([
      supabase
        .from("gutefrage_signups")
        .select("id", { count: "exact", head: true })
        .not("confirmed_at", "is", null),
      supabase.from("app_settings").select("value").eq("key", "gutefrage_event_date").maybeSingle(),
    ]);

    return Response.json(
      {
        confirmed: count ?? 0,
        goal: GUTEFRAGE_GOAL,
        eventDate: (setting?.value ?? "").trim() || null,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("gutefrage-stats error:", err);
    return Response.json({ confirmed: 0, goal: GUTEFRAGE_GOAL, eventDate: null }, { headers: corsHeaders });
  }
});
