import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Report = {
  id: string;
  report_date: string;
  title: string;
  body_md: string;
  stats: Record<string, number> | null;
};

const STAT_LABELS: Array<{ key: string; label: string }> = [
  { key: "opinionsNew", label: "neue Meinungen" },
  { key: "chatsNew", label: "neue Diskussionen" },
  { key: "messagesNew", label: "Nachrichten" },
  { key: "ratingsNew", label: "Bewertungen" },
];

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Stats({ stats }: { stats: Record<string, number> | null }) {
  if (!stats) return null;
  const items = STAT_LABELS.filter((s) => typeof stats[s.key] === "number");
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, margin: "0 0 16px" }}>
      {items.map((s) => (
        <div key={s.key}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{stats[s.key]}</span>{" "}
          <span style={{ fontSize: 12, opacity: 0.7 }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Bericht() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Tagesberichte — freemind";
    (async () => {
      const { data } = await supabase
        .from("daily_reports")
        .select("id, report_date, title, body_md, stats")
        .order("report_date", { ascending: false });
      setReports((data ?? []) as unknown as Report[]);
      setLoading(false);
    })();
  }, []);

  const [latest, ...older] = reports;

  return (
    <div style={{ minHeight: "100vh", background: "#eaf2fb", color: "#0f1b3d", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 96px" }}>
        <Link to="/" style={{ fontSize: 13, color: "#0f1b3d", textDecoration: "none", opacity: 0.7 }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 36, margin: "16px 0 8px", letterSpacing: "-0.01em" }}>Tagesberichte</h1>
        <p style={{ margin: "0 0 32px", opacity: 0.75 }}>
          Was jeden Tag diskutiert wurde — zusammengefasst.
        </p>

        {loading ? (
          <p style={{ opacity: 0.6 }}>Lädt…</p>
        ) : reports.length === 0 ? (
          <p style={{ opacity: 0.6 }}>Noch keine Berichte.</p>
        ) : (
          <>
            <article style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, margin: "0 0 4px" }}>{latest.title}</h2>
              <p style={{ fontSize: 12, opacity: 0.6, margin: "0 0 12px" }}>{fmtDate(latest.report_date)}</p>
              <Stats stats={latest.stats} />
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, opacity: 0.9 }}>{latest.body_md}</div>
            </article>

            {older.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, margin: "0 0 8px" }}>
                  Frühere Berichte
                </h3>
                <Accordion type="multiple" className="w-full">
                  {older.map((r) => (
                    <AccordionItem key={r.id} value={r.id} className="border-b border-[#0f1b3d]/20">
                      <AccordionTrigger className="text-left text-base font-medium text-[#0f1b3d] hover:no-underline">
                        {r.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-[#0f1b3d]/80 leading-relaxed">
                        <Stats stats={r.stats} />
                        <div style={{ whiteSpace: "pre-wrap" }}>{r.body_md}</div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
