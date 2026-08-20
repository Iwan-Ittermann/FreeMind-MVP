// Single source of truth for the dated campaign emails.
// Times are Berlin local (00:01) expressed as UTC instants (CEST = UTC+2).

export interface CampaignDef {
  key: string;
  label: string;
  /** ISO instant when this mail becomes due. Omitted = manual send only. */
  dueAt?: string;
  /**
   * Funnel nudge: audience is computed at send time from the user's progress.
   * `rate` = has an opinion but rated nothing; `chat` = rated but never wrote.
   * Runs on every scheduled invocation while the discussion phase is open.
   */
  nudge?: "rate" | "chat";
}

export const CAMPAIGNS: CampaignDef[] = [
  { key: "campaign-soft-launch", label: "Soft launch today (20.08.2026, 00:01)", dueAt: "2026-08-19T22:01:00Z" },
  { key: "campaign-start", label: "Start today! (23.08.2026, 00:01)", dueAt: "2026-08-22T22:01:00Z" },
  { key: "campaign-final-day", label: "Final day (29.08.2026, 00:01)", dueAt: "2026-08-28T22:01:00Z" },
  { key: "campaign-sogehts", label: "So geht's (manuell)" },
  { key: "nudge-rate", label: "Nudge: Bewerten", nudge: "rate" },
  { key: "nudge-chat", label: "Nudge: Diskutieren", nudge: "chat" },
];

export const CAMPAIGN_KEYS = CAMPAIGNS.map((c) => c.key);

export const NUDGE_KEYS = CAMPAIGNS.filter((c) => c.nudge).map((c) => c.key);

export function getCampaign(key: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.key === key);
}

