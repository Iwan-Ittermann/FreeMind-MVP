// Open-tracking pixel for campaign emails.
// Public by design: mail clients fetch it without any auth.
// GET /email-open?c=<campaign_key>&s=<signup_id> -> transparent 1x1 GIF.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// 1x1 transparent GIF
const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^(campaign|wedium)-[a-z-]{1,40}$/;


function pixelResponse() {
  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const campaignKey = url.searchParams.get("c") ?? "";
    const signupId = url.searchParams.get("s") ?? "";
    // ?w=1 marks the separate wedium participant list.
    const table = url.searchParams.get("w") === "1" ? "wedium_campaign_sends" : "campaign_sends";

    if (KEY_RE.test(campaignKey) && UUID_RE.test(signupId)) {
      const { data: row } = await supabase
        .from(table)
        .select("id, opened_at, open_count")
        .eq("campaign_key", campaignKey)
        .eq("signup_id", signupId)
        .maybeSingle();

      if (row) {
        await supabase
          .from(table)
          .update({
            opened_at: row.opened_at ?? new Date().toISOString(),
            open_count: (row.open_count ?? 0) + 1,
          })
          .eq("id", row.id);
      }
    }

  } catch (err) {
    console.error("email-open error:", err);
  }

  return pixelResponse();
});
