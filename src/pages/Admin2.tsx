import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Signup = {
  id: string;
  email: string;
  created_at: string;
  confirmed_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export default function Admin2() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);

  useEffect(() => {
    document.title = "Admin — freemind";
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const { data, error } = await supabase.functions.invoke("admin2-overview", {
      body: { password },
    });
    setBusy(false);
    if (error || !data?.ok) { setError(true); return; }
    setSignups(data.signups ?? []);
    setUnlocked(true);
    setPassword("");
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eaf2fb", fontFamily: "system-ui, sans-serif" }}>
        <form onSubmit={submit} style={{ background: "#fff", padding: 32, border: "1px solid #0f1b3d", minWidth: 320 }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>Admin</h1>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            style={{ width: "100%", padding: 10, border: "1px solid #0f1b3d", marginBottom: 12, fontSize: 14 }}
          />
          {error && <p style={{ color: "#c00", margin: "0 0 12px", fontSize: 13 }}>Falsches Passwort</p>}
          <button
            type="submit"
            disabled={busy}
            style={{ width: "100%", padding: 10, background: "#0f1b3d", color: "#fff", border: 0, fontSize: 14, cursor: "pointer" }}
          >
            {busy ? "…" : "Entsperren"}
          </button>
        </form>
      </div>
    );
  }

  const confirmed = signups.filter((s) => s.confirmed_at).length;

  return (
    <div style={{ minHeight: "100vh", background: "#eaf2fb", fontFamily: "system-ui, sans-serif", padding: 32, color: "#0f1b3d" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, textTransform: "uppercase", letterSpacing: "0.02em" }}>freemind admin</h1>
          <button
            onClick={() => { setUnlocked(false); setSignups([]); }}
            style={{ padding: "10px 14px", background: "transparent", color: "#0f1b3d", border: "1px solid #0f1b3d", fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Sign out
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Stat label="Signups" value={signups.length} />
          <Stat label="Bestätigt" value={confirmed} />
          <Stat label="Pending" value={signups.length - confirmed} />
        </section>

        <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: "0.05em", margin: "24px 0 8px" }}>Signups</h2>
        <div style={{ background: "#fff", border: "1px solid #0f1b3d", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #0f1b3d", textAlign: "left" }}>
                <th style={th}>Email</th>
                <th style={th}>Angemeldet</th>
                <th style={th}>Bestätigt</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #dbe4f0" }}>
                  <td style={td}>{s.email}</td>
                  <td style={td}>{fmt(s.created_at)}</td>
                  <td style={td}>{s.confirmed_at ? fmt(s.confirmed_at) : "—"}</td>
                </tr>
              ))}
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
const td: React.CSSProperties = { padding: "8px 10px" };
