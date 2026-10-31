import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Signup = {
  id: string;
  email: string;
  created_at: string;
  confirmed_at: string | null;
  passphrase: string | null;
};

type Template = {
  key: string;
  subject: string;
  heading: string;
  body_md: string;
  updated_at?: string;
};

type Ban = { email: string; banned_at: string; reason: string | null };

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

type TemplateMeta = { label: string; trigger: string; placeholders: string; campaign?: boolean };

const TEMPLATE_META: Record<string, TemplateMeta> = {
  "wedium-signup-confirm": {
    label: "1. Verifizierung (Bestätigungslink)",
    trigger: "Sofort nach Anmeldung auf /wedium",
    placeholders: "{{confirmUrl}}",
  },
  "wedium-signup-welcome": {
    label: "2. Willkommen (mit Passphrase)",
    trigger: "Nach Bestätigung des Links",
    placeholders: "{{passphrase}}, {{goUrl}}, {{wediumUrl}}, {{appUrl}}, {{faqUrl}}",
  },
  "campaign-wedium-sogehts": {
    label: "3. So geht's",
    trigger: "10.11.2026, 00:01",
    placeholders: "{{sogehtsUrl}}, {{goUrl}}, {{appUrl}}, {{faqUrl}}, {{passphrase}}",
    campaign: true,
  },
  "campaign-wedium-start": {
    label: "4. Es startet heute",
    trigger: "12.11.2026, 00:01",
    placeholders: "{{passphrase}}, {{goUrl}}, {{appUrl}}, {{faqUrl}}",
    campaign: true,
  },
  "campaign-wedium-final-day": {
    label: "5. Letzter Tag",
    trigger: "15.11.2026, 00:01",
    placeholders: "{{passphrase}}, {{goUrl}}, {{appUrl}}",
    campaign: true,
  },
  "campaign-wedium-result": {
    label: "6. Ergebnis & Danke",
    trigger: "16.11.2026, 09:00",
    placeholders: "{{goUrl}}, {{appUrl}}",
    campaign: true,
  },
  "wedium-nudge-opinion": {
    label: "7. Nudge: Meinung posten",
    trigger: "Automatisch: bestätigt, aber keine Meinung (24 h)",
    placeholders: "{{goUrl}}, {{appUrl}}, {{passphrase}}",
    campaign: true,
  },
  "wedium-nudge-rate": {
    label: "8. Nudge: Bewerten",
    trigger: "Automatisch: Meinung da, aber nichts bewertet",
    placeholders: "{{goUrl}}, {{appUrl}}, {{sogehtsUrl}}, {{passphrase}}",
    campaign: true,
  },
  "wedium-nudge-chat": {
    label: "9. Nudge: Diskutieren",
    trigger: "Automatisch: bewertet, aber keine Nachricht",
    placeholders: "{{goUrl}}, {{appUrl}}, {{sogehtsUrl}}, {{passphrase}}",
    campaign: true,
  },
};

const TEMPLATE_ORDER = Object.keys(TEMPLATE_META);

const MAIL_COLUMNS: Array<{ key: string; short: string; title: string }> = [
  { key: "wedium-signup-confirm", short: "Verif", title: "Verifizierung (Bestätigungslink)" },
  { key: "wedium-signup-welcome", short: "Willk", title: "Willkommen (mit Passphrase)" },
  { key: "campaign-wedium-sogehts", short: "Geht's", title: "So geht's, 10.11." },
  { key: "campaign-wedium-start", short: "Start", title: "Es startet heute, 12.11." },
  { key: "campaign-wedium-final-day", short: "Final", title: "Letzter Tag, 15.11." },
  { key: "campaign-wedium-result", short: "Erg", title: "Ergebnis & Danke, 16.11." },
  { key: "wedium-nudge-opinion", short: "N-Mein", title: "Nudge: Meinung posten" },
  { key: "wedium-nudge-rate", short: "N-Bew", title: "Nudge: Bewerten" },
  { key: "wedium-nudge-chat", short: "N-Disk", title: "Nudge: Diskutieren" },
];

const RESENDABLE = [
  { key: "resend_signup", label: "Bestätigung" },
  { key: "resend_welcome", label: "Willkommen" },
  { key: "resend_passphrase", label: "Passphrase" },
  { key: "campaign-wedium-sogehts", label: "So geht's" },
  { key: "campaign-wedium-start", label: "Start" },
  { key: "campaign-wedium-final-day", label: "Letzter Tag" },
  { key: "campaign-wedium-result", label: "Ergebnis" },
  { key: "wedium-nudge-opinion", label: "Nudge: Meinung" },
  { key: "wedium-nudge-rate", label: "Nudge: Bewerten" },
  { key: "wedium-nudge-chat", label: "Nudge: Diskutieren" },
];

function MailMark({ status }: { status?: string }) {
  if (!status) return <span style={{ color: "#9fb0cc" }}>–</span>;
  if (status === "opened") {
    return (
      <span style={{ color: "#1c7c3a", fontWeight: 700, letterSpacing: "-0.15em" }} title="Gesendet und geöffnet">
        ✓✓
      </span>
    );
  }
  if (status === "sent") return <span style={{ color: "#1c7c3a", fontWeight: 700 }} title="Gesendet">✓</span>;
  if (status === "pending") return <span style={{ color: "#b07a00", fontWeight: 700 }}>⋯</span>;
  return <span style={{ color: "#b3261e", fontWeight: 700 }} title={status}>✕</span>;
}

export default function Admin3() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [ipMap, setIpMap] = useState<Record<string, string | null> | null>(null);
  const [ipPromptOpen, setIpPromptOpen] = useState(false);
  const [ipPassword, setIpPassword] = useState("");
  const [ipError, setIpError] = useState(false);
  const [openTemplate, setOpenTemplate] = useState<string | null>(null);
  const [campaignCounts, setCampaignCounts] = useState<Record<string, number>>({});
  const [campaignOpens, setCampaignOpens] = useState<Record<string, number>>({});
  const [resendChoice, setResendChoice] = useState<Record<string, string>>({});
  const [mailMatrix, setMailMatrix] = useState<Record<string, Record<string, string>>>({});
  const [openMoreRow, setOpenMoreRow] = useState<string | null>(null);
  const [showPassphrases, setShowPassphrases] = useState(false);
  const [polarization, setPolarization] = useState<Array<{ wave: string; count: number; avgLeast: number; avgMost: number }>>([]);

  const sortedTemplates = [...templates].sort(
    (a, b) => TEMPLATE_ORDER.indexOf(a.key) - TEMPLATE_ORDER.indexOf(b.key),
  );

  useEffect(() => { document.title = "wedium Admin — freemind"; }, []);

  async function invoke(payload: Record<string, unknown>) {
    return await supabase.functions.invoke("admin3-overview", {
      body: { password: savedPassword, ...payload },
    });
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  }

  async function loadAll(pw: string) {
    const [ov, tpl, bn, cs, mx, pol] = await Promise.all([
      supabase.functions.invoke("admin3-overview", { body: { password: pw } }),
      supabase.functions.invoke("admin3-overview", { body: { password: pw, action: "get_templates" } }),
      supabase.functions.invoke("admin3-overview", { body: { password: pw, action: "list_bans" } }),
      supabase.functions.invoke("admin3-overview", { body: { password: pw, action: "campaign_stats" } }),
      supabase.functions.invoke("admin3-overview", { body: { password: pw, action: "email_matrix" } }),
      supabase.functions.invoke("admin3-overview", { body: { password: pw, action: "polarization_stats" } }),
    ]);
    if (ov.error || !ov.data?.ok) return false;
    setSignups(ov.data.signups ?? []);
    setTemplates(tpl.data?.templates ?? []);
    setBans(bn.data?.bans ?? []);
    setCampaignCounts(cs.data?.counts ?? {});
    setCampaignOpens(cs.data?.opens ?? {});
    setMailMatrix(mx.data?.matrix ?? {});
    setPolarization(pol.data?.polarization ?? []);
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await loadAll(password);
    setBusy(false);
    if (!ok) { setError(true); return; }
    setSavedPassword(password);
    setUnlocked(true);
    setPassword("");
  }

  async function refresh() {
    await loadAll(savedPassword);
  }

  async function rowAction(signup: Signup, action: string, confirmMsg: string, extra: Record<string, unknown> = {}) {
    if (!confirm(confirmMsg)) return;
    setBusyRowId(signup.id);
    const { data, error: fnErr } = await invoke({ action, signupId: signup.id, ...extra });
    setBusyRowId(null);
    if (fnErr || !data?.ok) { flash(`Fehler bei ${signup.email}`); return; }
    if (data.skipped === "already_confirmed") flash(`${signup.email} ist bereits bestätigt.`);
    else if (data.skipped === "no_passphrase") flash(`${signup.email} hat noch keine Passphrase.`);
    else if (data.deleted) flash(`${signup.email} gelöscht.`);
    else if (data.banned) flash(`${signup.email} gesperrt.`);
    else flash(`E-Mail an ${signup.email} gesendet.`);
    await refresh();
  }

  async function revealIps(e: React.FormEvent) {
    e.preventDefault();
    setIpError(false);
    const { data, error: fnErr } = await invoke({ action: "reveal_ips", ipPassword });
    if (fnErr || !data?.ok) { setIpError(true); return; }
    setIpMap(data.ips ?? {});
    setIpPromptOpen(false);
    setIpPassword("");
  }

  async function saveTemplate(t: Template) {
    const { data, error: fnErr } = await invoke({
      action: "save_template", key: t.key, subject: t.subject, heading: t.heading, body_md: t.body_md,
    });
    if (fnErr || !data?.ok) flash("Fehler beim Speichern.");
    else flash(`Vorlage "${TEMPLATE_META[t.key]?.label ?? t.key}" gespeichert.`);
  }

  async function sendCampaignNow(key: string, resend = false) {
    const label = TEMPLATE_META[key]?.label ?? key;
    const question = resend
      ? `"${label}" ERNEUT an ALLE bestätigten wedium-Teilnehmer senden?`
      : `"${label}" jetzt an alle bestätigten wedium-Teilnehmer senden, die sie noch nicht erhalten haben?`;
    if (!confirm(question)) return;
    const { data, error: fnErr } = await invoke({ action: "send_campaign_now", key, resend });
    if (fnErr || !data?.ok) { flash("Fehler beim Senden."); return; }
    const result = Array.isArray(data.results) ? data.results[0] : null;
    flash(result ? `${label}: ${result.sent} gesendet, ${result.failed} Fehler.` : `${label} ausgelöst.`);
    await refresh();
  }

  async function resendForSignup(signup: Signup) {
    const choice = resendChoice[signup.id];
    if (!choice) { flash("Bitte erst eine E-Mail auswählen."); return; }
    const label = RESENDABLE.find((r) => r.key === choice)?.label ?? choice;
    if (choice.startsWith("campaign-") || choice.startsWith("wedium-nudge-")) {
      await rowAction(signup, "resend_campaign", `"${label}" an ${signup.email} senden?`, { key: choice });
    } else {
      await rowAction(signup, choice, `"${label}" an ${signup.email} senden?`);
    }
  }

  async function unban(email: string) {
    if (!confirm(`${email} entsperren?`)) return;
    await invoke({ action: "unban_email", email });
    await refresh();
  }

  async function importLegacy() {
    const fromDate = prompt("Anmeldungen aus der alten Liste ab welchem Datum übernehmen? (JJJJ-MM-TT)", "2026-09-01");
    if (!fromDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return;
    const { data, error: fnErr } = await invoke({ action: "import_legacy", fromDate });
    if (fnErr || !data?.ok) { flash("Fehler beim Übernehmen."); return; }
    flash(`${data.imported ?? 0} Anmeldungen übernommen.`);
    await refresh();
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eaf2fb", fontFamily: "system-ui, sans-serif" }}>
        <form onSubmit={submit} style={{ background: "#fff", padding: 32, border: "1px solid #0f1b3d", minWidth: 320 }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>wedium Admin</h1>
          <input
            type="password" autoComplete="current-password" autoFocus
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            style={{ width: "100%", padding: 10, border: "1px solid #0f1b3d", marginBottom: 12, fontSize: 14 }}
          />
          {error && <p style={{ color: "#c00", margin: "0 0 12px", fontSize: 13 }}>Falsches Passwort</p>}
          <button type="submit" disabled={busy}
            style={{ width: "100%", padding: 10, background: "#0f1b3d", color: "#fff", border: 0, fontSize: 14, cursor: "pointer" }}>
            {busy ? "…" : "Entsperren"}
          </button>
        </form>
      </div>
    );
  }

  const confirmed = signups.filter((s) => s.confirmed_at).length;
  const ipsRevealed = ipMap !== null;

  return (
    <div style={{ minHeight: "100vh", background: "#eaf2fb", fontFamily: "system-ui, sans-serif", padding: 32, color: "#0f1b3d" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.02em" }}>wedium admin</h1>
          <button
            onClick={() => { setUnlocked(false); setSignups([]); setTemplates([]); setBans([]); setIpMap(null); setSavedPassword(""); }}
            style={{ padding: "10px 14px", background: "transparent", color: "#0f1b3d", border: "1px solid #0f1b3d", fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sign out
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Stat label="Anmeldungen" value={signups.length} />
          <Stat label="Bestätigt" value={confirmed} />
          <Stat label="Pending" value={signups.length - confirmed} />
          <Stat label="Bans" value={bans.length} />
        </section>

        {msg && (
          <div style={{ background: "#fff", border: "1px solid #0f1b3d", padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>{msg}</div>
        )}

        {/* Email templates */}
        <h2 style={sectionTitle}>E-Mail-Vorlagen (wedium)</h2>
        <div style={{ display: "grid", gap: 8, marginBottom: 32 }}>
          {sortedTemplates.map((t) => {
            const idx = templates.findIndex((x) => x.key === t.key);
            const meta = TEMPLATE_META[t.key];
            const open = openTemplate === t.key;
            return (
              <div key={t.key} style={{ background: "#fff", border: "1px solid #0f1b3d" }}>
                <button
                  onClick={() => setOpenTemplate(open ? null : t.key)}
                  style={{
                    width: "100%", display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between",
                    padding: "12px 16px", background: "transparent", border: 0, cursor: "pointer",
                    textAlign: "left", color: "#0f1b3d", fontFamily: "inherit",
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {open ? "▾" : "▸"} {meta?.label ?? t.key}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.7, flex: 1 }}>{t.subject}</span>
                  <span style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap" }}>
                    {meta?.trigger}
                    {meta?.campaign
                      ? ` · ${campaignCounts[t.key] ?? 0} gesendet · ${campaignOpens[t.key] ?? 0} geöffnet`
                      : ""}
                  </span>
                </button>
                {open && (
                  <div style={{ padding: "0 16px 16px" }}>
                    <label style={label}>Betreff</label>
                    <input value={t.subject}
                      onChange={(e) => setTemplates((prev) => prev.map((x, i) => i === idx ? { ...x, subject: e.target.value } : x))}
                      style={input} />
                    <label style={label}>Überschrift</label>
                    <input value={t.heading}
                      onChange={(e) => setTemplates((prev) => prev.map((x, i) => i === idx ? { ...x, heading: e.target.value } : x))}
                      style={input} />
                    <label style={label}>Inhalt (Markdown-light: **fett**, `code`, [Label](url); Absätze mit Leerzeile)</label>
                    <textarea value={t.body_md} rows={10}
                      onChange={(e) => setTemplates((prev) => prev.map((x, i) => i === idx ? { ...x, body_md: e.target.value } : x))}
                      style={{ ...input, fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13, resize: "vertical" }} />
                    <div style={{ fontSize: 12, opacity: 0.7, margin: "4px 0 12px" }}>
                      Verfügbare Platzhalter: <code>{meta?.placeholders}</code>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveTemplate(t)}
                        style={{ padding: "8px 14px", background: "#0f1b3d", color: "#fff", border: 0, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Speichern
                      </button>
                      {meta?.campaign && (
                        <>
                          <button onClick={() => sendCampaignNow(t.key)} style={ghostBtn}>Jetzt an alle senden</button>
                          <button onClick={() => sendCampaignNow(t.key, true)} style={ghostBtn}>Erneut an alle senden</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {templates.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Keine Vorlagen gespeichert — Standardtexte sind aktiv.</div>}
        </div>

        {/* Signups */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "24px 0 8px", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>wedium-Anmeldungen</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={importLegacy} style={ghostBtn}>Aus alter Liste übernehmen</button>
            <button onClick={() => setShowPassphrases((v) => !v)} style={ghostBtn}>
              {showPassphrases ? "Passphrasen verbergen" : "Passphrasen anzeigen"}
            </button>
            {!ipsRevealed ? (
              <button onClick={() => setIpPromptOpen(true)} style={ghostBtn}>IPs anzeigen</button>
            ) : (
              <button onClick={() => setIpMap(null)} style={ghostBtn}>IPs verbergen</button>
            )}
          </div>
        </div>

        {ipPromptOpen && (
          <form onSubmit={revealIps} style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 12, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <input type="password" autoFocus placeholder="IP-Passwort" value={ipPassword}
              onChange={(e) => setIpPassword(e.target.value)}
              style={{ ...input, margin: 0, flex: 1 }} />
            <button type="submit" style={{ padding: "8px 14px", background: "#0f1b3d", color: "#fff", border: 0, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>Anzeigen</button>
            <button type="button" onClick={() => { setIpPromptOpen(false); setIpPassword(""); setIpError(false); }} style={ghostBtn}>Abbrechen</button>
            {ipError && <span style={{ color: "#c00", fontSize: 12 }}>Falsch</span>}
          </form>
        )}

        <div style={{ background: "#fff", border: "1px solid #0f1b3d", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #0f1b3d", textAlign: "left" }}>
                <th style={th}>Email</th>
                <th style={th}>Angemeldet</th>
                <th style={th}>Bestätigt</th>
                <th style={th}>Passphrase</th>
                <th style={th}>IP</th>
                {MAIL_COLUMNS.map((c) => (
                  <th key={c.key} style={{ ...th, textAlign: "center", padding: "8px 4px" }} title={c.title}>{c.short}</th>
                ))}
                <th style={th}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => {
                const busyRow = busyRowId === s.id;
                const marks = mailMatrix[s.id] ?? {};
                const moreOpen = openMoreRow === s.id;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid #dbe4f0" }}>
                    <td style={td}>{s.email}</td>
                    <td style={td}>{fmt(s.created_at)}</td>
                    <td style={td}>{s.confirmed_at ? fmt(s.confirmed_at) : "—"}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
                      {showPassphrases ? (s.passphrase ?? "—") : "••••"}
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
                      {ipsRevealed ? (ipMap![s.id] ?? "—") : "••••"}
                    </td>
                    {MAIL_COLUMNS.map((c) => (
                      <td key={c.key} style={{ ...td, textAlign: "center", padding: "8px 4px" }}>
                        <MailMark status={marks[c.key]} />
                      </td>
                    ))}
                    <td style={{ ...td, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <select
                        value={resendChoice[s.id] ?? ""}
                        onChange={(e) => setResendChoice((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        style={{ border: "1px solid #0f1b3d", fontSize: 11, padding: "3px 4px", background: "#fff", color: "#0f1b3d" }}>
                        <option value="">E-Mail wählen…</option>
                        {RESENDABLE.map((r) => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                      <button disabled={busyRow || !resendChoice[s.id]}
                        onClick={() => resendForSignup(s)}
                        style={actionBtn(!resendChoice[s.id])}>
                        Senden
                      </button>
                      <button
                        onClick={() => setOpenMoreRow(moreOpen ? null : s.id)}
                        title="Mehr"
                        style={{ ...actionBtn(false, "transparent"), color: "#0f1b3d", border: "1px solid #0f1b3d", padding: "3px 8px" }}>
                        ⋯
                      </button>
                      {moreOpen && (
                        <>
                          <button disabled={busyRow}
                            title="Nutzer löschen"
                            onClick={() => rowAction(s, "delete_signup", `${s.email} und Zugang endgültig löschen?`)}
                            style={actionBtn(false, "#8a1a1a")}>
                            🗑
                          </button>
                          <button disabled={busyRow}
                            title="E-Mail-Adresse sperren"
                            onClick={() => {
                              const reason = prompt(`Grund für Sperre von ${s.email}? (optional)`) ?? "";
                              rowAction(s, "ban_email", `${s.email} sperren und Konto löschen?`, { reason });
                            }}
                            style={actionBtn(false, "#0f1b3d")}>
                            ⛔
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {signups.length === 0 && (
                <tr><td colSpan={6 + MAIL_COLUMNS.length} style={{ ...td, opacity: 0.6 }}>Noch keine Anmeldungen</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Polarisierung */}
        <h2 style={sectionTitle}>Affektive Polarisierung (wedium-Teilnehmer)</h2>
        <div style={{ background: "#fff", border: "1px solid #0f1b3d", overflow: "auto", marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #0f1b3d", textAlign: "left" }}>
                <th style={th}>Welle</th><th style={th}>Antworten</th><th style={th}>Ø unliebste Partei</th><th style={th}>Ø liebste Partei</th>
              </tr>
            </thead>
            <tbody>
              {polarization.map((p) => (
                <tr key={p.wave} style={{ borderBottom: "1px solid #dbe4f0" }}>
                  <td style={td}>{p.wave === "pre" ? "1 — nach Meinungsabgabe" : "2 — letzter Tag"}</td>
                  <td style={td}>{p.count}</td>
                  <td style={td}>{p.avgLeast}</td>
                  <td style={td}>{p.avgMost}</td>
                </tr>
              ))}
              {polarization.length === 0 && <tr><td colSpan={4} style={{ ...td, opacity: 0.6 }}>Noch keine Antworten</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Bans */}
        <h2 style={sectionTitle}>Gesperrte E-Mails</h2>
        <div style={{ background: "#fff", border: "1px solid #0f1b3d", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #0f1b3d", textAlign: "left" }}>
                <th style={th}>Email</th><th style={th}>Gesperrt am</th><th style={th}>Grund</th><th style={th}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {bans.map((b) => (
                <tr key={b.email} style={{ borderBottom: "1px solid #dbe4f0" }}>
                  <td style={td}>{b.email}</td>
                  <td style={td}>{fmt(b.banned_at)}</td>
                  <td style={td}>{b.reason ?? "—"}</td>
                  <td style={td}>
                    <button onClick={() => unban(b.email)} style={actionBtn(false)}>Entsperren</button>
                  </td>
                </tr>
              ))}
              {bans.length === 0 && <tr><td colSpan={4} style={{ ...td, opacity: 0.6 }}>Keine Sperren</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label: statLabel, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 12 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>{statLabel}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" };
const td: React.CSSProperties = { padding: "8px 10px", verticalAlign: "middle" };
const sectionTitle: React.CSSProperties = { fontSize: 16, textTransform: "uppercase", letterSpacing: "0.05em", margin: "24px 0 8px" };
const label: React.CSSProperties = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, margin: "8px 0 4px" };
const input: React.CSSProperties = { width: "100%", padding: 8, border: "1px solid #0f1b3d", fontSize: 13, marginBottom: 4, background: "#fff", color: "#0f1b3d" };
const ghostBtn: React.CSSProperties = { padding: "6px 12px", background: "transparent", color: "#0f1b3d", border: "1px solid #0f1b3d", fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" };
function actionBtn(disabled: boolean, bg = "#0f1b3d"): React.CSSProperties {
  return {
    padding: "4px 8px",
    background: disabled ? "#dbe4f0" : bg,
    color: disabled ? "#6b7a99" : "#fff",
    border: 0, fontSize: 11,
    cursor: disabled ? "not-allowed" : "pointer",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };
}
