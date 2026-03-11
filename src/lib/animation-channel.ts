/**
 * Shared animation channel registry.
 * useTopicData registers the subscribed broadcast channel;
 * useChatMessages retrieves it to send animations without creating ephemeral channels.
 */
import { RealtimeChannel } from '@supabase/supabase-js';

const channels = new Map<string, RealtimeChannel>();

export function setAnimationChannel(topicId: string, channel: RealtimeChannel) {
  channels.set(topicId, channel);
}

export function removeAnimationChannel(topicId: string) {
  channels.delete(topicId);
}

export function getAnimationChannel(topicId: string): RealtimeChannel | undefined {
  return channels.get(topicId);
}
