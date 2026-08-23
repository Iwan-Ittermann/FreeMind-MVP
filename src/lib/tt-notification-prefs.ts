/**
 * Notification preferences.
 *
 * Single-topic build: prefs are stored as a flat object (no per-topic map).
 * The topicId argument on the getter/setter is kept for API compatibility.
 */

export interface NotificationFilters {
  newOpinion: boolean;
  newMessage: boolean;
  newChat: boolean;
  bridgePoints: boolean;
  newHighlight: boolean;
}

export interface TopicNotificationPrefs {
  enabled: boolean;
}

const TOPIC_STORAGE_KEY = 'tt:notification-prefs-flat';
const GLOBAL_FILTER_KEY = 'tt:notification-filters';

const DEFAULT_FILTERS: NotificationFilters = {
  newOpinion: true,
  newMessage: true,
  newChat: true,
  bridgePoints: true,
  newHighlight: true,
};


function readFlat(): TopicNotificationPrefs {
  try {
    return JSON.parse(localStorage.getItem(TOPIC_STORAGE_KEY) || '{"enabled":false}');
  } catch {
    return { enabled: false };
  }
}

function writeFlat(data: TopicNotificationPrefs) {
  localStorage.setItem(TOPIC_STORAGE_KEY, JSON.stringify(data));
}

export function getPrefs(_topicId?: string): TopicNotificationPrefs | null {
  return readFlat();
}

export function setPrefs(_topicId: string | undefined, prefs: TopicNotificationPrefs) {
  writeFlat(prefs);
}

export function removePrefs(_topicId?: string) {
  writeFlat({ enabled: false });
}

export function isEnabled(_topicId?: string): boolean {
  return readFlat().enabled;
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
 * Check if a filter is enabled, considering the subscription toggle
 * AND the global filter.
 */
export function isFilterEnabled(topicId: string, filterKey: keyof NotificationFilters): boolean {
  if (!isEnabled(topicId)) return false;
  return getGlobalFilters()[filterKey] ?? false;
}
