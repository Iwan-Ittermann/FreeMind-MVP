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

const PLACEHOLDERS: Record<string, string> = {
  "signup-confirm": "{{confirmUrl}}",
  "signup-passphrase": "{{passphrase}}, {{appUrl}}",
};

const TEMPLATE_LABEL: Record<string, string> = {
  "signup-confirm": "1. Verifizierung (Bestätigungslink)",
  "signup-passphrase": "2. Passphrase (nach Bestätigung)",
};

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
    const [ov, tpl, bn, fq] = await Promise.all([
      supabase.functions.invoke("admin2-overview", { body: { password: pw } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "get_templates" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "list_bans" } }),
      supabase.functions.invoke("admin2-overview", { body: { password: pw, action: "list_faq" } }),
    ]);
    if (ov.error || !ov.data?.ok) return false;
    setSignups(ov.data.signups ?? []);
    setTemplates(tpl.data?.templates ?? []);
    setBans(bn.data?.bans ?? []);
    setFaq(fq.data?.faq ?? []);
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
    else flash(`Vorlage "${TEMPLATE_LABEL[t.key] ?? t.key}" gespeichert.`);
  }

  async function unban(email: string) {
    if (!confirm(`${email} entsperren?`)) return;
    await invoke({ action: "unban_email", email });
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
            onClick={() => { setUnlocked(false); setSignups([]); setTemplates([]); setBans([]); setFaq([]); setIpMap(null); setSavedPassword(""); }}
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
        <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
          {templates.map((t, idx) => (
            <div key={t.key} style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 16 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, marginBottom: 8 }}>
                {TEMPLATE_LABEL[t.key] ?? t.key}
              </div>
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
                Verfügbare Platzhalter: <code>{PLACEHOLDERS[t.key]}</code>
              </div>
              <button onClick={() => saveTemplate(t)}
                style={{ padding: "8px 14px", background: "#0f1b3d", color: "#fff", border: 0, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Speichern
              </button>
            </div>
          ))}
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
                <th style={th}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => {
                const busyRow = busyRowId === s.id;
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid #dbe4f0" }}>
                    <td style={td}>{s.email}</td>
                    <td style={td}>{fmt(s.created_at)}</td>
                    <td style={td}>{s.confirmed_at ? fmt(s.confirmed_at) : "—"}</td>
                    <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
                      {ipsRevealed ? (ipMap![s.id] ?? "—") : "••••"}
                    </td>
                    <td style={{ ...td, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button disabled={busyRow || !!s.confirmed_at}
                        onClick={() => rowAction(s, "resend_signup", `Bestätigungs-E-Mail erneut senden an ${s.email}?`)}
                        title={s.confirmed_at ? "Bereits bestätigt" : "Bestätigung erneut senden"}
                        style={actionBtn(!!s.confirmed_at)}>
                        Bestätigung
                      </button>
                      <button disabled={busyRow || !s.confirmed_at}
                        onClick={() => rowAction(s, "resend_passphrase", `Passphrase erneut senden an ${s.email}?`)}
                        title={s.confirmed_at ? "Passphrase erneut senden" : "Noch nicht bestätigt"}
                        style={actionBtn(!s.confirmed_at)}>
                        Passphrase
                      </button>
                      <button disabled={busyRow}
                        onClick={() => rowAction(s, "delete_signup", `${s.email} und Zugang endgültig löschen?`)}
                        style={actionBtn(false, "#8a1a1a")}>
                        Löschen
                      </button>
                      <button disabled={busyRow}
                        onClick={() => {
                          const reason = prompt(`Grund für Sperre von ${s.email}? (optional)`) ?? "";
                          rowAction(s, "ban_email", `${s.email} sperren und Konto löschen?`, { reason });
                        }}
                        style={actionBtn(false, "#0f1b3d")}>
                        Bannen
                      </button>
                    </td>
                  </tr>
                );
              })}
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
