// Mails of the wedium x freemind live event (10.–14.10.2026).
// Separate from the old freemind campaigns: recipients live in
// public.wedium_signups, sends are logged in public.wedium_campaign_sends.

export interface WediumCampaignDef {
  key: string;
  label: string;
  /** ISO instant when this mail becomes due (Berlin local, CEST = UTC+2). */
  dueAt?: string;
  /** Funnel nudge stage, audience computed at send time. */
  nudge?: "opinion" | "rate" | "chat";
  /** Nudges only start going out at this instant. */
  startAt?: string;
}

export const WEDIUM_CAMPAIGNS: WediumCampaignDef[] = [
  { key: "campaign-wedium-sogehts", label: "wedium: So geht's (08.10.2026, 00:01)", dueAt: "2026-10-07T22:01:00Z" },
  { key: "campaign-wedium-start", label: "wedium: Es startet heute (10.10.2026, 00:01)", dueAt: "2026-10-09T22:01:00Z" },
  { key: "campaign-wedium-final-day", label: "wedium: Letzter Tag (14.10.2026, 00:01)", dueAt: "2026-10-13T22:01:00Z" },
  { key: "campaign-wedium-result", label: "wedium: Ergebnis & Danke (15.10.2026, 09:00)", dueAt: "2026-10-15T07:00:00Z" },

  { key: "wedium-nudge-opinion", label: "wedium Nudge: Meinung posten", nudge: "opinion", startAt: "2026-10-11T06:30:00Z" },
  { key: "wedium-nudge-rate", label: "wedium Nudge: Bewerten", nudge: "rate", startAt: "2026-10-11T06:30:00Z" },
  { key: "wedium-nudge-chat", label: "wedium Nudge: Diskutieren", nudge: "chat", startAt: "2026-10-11T06:30:00Z" },
];

export const WEDIUM_NUDGE_KEYS = WEDIUM_CAMPAIGNS.filter((c) => c.nudge).map((c) => c.key);

export function getWediumCampaign(key: string): WediumCampaignDef | undefined {
  return WEDIUM_CAMPAIGNS.find((c) => c.key === key);
}
