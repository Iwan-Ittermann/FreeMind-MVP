// Single source of truth for the dated campaign emails.
// Times are Berlin local (00:01) expressed as UTC instants (CEST = UTC+2).

export interface CampaignDef {
  key: string;
  label: string;
  /** ISO instant when this mail becomes due. Omitted = manual send only. */
  dueAt?: string;
  /**
   * Funnel nudge: audience is computed at send time from the user's progress.
   * `opinion` = registered but never posted an opinion; `rate` = has an opinion
   * but rated nothing; `chat` = rated but never wrote.
   * Runs on every scheduled invocation while the discussion phase is open.
   */
  nudge?: "opinion" | "rate" | "chat";
  /** Nudge only starts going out at this instant (scheduled runs skip it before). */
  startAt?: string;
}

export const CAMPAIGNS: CampaignDef[] = [
  // August 2026 event — finished. `dueAt` removed so new signups never receive
  // these mails retroactively; they can still be sent manually.
  { key: "campaign-soft-launch", label: "Soft launch (August, manuell)" },
  { key: "campaign-start", label: "Start today (August, manuell)" },
  { key: "campaign-final-day", label: "Final day (August, manuell)" },
  { key: "campaign-sogehts", label: "So geht's (manuell)" },

  // wedium x freemind live event, 10.–14.10.2026 (times = Berlin, CEST = UTC+2).
  { key: "campaign-wedium-sogehts", label: "wedium: So geht's (08.10.2026, 00:01)", dueAt: "2026-10-07T22:01:00Z" },
  { key: "campaign-wedium-start", label: "wedium: Es startet heute (10.10.2026, 00:01)", dueAt: "2026-10-09T22:01:00Z" },
  { key: "campaign-wedium-final-day", label: "wedium: Letzter Tag (14.10.2026, 00:01)", dueAt: "2026-10-13T22:01:00Z" },
  { key: "campaign-wedium-result", label: "wedium: Ergebnis & Danke (15.10.2026, 09:00)", dueAt: "2026-10-15T07:00:00Z" },

  // Activation mail for registered users without an opinion: first send 11.10. 08:30 Berlin.
  { key: "nudge-opinion", label: "Nudge: Meinung posten", nudge: "opinion", startAt: "2026-10-11T06:30:00Z" },
  { key: "nudge-rate", label: "Nudge: Bewerten", nudge: "rate" },
  { key: "nudge-chat", label: "Nudge: Diskutieren", nudge: "chat" },

];


export const CAMPAIGN_KEYS = CAMPAIGNS.map((c) => c.key);

export const NUDGE_KEYS = CAMPAIGNS.filter((c) => c.nudge).map((c) => c.key);

export function getCampaign(key: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.key === key);
}

