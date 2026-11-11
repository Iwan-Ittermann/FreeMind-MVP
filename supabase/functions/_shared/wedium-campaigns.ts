// Mails of the wedium x freemind live event (12.–15.11.2026).
// Separate from the old freemind campaigns: recipients live in
// public.wedium_signups, sends are logged in public.wedium_campaign_sends.

export interface WediumCampaignDef {
  key: string;
  label: string;
  /** ISO instant when this mail becomes due (Berlin local; CET = UTC+1 after 25.10.). */
  dueAt?: string;
  /** Funnel nudge stage, audience computed at send time. */
  nudge?: "opinion" | "rate" | "chat";
  /** Nudges only start going out at this instant. */
  startAt?: string;
}

export const WEDIUM_CAMPAIGNS: WediumCampaignDef[] = [
  { key: "campaign-wedium-sogehts", label: "wedium: So geht's (10.11.2026, 00:01)", dueAt: "2026-11-09T23:01:00Z" },
  { key: "campaign-wedium-softlaunch", label: "wedium: Soft Launch (11.11.2026, 19:00)", dueAt: "2026-11-11T18:00:00Z" },
  { key: "campaign-wedium-start", label: "wedium: Es startet heute (12.11.2026, 00:01)", dueAt: "2026-11-11T23:01:00Z" },
  { key: "campaign-wedium-final-day", label: "wedium: Letzter Tag (15.11.2026, 00:01)", dueAt: "2026-11-14T23:01:00Z" },
  { key: "campaign-wedium-result", label: "wedium: Ergebnis & Danke (16.11.2026, 09:00)", dueAt: "2026-11-16T08:00:00Z" },

  { key: "wedium-nudge-opinion", label: "wedium Nudge: Meinung posten", nudge: "opinion", startAt: "2026-11-13T06:30:00Z" },
  { key: "wedium-nudge-rate", label: "wedium Nudge: Bewerten", nudge: "rate", startAt: "2026-11-13T06:30:00Z" },
  { key: "wedium-nudge-chat", label: "wedium Nudge: Diskutieren", nudge: "chat", startAt: "2026-11-13T06:30:00Z" },
];

export const WEDIUM_NUDGE_KEYS = WEDIUM_CAMPAIGNS.filter((c) => c.nudge).map((c) => c.key);

export function getWediumCampaign(key: string): WediumCampaignDef | undefined {
  return WEDIUM_CAMPAIGNS.find((c) => c.key === key);
}
