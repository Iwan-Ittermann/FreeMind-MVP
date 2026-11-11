import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Returns the verified caller's user id, or null when the request has no valid session. */
export async function requireUser(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : data.user.id;
}
