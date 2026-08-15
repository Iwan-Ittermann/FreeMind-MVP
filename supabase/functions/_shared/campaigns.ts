// Single source of truth for the dated campaign emails.
// Times are Berlin local (00:01) expressed as UTC instants (CEST = UTC+2).

export interface CampaignDef {
  key: string;
  label: string;
  /** ISO instant when this mail becomes due. Omitted = manual send only. */
  dueAt?: string;
}

export const CAMPAIGNS: CampaignDef[] = [
  { key: "campaign-prepare", label: "Prepare (19.08.2026, 00:01)", dueAt: "2026-08-18T22:01:00Z" },
  { key: "campaign-soft-launch", label: "Soft launch today (20.08.2026, 00:01)", dueAt: "2026-08-19T22:01:00Z" },
  { key: "campaign-start", label: "Start today! (23.08.2026, 00:01)", dueAt: "2026-08-22T22:01:00Z" },
  { key: "campaign-final-day", label: "Final day (29.08.2026, 00:01)", dueAt: "2026-08-28T22:01:00Z" },
  { key: "campaign-sogehts", label: "So geht's (manuell)" },
];

export const CAMPAIGN_KEYS = CAMPAIGNS.map((c) => c.key);

export function getCampaign(key: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.key === key);
}
