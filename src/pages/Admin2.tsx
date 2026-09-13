import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Signup = {
  id: string;
  email: string;
  created_at: string;
  confirmed_at: string | null;
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

type TemplateMeta = {
  label: string;
  trigger: string;
  placeholders: string;
  campaign?: boolean;
};

const TEMPLATE_META: Record<string, TemplateMeta> = {
  "signup-confirm": {
    label: "1. Verifizierung (Bestätigungslink)",
    trigger: "Sofort nach Anmeldung",
    placeholders: "{{confirmUrl}}",
  },
  "signup-welcome": {
    label: "2. Willkommen",
    trigger: "Nach Bestätigung des Links",
    placeholders: "{{passphrase}}, {{appUrl}}, {{goUrl}}, {{faqUrl}}",
  },
  "campaign-soft-launch": {
    label: "3. Soft launch today (mit Passphrase)",
    trigger: "20.08.2026, 00:01",
    placeholders: "{{passphrase}}, {{appUrl}}, {{goUrl}}, {{faqUrl}}",
    campaign: true,
  },
  "campaign-start": {
    label: "4. Start today!",
    trigger: "23.08.2026, 00:01",
    placeholders: "{{passphrase}}, {{appUrl}}, {{goUrl}}, {{faqUrl}}",
    campaign: true,
  },
  "campaign-final-day": {
    label: "5. Final day",
    trigger: "29.08.2026, 00:01",
    placeholders: "{{passphrase}}, {{appUrl}}, {{goUrl}}, {{faqUrl}}",
    campaign: true,
  },
  "campaign-sogehts": {
    label: "6. So geht's",
    trigger: "Nur manuell",
    placeholders:
      "{{sogehtsUrl}}, {{goUrl}}, {{appUrl}}, {{faqUrl}}, {{passphrase}}, Bilder: {{graphImg}}, {{diffImg}}, {{understandingImg}}, {{handImg}} (als ![alt]({{graphImg}}) einfügen)",
    campaign: true,
  },
  "daily-brief": {
    label: "7. Dein Tag (Kurz-Mail)",
    trigger: "Täglich 21:00 an Abonnenten",
    placeholders: "{{briefBody}}, {{briefYourDay}}, {{briefDate}}, {{goUrl}}, {{berichtUrl}}, {{appUrl}}",
  },
  "daily-report": {
    label: "7b. Tagesbericht (nur /bericht-Seite)",
    trigger: "Täglich 23:30, kein Mailversand",
    placeholders: "{{reportTitle}}, {{reportBody}}, {{reportStats}}, {{reportDate}}, {{berichtUrl}}, {{goUrl}}, {{appUrl}}",
  },

};

const TEMPLATE_ORDER = Object.keys(TEMPLATE_META);

// Columns of the per-user checkmark grid.
const MAIL_COLUMNS: Array<{ key: string; short: string; title: string }> = [
  { key: "signup-confirm", short: "Verif", title: "Verifizierung (Bestätigungslink)" },
  { key: "signup-welcome", short: "Willk", title: "Willkommen" },
  { key: "campaign-soft-launch", short: "Soft", title: "Soft launch today, 20.08." },
  { key: "campaign-start", short: "Start", title: "Start today!, 23.08." },
  { key: "campaign-final-day", short: "Final", title: "Final day, 29.08." },
  { key: "campaign-sogehts", short: "Geht's", title: "So geht's (nur manuell)" },
  { key: "daily-brief", short: "Tag", title: "Dein Tag (Kurz-Mail, letzter Versand)" },
  { key: "daily-report", short: "Bericht", title: "Tagesbericht-Mail (stillgelegt)" },

  { key: "signup-passphrase", short: "Pass*", title: "Passphrase (alte Einzel-Mail, nur manuell)" },
];

const RESENDABLE = [
  { key: "resend_signup", label: "Bestätigung" },
  { key: "resend_passphrase", label: "Passphrase" },
  { key: "resend_welcome", label: "Willkommen" },
  { key: "campaign-soft-launch", label: "Soft launch" },
  { key: "campaign-start", label: "Start today" },
  { key: "campaign-final-day", label: "Final day" },
  { key: "campaign-sogehts", label: "So geht's" },

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


export default function Admin2() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [faq, setFaq] = useState<Array<{ id?: string; question: string; answer: string; sort_order: number; _new?: boolean }>>([]);
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
  const [reports, setReports] = useState<Array<{ id: string; report_date: string; title: string; body_md: string; stats: Record<string, number> | null }>>([]);
  const [reportOptIns, setReportOptIns] = useState(0);
  const [reportBusy, setReportBusy] = useState(false);
  const [questions, setQuestions] = useState<Array<{ id: string; question: string; email: string | null; ai_draft: string | null; status: string; created_at: string }>>([]);
  const [polarization, setPolarization] = useState<Array<{ wave: string; count: number; avgLeast: number; avgMost: number }>>([]);
  const [tourSteps, setTourSteps] = useState<Array<{ id?: string; text: string; highlight: string; sort_order: number; is_active: boolean }>>([]);


  const sortedTemplates = [...templates].sort(
    (a, b) => TEMPLATE_ORDER.indexOf(a.key) - TEMPLATE_ORDER.indexOf(b.key),
  );

  useEffect(() => { document.title = "Admin — freemind"; }, []);

  async function invoke(payload: Record<string, unknown>) {
    return await supabase.functions.invoke("admin2-overview", {
      body: { password: savedPassword, ...payload },
    });
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  }

  async function loadAll(pw: string) {
    const [ov, tpl, bn, fq, cs, mx, rp, oi, qs, pol, ts] = await Promise.all([
      supabase.functions.invoke("admin2-overview", { body: { password: pw } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "get_templates" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "list_bans" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "list_faq" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "campaign_stats" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "email_matrix" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "list_reports" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "report_opt_ins" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "list_questions" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "polarization_stats" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "list_tutorial_steps" } }),
    ]);
    if (ov.error || !ov.data?.ok) return false;
    setSignups(ov.data.signups ?? []);
    setTemplates(tpl.data?.templates ?? []);
    setBans(bn.data?.bans ?? []);
    setFaq(fq.data?.faq ?? []);
    setCampaignCounts(cs.data?.counts ?? {});
    setCampaignOpens(cs.data?.opens ?? {});
    setMailMatrix(mx.data?.matrix ?? {});
    setReports(rp.data?.reports ?? []);
    setReportOptIns(oi.data?.optIns ?? 0);
    setQuestions(qs.data?.questions ?? []);
    setPolarization(pol.data?.polarization ?? []);
    setTourSteps(ts.data?.steps ?? []);
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
    const { data, error } = await invoke({ action, signupId: signup.id, ...extra });
    setBusyRowId(null);
    if (error || !data?.ok) {
      flash(`Fehler bei ${signup.email}`);
      return;
    }
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
    const { data, error } = await invoke({ action: "reveal_ips", ipPassword });
    if (error || !data?.ok) { setIpError(true); return; }
    setIpMap(data.ips ?? {});
    setIpPromptOpen(false);
    setIpPassword("");
  }

  async function saveTemplate(t: Template) {
    const { data, error } = await invoke({
      action: "save_template",
      key: t.key,
      subject: t.subject,
      heading: t.heading,
      body_md: t.body_md,
    });
    if (error || !data?.ok) flash("Fehler beim Speichern.");
    else flash(`Vorlage "${TEMPLATE_META[t.key]?.label ?? t.key}" gespeichert.`);
  }

  async function sendCampaignNow(key: string, resend = false) {
    const label = TEMPLATE_META[key]?.label ?? key;
    const question = resend
      ? `"${label}" ERNEUT an ALLE bestätigten Empfänger senden (auch an die, die sie schon erhalten haben)?`
      : `"${label}" jetzt an alle bestätigten Empfänger senden, die sie noch nicht erhalten haben?`;
    if (!confirm(question)) return;
    const { data, error } = await invoke({ action: "send_campaign_now", key, resend });
    if (error || !data?.ok) { flash("Fehler beim Senden."); return; }
    const result = Array.isArray(data.results) ? data.results[0] : null;
    flash(result ? `${label}: ${result.sent} gesendet, ${result.failed} Fehler.` : `${label} ausgelöst.`);
    await refresh();
  }


  async function runReport(opts: { send: boolean; resend?: boolean; regenerate?: boolean; date?: string }) {
    const question = opts.send
      ? `Tagesbericht${opts.date ? ` (${opts.date})` : ""} erzeugen und an alle Abonnenten (${reportOptIns}) senden?`
      : `Tagesbericht${opts.date ? ` (${opts.date})` : ""} nur erzeugen (kein Versand)?`;
    if (!confirm(question)) return;
    setReportBusy(true);
    const { data, error } = await invoke({ action: "generate_report", ...opts });
    setReportBusy(false);
    if (error || !data?.ok) { flash("Fehler beim Bericht."); return; }
    flash(`Bericht ${data.date}: ${data.sent ?? 0} Mails gesendet, ${data.failed ?? 0} Fehler.`);
    await refresh();
  }

  async function runBrief(opts: { resend?: boolean; date?: string; preview?: boolean }) {
    if (!opts.preview) {
      const question = `Kurz-Mail "Dein Tag"${opts.date ? ` (${opts.date})` : ""} an alle Abonnenten (${reportOptIns}) senden?`;
      if (!confirm(question)) return;
    }
    setReportBusy(true);
    const { data, error } = await invoke({ action: "send_daily_brief", ...opts });
    setReportBusy(false);
    if (error || !data?.ok) { flash("Fehler bei der Kurz-Mail."); return; }
    if (opts.preview) {
      alert(String(data.body ?? "(leer)"));
      return;
    }
    flash(`Kurz-Mail ${data.date}: ${data.sent ?? 0} gesendet, ${data.failed ?? 0} Fehler.`);
    await refresh();
  }

  async function resendForSignup(signup: Signup) {
    const choice = resendChoice[signup.id];
    if (!choice) { flash("Bitte erst eine E-Mail auswählen."); return; }
    const label = RESENDABLE.find((r) => r.key === choice)?.label ?? choice;
    if (choice.startsWith("campaign-") || choice.startsWith("nudge-")) {
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

  function addTourStep() {
    setTourSteps((prev) => [...prev, {
      text: "",
      highlight: "none",
      sort_order: (prev[prev.length - 1]?.sort_order ?? 0) + 10,
      is_active: true,
    }]);
  }

  async function saveTourStep(idx: number) {
    const row = tourSteps[idx];
    if (!row.text.trim()) { flash("Text darf nicht leer sein."); return; }
    const { data, error } = await invoke({
      action: "save_tutorial_step",
      id: row.id,
      text: row.text,
      highlight: row.highlight,
      sort_order: row.sort_order,
      is_active: row.is_active,
    });
    if (error || !data?.ok) { flash("Fehler beim Speichern."); return; }
    flash("Schritt gespeichert.");
    await refresh();
  }

  async function deleteTourStep(idx: number) {
    const row = tourSteps[idx];
    if (!row.id) { setTourSteps((prev) => prev.filter((_, i) => i !== idx)); return; }
    if (!confirm("Schritt löschen?")) return;
    const { data, error } = await invoke({ action: "delete_tutorial_step", id: row.id });
    if (error || !data?.ok) { flash("Fehler beim Löschen."); return; }
    flash("Schritt gelöscht.");
    await refresh();
  }


  async function saveFaqRow(idx: number) {
    const row = faq[idx];
    if (!row.question.trim()) { flash("Frage darf nicht leer sein."); return; }
    const { data, error } = await invoke({
      action: "save_faq",
      id: row.id,
      question: row.question,
      answer: row.answer,
      sort_order: row.sort_order,
    });
    if (error || !data?.ok) { flash("Fehler beim Speichern."); return; }
    flash("FAQ gespeichert.");
    await refresh();
  }

  async function deleteFaqRow(idx: number) {
    const row = faq[idx];
    if (!row.id) { setFaq((prev) => prev.filter((_, i) => i !== idx)); return; }
    if (!confirm(`Frage "${row.question}" löschen?`)) return;
    const { data, error } = await invoke({ action: "delete_faq", id: row.id });
    if (error || !data?.ok) { flash("Fehler beim Löschen."); return; }
    flash("Frage gelöscht.");
    await refresh();
  }

  async function publishQuestion(q: { id: string; question: string; ai_draft: string | null }) {
    const answer = window.prompt("Antwort für die FAQ-Liste:", q.ai_draft ?? "");
    if (answer === null) return;
    const save = await invoke({
      action: "save_faq",
      question: q.question,
      answer,
      sort_order: (faq[faq.length - 1]?.sort_order ?? 0) + 10,
    });
    if (save.error || !save.data?.ok) { flash("Fehler beim Veröffentlichen."); return; }
    await invoke({ action: "set_question_status", id: q.id, status: "answered" });
    flash("Frage in die FAQ übernommen.");
    await refresh();
  }

  async function setQuestionStatus(id: string, status: string) {
    const { data, error } = await invoke({ action: "set_question_status", id, status });
    if (error || !data?.ok) { flash("Fehler beim Aktualisieren."); return; }
    await refresh();
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Diese Einreichung löschen?")) return;
    const { data, error } = await invoke({ action: "delete_question", id });
    if (error || !data?.ok) { flash("Fehler beim Löschen."); return; }
    await refresh();
  }

  function addFaqRow() {
    setFaq((prev) => [...prev, {
      question: "",
      answer: "",
      sort_order: (prev[prev.length - 1]?.sort_order ?? 0) + 10,
      _new: true,
    }]);
  }


  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eaf2fb", fontFamily: "system-ui, sans-serif" }}>
        <form onSubmit={submit} style={{ background: "#fff", padding: 32, border: "1px solid #0f1b3d", minWidth: 320 }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>Admin</h1>
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
          <h1 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.02em" }}>freemind admin</h1>
          <button
            onClick={() => { setUnlocked(false); setSignups([]); setTemplates([]); setBans([]); setFaq([]); setQuestions([]); setPolarization([]); setIpMap(null); setSavedPassword(""); }}
            style={{ padding: "10px 14px", background: "transparent", color: "#0f1b3d", border: "1px solid #0f1b3d", fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sign out
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Stat label="Signups" value={signups.length} />
          <Stat label="Bestätigt" value={confirmed} />
          <Stat label="Pending" value={signups.length - confirmed} />
          <Stat label="Bans" value={bans.length} />
        </section>

        {msg && (
          <div style={{ background: "#fff", border: "1px solid #0f1b3d", padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>{msg}</div>
        )}

        {/* Email templates */}
        <h2 style={sectionTitle}>E-Mail-Vorlagen</h2>
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
                          <button onClick={() => sendCampaignNow(t.key)} style={ghostBtn}>
                            Jetzt an alle senden
                          </button>
                          <button onClick={() => sendCampaignNow(t.key, true)} style={ghostBtn}>
                            Erneut an alle senden
                          </button>
                        </>
                      )}

                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {templates.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Keine Vorlagen geladen.</div>}
        </div>

        {/* Signups */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "24px 0 8px" }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Signups</h2>
          {!ipsRevealed ? (
            <button onClick={() => setIpPromptOpen(true)} style={ghostBtn}>IPs anzeigen</button>
          ) : (
            <button onClick={() => setIpMap(null)} style={ghostBtn}>IPs verbergen</button>
          )}
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
            </tbody>
          </table>
        </div>

        {/* Tagesberichte */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "24px 0 8px" }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Tagesberichte</h2>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{reportOptIns} Abonnenten</span>
        </div>
        <div style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 16, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button disabled={reportBusy} onClick={() => runReport({ send: false })} style={ghostBtn}>
            Heutigen Bericht erzeugen
          </button>
          <button disabled={reportBusy} onClick={() => runBrief({ preview: true })} style={ghostBtn}>
            Kurz-Mail „Dein Tag" ansehen
          </button>
          <button disabled={reportBusy} onClick={() => runBrief({})} style={ghostBtn}>
            Kurz-Mail jetzt senden
          </button>
          <button disabled={reportBusy} onClick={() => {
            const date = prompt("Datum (JJJJ-MM-TT)?") ?? "";
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) runBrief({ resend: true, date });
          }} style={ghostBtn}>
            Kurz-Mail für Tag neu senden
          </button>
        </div>
        <div style={{ display: "grid", gap: 8, marginBottom: 32 }}>
          {reports.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <strong style={{ fontSize: 13 }}>{r.title}</strong>
                <span style={{ fontSize: 11, opacity: 0.6 }}>{r.report_date}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "pre-wrap", marginTop: 6 }}>{r.body_md}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button disabled={reportBusy} onClick={() => runReport({ send: false, date: r.report_date })} style={ghostBtn}>
                  Neu erzeugen
                </button>
                <button disabled={reportBusy} onClick={() => runBrief({ resend: true, date: r.report_date })} style={ghostBtn}>
                  Kurz-Mail neu senden
                </button>
              </div>
            </div>
          ))}
          {reports.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Noch keine Berichte.</div>}
        </div>

        {/* Anleitung / Tutorial */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "24px 0 8px" }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>Anleitung (Tutorial)</h2>
          <button onClick={addTourStep} style={ghostBtn}>+ Schritt hinzufügen</button>
        </div>
        <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
          {tourSteps.map((row, idx) => (
            <div key={row.id ?? `new-step-${idx}`} style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 100 }}>
                  <label style={label}>Reihenfolge</label>
                  <input
                    type="number"
                    value={row.sort_order}
                    onChange={(e) => setTourSteps((prev) => prev.map((x, i) => i === idx ? { ...x, sort_order: Number(e.target.value) || 0 } : x))}
                    style={input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Hervorhebung</label>
                  <select
                    value={row.highlight}
                    onChange={(e) => setTourSteps((prev) => prev.map((x, i) => i === idx ? { ...x, highlight: e.target.value } : x))}
                    style={input}
                  >
                    <option value="none">Keine</option>
                    <option value="difference">Meinungsunterschied-Skala</option>
                    <option value="chat">Diskutieren-Button</option>
                  </select>
                </div>
                <div style={{ width: 90 }}>
                  <label style={label}>Aktiv</label>
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) => setTourSteps((prev) => prev.map((x, i) => i === idx ? { ...x, is_active: e.target.checked } : x))}
                  />
                </div>
              </div>
              <label style={label}>Text</label>
              <textarea
                rows={3}
                value={row.text}
                onChange={(e) => setTourSteps((prev) => prev.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))}
                style={{ ...input, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => saveTourStep(idx)}
                  style={{ padding: "8px 14px", background: "#0f1b3d", color: "#fff", border: 0, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Speichern
                </button>
                <button onClick={() => deleteTourStep(idx)} style={actionBtn(false, "#8a1a1a")}>Löschen</button>
              </div>
            </div>
          ))}
          {tourSteps.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Noch keine Schritte.</div>}
        </div>


        {/* FAQ */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "24px 0 8px" }}>
          <h2 style={{ ...sectionTitle, margin: 0 }}>FAQ</h2>
          <button onClick={addFaqRow} style={ghostBtn}>+ Frage hinzufügen</button>
        </div>
        <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
          {faq.map((row, idx) => (
            <div key={row.id ?? `new-${idx}`} style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Frage</label>
                  <input
                    value={row.question}
                    onChange={(e) => setFaq((prev) => prev.map((x, i) => i === idx ? { ...x, question: e.target.value } : x))}
                    style={input}
                  />
                </div>
                <div style={{ width: 100 }}>
                  <label style={label}>Reihenfolge</label>
                  <input
                    type="number"
                    value={row.sort_order}
                    onChange={(e) => setFaq((prev) => prev.map((x, i) => i === idx ? { ...x, sort_order: Number(e.target.value) || 0 } : x))}
                    style={input}
                  />
                </div>
              </div>
              <label style={label}>Antwort</label>
              <textarea
                rows={5}
                value={row.answer}
                onChange={(e) => setFaq((prev) => prev.map((x, i) => i === idx ? { ...x, answer: e.target.value } : x))}
                style={{ ...input, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => saveFaqRow(idx)}
                  style={{ padding: "8px 14px", background: "#0f1b3d", color: "#fff", border: 0, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Speichern
                </button>
                <button onClick={() => deleteFaqRow(idx)} style={actionBtn(false, "#8a1a1a")}>Löschen</button>
              </div>
            </div>
          ))}
          {faq.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Noch keine Fragen.</div>}
        </div>

        {/* Eingereichte Fragen */}
        <h2 style={sectionTitle}>Eingereichte Fragen ({questions.filter((q) => q.status === "new").length} neu)</h2>
        <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
          {questions.map((q) => (
            <div key={q.id} style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span>{fmt(q.created_at)} · {q.email ?? "ohne E-Mail"}</span>
                <span>{q.status}</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, margin: "8px 0" }}>{q.question}</p>
              {q.ai_draft && (
                <p style={{ fontSize: 13, whiteSpace: "pre-wrap", opacity: 0.85, margin: 0 }}>{q.ai_draft}</p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button onClick={() => publishQuestion(q)} style={ghostBtn}>In FAQ übernehmen</button>
                {q.status !== "answered" && (
                  <button onClick={() => setQuestionStatus(q.id, "answered")} style={ghostBtn}>Als beantwortet markieren</button>
                )}
                {q.status !== "archived" && (
                  <button onClick={() => setQuestionStatus(q.id, "archived")} style={ghostBtn}>Archivieren</button>
                )}
                <button onClick={() => deleteQuestion(q.id)} style={actionBtn(false, "#8a1a1a")}>Löschen</button>
              </div>
            </div>
          ))}
          {questions.length === 0 && <div style={{ fontSize: 13, opacity: 0.7 }}>Noch keine Einreichungen.</div>}
        </div>

        {/* Polarisierung */}
        <h2 style={sectionTitle}>Affektive Polarisierung</h2>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 12 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>{label}</div>
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
