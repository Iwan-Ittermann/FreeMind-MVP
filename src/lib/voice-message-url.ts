import { supabase } from '@/integrations/supabase/client';

const BUCKET_MARKER = '/voice-messages/';
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extract the storage path from either a full Supabase public URL or a raw path.
 */
export function voiceStoragePath(audioUrl: string): string {
  const idx = audioUrl.indexOf(BUCKET_MARKER);
  return idx >= 0 ? audioUrl.substring(idx + BUCKET_MARKER.length) : audioUrl;
}

/**
 * Generate a short-lived signed URL for a stored voice message.
 * Cached in-memory for the lifetime of the tab (until near-expiry).
 */
export async function getVoiceSignedUrl(audioUrl: string): Promise<string | null> {
  const path = voiceStoragePath(audioUrl);
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expiresAt - now > 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from('voice-messages')
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expiresAt: now + 3600 * 1000 });
  return data.signedUrl;
}
