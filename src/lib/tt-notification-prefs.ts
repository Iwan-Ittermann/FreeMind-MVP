/**
 * Notification preferences.
 *
 * - Per-topic: only an enabled boolean (left bell toggles subscription).
 * - Global: filter toggles (which kinds of notifications to receive).
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
}

const TOPIC_STORAGE_KEY = 'tt:notification-prefs';
const GLOBAL_FILTER_KEY = 'tt:notification-filters';

const DEFAULT_FILTERS: NotificationFilters = {
  newOpinion: true,
  newMessage: true,
  newChat: true,
  newTopic: true,
  newHighlight: true,
};

// ── Per-topic helpers (enabled/disabled) ──

function readAllTopics(): Record<string, TopicNotificationPrefs> {
  try {
    return JSON.parse(localStorage.getItem(TOPIC_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAllTopics(data: Record<string, TopicNotificationPrefs>) {
  localStorage.setItem(TOPIC_STORAGE_KEY, JSON.stringify(data));
}

export function getPrefs(topicId: string): TopicNotificationPrefs | null {
  return readAllTopics()[topicId] ?? null;
}

export function setPrefs(topicId: string, prefs: TopicNotificationPrefs) {
  const all = readAllTopics();
  all[topicId] = prefs;
  writeAllTopics(all);
}

export function removePrefs(topicId: string) {
  const all = readAllTopics();
  delete all[topicId];
  writeAllTopics(all);
}

export function isEnabled(topicId: string): boolean {
  return readAllTopics()[topicId]?.enabled ?? false;
}

/** Get all topic IDs that have notifications enabled. */
export function getSubscribedTopicIds(): string[] {
  const all = readAllTopics();
  return Object.entries(all)
    .filter(([, p]) => p.enabled)
    .map(([id]) => id);
}

// ── Global filter helpers ──

export function getGlobalFilters(): NotificationFilters {
  try {
    const raw = localStorage.getItem(GLOBAL_FILTER_KEY);
    if (raw) return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_FILTERS };
}

export function setGlobalFilters(filters: NotificationFilters) {
  localStorage.setItem(GLOBAL_FILTER_KEY, JSON.stringify(filters));
}

export function getDefaultFilters(): NotificationFilters {
  return { ...DEFAULT_FILTERS };
}

/**
 * Check if a specific filter is enabled, considering both
 * per-topic subscription AND global filter.
 */
export function isFilterEnabled(topicId: string, filterKey: keyof NotificationFilters): boolean {
  if (!isEnabled(topicId)) return false;
  return getGlobalFilters()[filterKey] ?? false;
}
