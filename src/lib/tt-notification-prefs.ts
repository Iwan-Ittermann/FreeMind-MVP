/**
 * Per-topic notification filter preferences.
 * Stored in localStorage so they survive page reloads.
 */

export interface NotificationFilters {
  newOpinion: boolean;
  newMessage: boolean;
  newChat: boolean;
  newTopic: boolean;
  newHighlight: boolean;
}

export interface TopicNotificationPrefs {
  enabled: boolean;
  filters: NotificationFilters;
}

const STORAGE_KEY = 'tt:notification-prefs';

const DEFAULT_FILTERS: NotificationFilters = {
  newOpinion: true,
  newMessage: true,
  newChat: true,
  newTopic: true,
  newHighlight: true,
};

function readAll(): Record<string, TopicNotificationPrefs> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, TopicNotificationPrefs>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPrefs(topicId: string): TopicNotificationPrefs | null {
  return readAll()[topicId] ?? null;
}

export function setPrefs(topicId: string, prefs: TopicNotificationPrefs) {
  const all = readAll();
  all[topicId] = prefs;
  writeAll(all);
}

export function removePrefs(topicId: string) {
  const all = readAll();
  delete all[topicId];
  writeAll(all);
}

export function isEnabled(topicId: string): boolean {
  return readAll()[topicId]?.enabled ?? false;
}

export function isFilterEnabled(topicId: string, filterKey: keyof NotificationFilters): boolean {
  const prefs = readAll()[topicId];
  if (!prefs?.enabled) return false;
  return prefs.filters[filterKey] ?? false;
}

export function getDefaultFilters(): NotificationFilters {
  return { ...DEFAULT_FILTERS };
}

/** Get all topic IDs that have notifications enabled. */
export function getSubscribedTopicIds(): string[] {
  const all = readAll();
  return Object.entries(all)
    .filter(([, p]) => p.enabled)
    .map(([id]) => id);
}
