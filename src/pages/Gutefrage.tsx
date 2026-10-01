import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useLocation } from "react-router-dom";
import { readGfAttribution, getAnalyticsId, trackGfLandingView } from "@/lib/gutefrageAttribution";

const panelClass =
  "snap-start min-h-screen w-full flex items-center justify-center px-5 sm:px-8 md:px-12 py-16 sm:py-20 md:py-24 border-b border-foreground/15";
const panelInner = "w-full max-w-5xl";
const eyebrowClass =
  "text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-alert";
const displayClass = "font-display font-black uppercase tracking-tighter leading-[0.9]";
const bodyProseClass = "text-lg sm:text-xl md:text-2xl leading-snug space-y-5 max-w-3xl";

const GOAL = 100;

type Stats = { confirmed: number; goal: number; eventDate: string | null };

/** Text stand-in for the Gutefrage.net wordmark. */
function GutefrageMark() {
  return (
    <span className="font-display text-xl sm:text-2xl font-black lowercase tracking-tight text-foreground">
      gutefrage
      <span className="text-alert">.net</span>
    </span>
  );
}

export default function Gutefrage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "already">("idle");
  const [stats, setStats] = useState<Stats | null>(null);
  const location = useLocation();

  useEffect(() => {
    trackGfLandingView(location.key);
  }, [location.key]);

  useEffect(() => {
    document.title = "freemind x Gutefrage.net — Live-Event im November 2026";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Vorregistrierung für das Live-Event im November: Wie kann die Moderation auf Gutefrage.net verbessert werden? Ab 100 Anmeldungen steht das Datum.",
      );
    }
  }, []);

  const loadStats = async () => {
    const { data } = await supabase.functions.invoke("gutefrage-stats", { body: {} });
    if (data) setStats(data as Stats);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const confirmed = stats?.confirmed ?? 0;
  const goal = stats?.goal ?? GOAL;
  const reached = confirmed >= goal;
  const percent = Math.min(100, Math.round((confirmed / Math.max(goal, 1)) * 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email.replace(/^#\s+/, ""));
    if (!parsed.success) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein.");
      trackEvent("signup_form_submitted", { page: "gutefrage", result: "invalid_email" });
      return;
    }
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("gutefrage-signup-request", {
        body: { email, attribution: readGfAttribution(), analytics_id: getAnalyticsId() },
      });
      if (error) throw error;
      if (data?.status === "sent") {
        toast.success("Bestätigungs-E-Mail unterwegs.");
        setStatus("sent");
        trackEvent("signup_form_submitted", { page: "gutefrage", result: "sent" });
      } else if (data?.status === "already_confirmed") {
        toast.success("Du bist bereits dabei.");
        setStatus("already");
        trackEvent("signup_form_submitted", { page: "gutefrage", result: "already_confirmed" });
      } else {
        toast.error("Etwas ist schiefgelaufen. Bitte versuch es erneut.");
        setStatus("idle");
        trackEvent("signup_form_submitted", { page: "gutefrage", result: "error" });
      }
    } catch {
      toast.error("Etwas ist schiefgelaufen. Bitte versuch es erneut.");
      setStatus("idle");
      trackEvent("signup_form_submitted", { page: "gutefrage", result: "error" });
    }
  };

  const Counter = ({ compact = false }: { compact?: boolean }) => (
    <div className={compact ? "max-w-2xl" : "max-w-3xl"}>
      <div className="flex items-baseline gap-3">
        <span className={`${displayClass} text-alert`} style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}>
          {confirmed}
        </span>
        <span className="text-lg sm:text-xl font-bold uppercase tracking-wide">
          von {goal} Anmeldungen
        </span>
      </div>
      <div className="mt-4 h-3 w-full border border-foreground/40 bg-background">
        <div
          className="h-full gutefrage-gradient transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-4 text-base sm:text-lg">
        {stats?.eventDate
          ? <>Das Datum steht: <strong>{stats.eventDate}</strong></>
          : reached
            ? "Ziel erreicht — das Datum steht bald fest."
            : `Bei ${goal} bestätigten Anmeldungen legen wir das genaue Datum fest.`}
      </p>
    </div>
  );

  return (
    <main
      lang="de"
      className="gutefrage-theme h-screen overflow-y-auto snap-y snap-proximity bg-background text-foreground font-sans relative"
    >
      {/* Top bar: co-branding */}
      <div className="fixed top-0 inset-x-0 z-[40] flex items-center justify-between gap-3 px-4 py-2.5 border-b border-foreground/20 bg-background/80 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-2.5">
          <span className="font-display text-xl sm:text-2xl font-black uppercase tracking-tighter">
            freemind
          </span>
          <span className="text-sm font-bold text-alert">x</span>
          <GutefrageMark />
        </a>
        <a
          href="#cta"
          className="text-[10px] font-bold uppercase tracking-widest border border-foreground/40 px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors"
        >
          Vorregistrieren
        </a>
      </div>

      {/* Hero */}
      <section className={`${panelClass} gutefrage-gradient relative overflow-hidden pt-24`}>
        <div className={`${panelInner} relative flex flex-col items-start gap-8`}>
          <p className={`${eyebrowClass} flex items-center gap-3`}>
            <span className="inline-block h-2 w-2 rounded-full bg-alert animate-pulse" />
            FREEMIND X GUTEFRAGE.NET · LIVE-EVENT IM NOVEMBER 2026
          </p>
          <h1 className={`${displayClass} text-left`} style={{ fontSize: "clamp(2.25rem, 6.5vw, 5rem)" }}>
            EINE FRAGE. VIELE MEINUNGEN. EIN ECHTES GESPRÄCH.
          </h1>
          <div className="w-16 h-[3px] bg-alert" />
          <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight space-y-2">
            <p>Die Community von Gutefrage.net diskutiert über ihre eigene Plattform.</p>
            <p>
              freemind sorgt dafür, dass daraus{" "}
              <span className="text-alert">mehr als ein Kommentarfeld wird.</span>
            </p>
          </div>
          <a
            href="#cta"
            className="group inline-flex items-center gap-3 bg-foreground text-background px-7 py-4 text-sm font-bold uppercase tracking-wider hover:bg-alert transition-colors"
          >
            Jetzt vorregistrieren
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
      </section>

      {/* The question */}
      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Die Frage</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5.5vw, 4rem)" }}>
            WIE KANN DIE MODERATION AUF GUTEFRAGE.NET VERBESSERT WERDEN?
          </h2>
          <div className={bodyProseClass}>
            <p>
              Über Moderation wird viel gestritten: zu viel, zu wenig, zu willkürlich. Gefragt wird
              selten, was die Menschen wollen, die dort täglich schreiben.
            </p>
            <p>
              Genau das machen wir: Du beantwortest die Frage in eigenen Worten — kein Like, kein
              Daumen runter, keine Umfrage mit vier Antwortmöglichkeiten.
            </p>
            <p className="font-bold">Und dann sprichst du mit Menschen, die es anders sehen.</p>
          </div>
        </div>
      </section>

      {/* Counter */}
      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Der Stand</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            AB 100 GEHT ES LOS.
          </h2>
          <Counter />
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground">
            Gezählt werden nur bestätigte Anmeldungen — also alle, die den Link in ihrer Mail
            angeklickt haben. Sobald das Datum steht, bekommst du es per Mail.
          </p>
        </div>
      </section>

      {/* What happens */}
      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            Was passiert?
          </h2>
          <div className={bodyProseClass}>
            <p>Es beginnt damit, dass du eine Frage beantwortest.</p>
            <p>Dann triffst du Menschen, die du sonst nie getroffen hättest.</p>
            <p>Könnt ihr euch verstehen, auch wenn ihr stark anderer Meinung seid?</p>
            <p>
              Jedes Gespräch erscheint live im Graph — einer lebendigen Visualisierung der
              Diskussion.
            </p>
            <p>Tagelang rückt der Graph die Brückenbauer ins Zentrum.</p>
            <p className="font-bold">
              Gebaut, um <em>moderat</em> zu sein, nicht moderiert.
            </p>
          </div>
          <div className="max-w-3xl border-t border-foreground/20 pt-6">
            <p className="text-base sm:text-lg text-muted-foreground">
              Du hast noch Fragen? Gerne{" "}
              <a
                href="/fragen"
                className="font-bold text-alert underline underline-offset-4 hover:no-underline"
              >
                hier
              </a>{" "}
              stellen!
            </p>
          </div>
        </div>
      </section>

      {/* Registration */}
      <section id="cta" className={`${panelClass} gutefrage-gradient`}>
        <div className={panelInner}>
          <h2 className={`${displayClass} mb-8`} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            SEI DABEI!
          </h2>
          <p className="mb-8 text-lg sm:text-xl font-bold uppercase tracking-wide">
            LIVE-EVENT IM NOVEMBER ·{" "}
            <span className="text-alert">
              {stats?.eventDate ? stats.eventDate : "DATUM AB 100 ANMELDUNGEN"}
            </span>
          </p>
          <div className="mb-10">
            <Counter compact />
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-0 border border-foreground">
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status !== "idle"}
              placeholder="E-Mail"
              className="flex-grow px-4 py-3.5 sm:py-4 outline-none text-sm font-bold uppercase placeholder:text-muted-foreground bg-transparent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status !== "idle"}
              className="bg-foreground text-background px-6 py-3.5 sm:px-8 sm:py-4 text-sm font-bold uppercase hover:bg-alert transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading"
                ? "Wird gesendet…"
                : status === "sent"
                  ? "Mail gesendet ✓"
                  : status === "already"
                    ? "Schon dabei ✓"
                    : "Für das Event vorregistrieren"}
            </button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground max-w-2xl">
            Du bekommst eine Bestätigungs-Mail und später eine Mail mit dem genauen Termin. Abmelden
            jederzeit mit einem Klick.
          </p>
          {status === "sent" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold leading-snug text-alert">
              📬 Bestätigungs-E-Mail unterwegs — klick den Link darin, um die Vorregistrierung
              abzuschließen.
            </p>
          )}
          {status === "already" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold leading-snug">
              Du bist bereits bestätigt — danke!
            </p>
          )}
        </div>
      </section>

      <footer className="snap-start min-h-[40vh] w-full flex items-center px-5 sm:px-8 md:px-12 py-10">
        <div className={panelInner}>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest items-center">
            <span>freemind</span>
            <span className="text-muted-foreground">x</span>
            <a
              href="https://www.gutefrage.net"
              className="hover:text-alert"
              rel="noreferrer"
              target="_blank"
            >
              gutefrage.net
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="/legal" className="hover:text-alert">
              Impressum
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="/fragen" className="hover:text-alert">
              Fragen
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="mailto:iwan@freemind.chat" className="hover:text-alert">
              Kontakt
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
