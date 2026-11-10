import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Signup = {
  id: string;
  email: string;
  created_at: string;
  confirmed_at: string | null;
};

type Stats = { total: number; confirmed: number; pending: number; goal: number };

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

const box: React.CSSProperties = {
  border: "1px solid #cfd8e3",
  borderRadius: 8,
  padding: 16,
  background: "#fff",
};

export default function GutefrageAdmin() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [template, setTemplate] = useState<Template | null>(null);
  const [bans, setBans] = useState<Ban[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Gutefrage Admin — freemind";
  }, []);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  }

  async function call(pw: string, payload: Record<string, unknown> = {}) {
    return await supabase.functions.invoke("gutefrage-admin", { body: { password: pw, ...payload } });
  }

  async function invoke(payload: Record<string, unknown>) {
    return await call(savedPassword, payload);
  }

  async function loadAll(pw: string) {
    const [ov, tpl, bn] = await Promise.all([
      call(pw, { action: "overview" }),
      call(pw, { action: "get_template" }),
      call(pw, { action: "list_bans" }),
    ]);
    if (ov.error || !ov.data?.ok) return false;
    setSignups(ov.data.signups ?? []);
    setStats(ov.data.stats ?? null);
    setEventDate(ov.data.eventDate ?? "");
    setDateDraft(ov.data.eventDate ?? "");
    setQuestionDraft(ov.data.question ?? "");
    setTemplate(tpl.data?.template ?? null);
    setBans(bn.data?.bans ?? []);
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await loadAll(password);
    setBusy(false);
    if (!ok) {
      setError(true);
      return;
    }
    setSavedPassword(password);
    setUnlocked(true);
    setPassword("");
  }

  async function refresh() {
    await loadAll(savedPassword);
  }

  async function rowAction(signup: Signup, action: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setBusyRowId(signup.id);
    const { data, error: fnErr } = await invoke({ action, signupId: signup.id });
    setBusyRowId(null);
    if (fnErr || !data?.ok) {
      flash(`Fehler bei ${signup.email}`);
      return;
    }
    if (data.skipped === "already_confirmed") flash(`${signup.email} ist bereits bestätigt.`);
    else if (data.deleted) flash(`${signup.email} gelöscht.`);
    else if (data.banned) flash(`${signup.email} gesperrt.`);
    else flash(`E-Mail an ${signup.email} gesendet.`);
    await refresh();
  }

  async function saveDate() {
    const { data, error: fnErr } = await invoke({ action: "set_event_date", value: dateDraft });
    if (fnErr || !data?.ok) {
      flash("Fehler beim Speichern.");
      return;
    }
    setEventDate(data.eventDate ?? "");
    flash(data.eventDate ? `Datum gespeichert: ${data.eventDate}` : "Datum entfernt.");
  }

  async function saveTemplate() {
    if (!template) return;
    const { data, error: fnErr } = await invoke({
      action: "save_template",
      subject: template.subject,
      heading: template.heading,
      body_md: template.body_md,
    });
    if (fnErr || !data?.ok) flash("Fehler beim Speichern.");
    else flash("Vorlage gespeichert.");
  }

  async function unban(email: string) {
    if (!confirm(`${email} entsperren?`)) return;
    await invoke({ action: "unban_email", email });
    await refresh();
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f6f9" }}>
        <form onSubmit={submit} style={{ ...box, width: 320, display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Gutefrage Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            autoFocus
            style={{ padding: 10, border: "1px solid #cfd8e3", borderRadius: 6 }}
          />
          {error && <p style={{ color: "#b3261e", margin: 0, fontSize: 13 }}>Falsches Passwort.</p>}
          <button
            type="submit"
            disabled={busy}
            style={{ padding: 10, borderRadius: 6, border: 0, background: "#2f7a2f", color: "#fff", fontWeight: 700 }}
          >
            {busy ? "Prüfe…" : "Öffnen"}
          </button>
        </form>
      </div>
    );
  }

  const percent = stats ? Math.min(100, Math.round((stats.confirmed / Math.max(stats.goal, 1)) * 100)) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Gutefrage.net — Vorregistrierungen</h1>
          <button onClick={refresh} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cfd8e3", background: "#fff" }}>
            Aktualisieren
          </button>
        </div>

        {msg && (
          <div style={{ ...box, borderColor: "#2f7a2f", color: "#2f7a2f", fontWeight: 600 }}>{msg}</div>
        )}

        {/* Counter */}
        <div style={{ ...box, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#2f7a2f", lineHeight: 1 }}>
                {stats?.confirmed ?? 0}
              </div>
              <div style={{ fontSize: 13, color: "#5b6b7f" }}>bestätigt (Ziel {stats?.goal ?? 100})</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.pending ?? 0}</div>
              <div style={{ fontSize: 13, color: "#5b6b7f" }}>unbestätigt</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stats?.total ?? 0}</div>
              <div style={{ fontSize: 13, color: "#5b6b7f" }}>gesamt</div>
            </div>
          </div>
          <div style={{ height: 10, background: "#e6ebf1", borderRadius: 999 }}>
            <div style={{ width: `${percent}%`, height: "100%", background: "#2f7a2f", borderRadius: 999 }} />
          </div>
          {stats && stats.confirmed >= stats.goal && (
            <p style={{ margin: 0, fontWeight: 700, color: "#2f7a2f" }}>
              Ziel erreicht — jetzt das Datum festlegen.
            </p>
          )}
        </div>

        {/* Discussion question */}
        <div style={{ ...box, display: "grid", gap: 10 }}>
          <strong>Diskussionsfrage</strong>
          <p style={{ margin: 0, fontSize: 13, color: "#5b6b7f" }}>
            Erscheint auf /gutefrage und in den Gutefrage-Mails als {"{{eventQuestion}}"} (Datum: {"{{eventDate}}"}).
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              style={{ flex: "1 1 260px", padding: 9, border: "1px solid #cfd8e3", borderRadius: 6 }}
            />
            <button
              onClick={async () => {
                const { data, error } = await invoke({ action: "set_question", value: questionDraft });
                flash(error || !data?.ok ? "Speichern fehlgeschlagen" : "Frage gespeichert");
              }}
              style={{ padding: "9px 14px", borderRadius: 6, border: 0, background: "#2f7a2f", color: "#fff", fontWeight: 700 }}
            >
              Speichern
            </button>
          </div>
        </div>

        {/* Event date */}
        <div style={{ ...box, display: "grid", gap: 10 }}>
          <strong>Event-Datum</strong>
          <p style={{ margin: 0, fontSize: 13, color: "#5b6b7f" }}>
            Freier Text, erscheint direkt auf /gutefrage (z. B. „12.–16. November 2026"). Leer lassen,
            solange kein Datum steht.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              placeholder="z. B. 12.–16. November 2026"
              style={{ flex: "1 1 260px", padding: 9, border: "1px solid #cfd8e3", borderRadius: 6 }}
            />
            <button
              onClick={saveDate}
              style={{ padding: "9px 14px", borderRadius: 6, border: 0, background: "#2f7a2f", color: "#fff", fontWeight: 700 }}
            >
              Speichern
            </button>
          </div>
          <span style={{ fontSize: 13, color: "#5b6b7f" }}>
            Aktuell: {eventDate ? eventDate : "kein Datum gesetzt"}
          </span>
        </div>

        {/* Signups */}
        <div style={{ ...box, overflowX: "auto" }}>
          <strong>Anmeldungen</strong>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#5b6b7f" }}>
                <th style={{ padding: "6px 8px" }}>E-Mail</th>
                <th style={{ padding: "6px 8px" }}>Angemeldet</th>
                <th style={{ padding: "6px 8px" }}>Bestätigt</th>
                <th style={{ padding: "6px 8px" }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #e6ebf1" }}>
                  <td style={{ padding: "8px" }}>{s.email}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{fmt(s.created_at)}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                    {s.confirmed_at ? (
                      <span style={{ color: "#1c7c3a", fontWeight: 700 }}>✓ {fmt(s.confirmed_at)}</span>
                    ) : (
                      <span style={{ color: "#b07a00", fontWeight: 700 }}>offen</span>
                    )}
                  </td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                    <button
                      disabled={busyRowId === s.id || !!s.confirmed_at}
                      onClick={() => rowAction(s, "resend_confirm", `Bestätigungsmail an ${s.email} senden?`)}
                      style={{ marginRight: 6, padding: "5px 9px", borderRadius: 6, border: "1px solid #cfd8e3", background: "#fff" }}
                    >
                      Bestätigung
                    </button>
                    <button
                      disabled={busyRowId === s.id}
                      onClick={() => rowAction(s, "delete_signup", `${s.email} löschen?`)}
                      style={{ marginRight: 6, padding: "5px 9px", borderRadius: 6, border: "1px solid #cfd8e3", background: "#fff" }}
                    >
                      Löschen
                    </button>
                    <button
                      disabled={busyRowId === s.id}
                      onClick={() => rowAction(s, "ban_signup", `${s.email} sperren und löschen?`)}
                      style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid #f0c0bc", background: "#fff", color: "#b3261e" }}
                    >
                      Sperren
                    </button>
                  </td>
                </tr>
              ))}
              {signups.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 12, color: "#5b6b7f" }}>
                    Noch keine Anmeldungen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Template */}
        <div style={{ ...box, display: "grid", gap: 10 }}>
          <strong>Bestätigungs-Mail</strong>
          <p style={{ margin: 0, fontSize: 13, color: "#5b6b7f" }}>
            Platzhalter: {"{{confirmUrl}}"} — wird durch den persönlichen Bestätigungslink ersetzt.
          </p>
          {template ? (
            <>
              <input
                value={template.subject}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                placeholder="Betreff"
                style={{ padding: 9, border: "1px solid #cfd8e3", borderRadius: 6 }}
              />
              <input
                value={template.heading}
                onChange={(e) => setTemplate({ ...template, heading: e.target.value })}
                placeholder="Überschrift"
                style={{ padding: 9, border: "1px solid #cfd8e3", borderRadius: 6 }}
              />
              <textarea
                value={template.body_md}
                onChange={(e) => setTemplate({ ...template, body_md: e.target.value })}
                rows={8}
                style={{ padding: 9, border: "1px solid #cfd8e3", borderRadius: 6, fontFamily: "ui-monospace, monospace" }}
              />
              <div>
                <button
                  onClick={saveTemplate}
                  style={{ padding: "9px 14px", borderRadius: 6, border: 0, background: "#2f7a2f", color: "#fff", fontWeight: 700 }}
                >
                  Vorlage speichern
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#5b6b7f" }}>Vorlage nicht gefunden.</p>
          )}
        </div>

        {/* Bans */}
        <div style={{ ...box }}>
          <strong>Gesperrte Adressen</strong>
          {bans.length === 0 ? (
            <p style={{ margin: "8px 0 0", color: "#5b6b7f" }}>Keine.</p>
          ) : (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {bans.map((b) => (
                <li key={b.email} style={{ marginBottom: 4 }}>
                  {b.email} <span style={{ color: "#5b6b7f" }}>({fmt(b.banned_at)})</span>{" "}
                  <button
                    onClick={() => unban(b.email)}
                    style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid #cfd8e3", background: "#fff" }}
                  >
                    Entsperren
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
