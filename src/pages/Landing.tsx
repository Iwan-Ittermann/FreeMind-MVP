import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const panelClass =
  "snap-start min-h-screen w-full flex items-center justify-center px-5 sm:px-8 md:px-12 py-16 sm:py-20 md:py-24 border-b border-foreground/15";
const panelInner = "w-full max-w-5xl";
const eyebrowClass =
  "text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-alert";
const displayClass = "font-display font-black uppercase tracking-tighter leading-[0.9]";
const bodyProseClass = "text-lg sm:text-xl md:text-2xl leading-snug space-y-5 max-w-3xl";

function HeroFlash() {
  const [stage, setStage] = useState<"on" | "fading" | "done">("on");
  useEffect(() => {
    const t1 = requestAnimationFrame(() => setStage("fading"));
    const t2 = window.setTimeout(() => setStage("done"), 200);
    return () => {
      cancelAnimationFrame(t1);
      window.clearTimeout(t2);
    };
  }, []);
  if (stage === "done") return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        backgroundColor: "hsl(var(--alert))",
        opacity: stage === "on" ? 0.35 : 0,
        transition: "opacity 120ms ease-out",
      }}
    />
  );
}

function RainOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.05,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='24' viewBox='0 0 6 24'><line x1='5' y1='0' x2='0' y2='24' stroke='%230f1b3d' stroke-width='1'/></svg>\")",
        backgroundRepeat: "repeat",
      }}
    />
  );
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "already">("idle");

  useEffect(() => {
    document.title = "freemind — Die fairste politische Diskussion im Internet";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "20 Menschen. Eine Frage. Ein Tag. Ein Beweis, dass öffentliche Debatten anders funktionieren können.");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = email;
    const testMode = /^#\s+/.test(raw);
    const cleaned = testMode ? raw.replace(/^#\s+/, "") : raw;
    const parsed = z.string().trim().email().max(255).safeParse(cleaned);
    if (!parsed.success) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("signup-request", {
        body: { email: raw },
      });
      if (error) throw error;
      if (data?.status === "sent") {
        toast.success("Bestätigungs-E-Mail unterwegs.");
        setStatus("sent");
      } else if (data?.status === "already_confirmed") {
        toast.success("Du bist bereits dabei.");
        setStatus("already");
      } else {
        toast.error("Etwas ist schiefgelaufen. Bitte versuch es erneut.");
        setStatus("idle");
      }
    } catch {
      toast.error("Etwas ist schiefgelaufen. Bitte versuch es erneut.");
      setStatus("idle");
    }
  };

  return (
    <main
      lang="de"
      className="h-screen overflow-y-auto snap-y snap-proximity bg-background text-foreground font-sans relative"
    >
      <RainOverlay />
      <HeroFlash />
      <div className="relative z-[1]">

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col items-start gap-8`}>
          <p className={eyebrowClass}>23. - 30. AUGUST · EINE FRAGE</p>
          <h1
            className={`${displayClass} text-left`}
            style={{ fontSize: "clamp(2.25rem, 6.5vw, 5rem)" }}
          >
            DIE WAHRSCHEINLICH FAIRSTE POLITISCHE DISKUSSION IM INTERNET.
          </h1>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight space-y-2">
            <p>Nicht, weil Menschen netter sind.</p>
            <p>
              Sondern weil <span className="text-alert">die Spielregeln andere sind.</span>
            </p>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-snug">
            Die Frage: <span className="text-foreground font-bold">Welche Partei willst du für den Bundestag wählen und warum?</span>
          </p>
          <a
            href="#cta"
            className="inline-block border-b-2 border-foreground pb-1 text-sm font-bold uppercase tracking-wider hover:text-alert hover:border-alert transition-colors"
          >
            Jetzt registrieren
          </a>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Das Problem</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5.5vw, 4rem)" }}>
            ÖFFENTLICHE DEBATTEN SCHEITERN SELTEN AN DEN MENSCHEN.
          </h2>
          <div className={bodyProseClass}>
            <p>Sie scheitern an den Plattformen.</p>
            <p>Heute belohnen soziale Netzwerke <em>Aufmerksamkeit</em>.</p>
            <p className="text-alert font-bold">freemind belohnt <em>Verständnis</em>.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Die Idee</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
            WIR WOLLEN ETWAS BEWEISEN.<br />
            NICHT DISKUTIEREN.<br />
            <span className="text-alert">BEWEISEN.</span>
          </h2>
          <div className={bodyProseClass}>
            <p>Dass öffentliche Debatten keine Moderation brauchen, sondern die richtige Architektur.</p>
            <p>Wenn das funktioniert, ist diese Diskussion vielleicht mehr als nur eine Diskussion.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            Was passiert?
          </h2>
          <div className={bodyProseClass}>
            <p>Du beantwortest eine Frage.</p>
            <p>Du triffst Menschen, denen du wahrscheinlich nie begegnet wärst.</p>
            <p>Ihr widersprecht euch.</p>
            <p>Ihr versucht trotzdem, einander zu verstehen.</p>
            <p>Eine Woche lang wird der Graph lebendig.</p>
            <p>Überall entstehen neue Gespräche.</p>
            <p>Jede Unterhaltung verändert das Spielfeld.</p>
            <p>Bis am letzten Tag um Mitternacht feststeht, wer die stärksten Brücken gebaut hat.</p>
            <p className="font-bold">Ganz ohne Moderation.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            Über mich
          </h2>
          <div className={bodyProseClass}>
            <p>Seit Jahren frage ich mich, warum das Internet Millionen Menschen miteinander verbinden kann, aber so selten gute Gespräche entstehen.</p>
            <p className="font-bold">Diese Diskussion ist mein Versuch, das Gegenteil zu beweisen.</p>
          </div>
        </div>
      </section>

      <section id="cta" className={panelClass}>
        <div className={panelInner}>
          <h2 className={`${displayClass} mb-8`} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            HILF MIT HERAUSZUFINDEN, OB DAS INTERNET AUCH ANDERS FUNKTIONIEREN KANN.
          </h2>
          <p className="mb-10 text-lg sm:text-xl font-bold uppercase tracking-wide">
            EINE WOCHE · EINE FRAGE · <span className="text-alert">EIN BEWEIS.</span>
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-0 border-b-2 border-foreground">
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status !== "idle"}
              placeholder="E-Mail"
              className="flex-grow py-3.5 sm:py-4 outline-none text-sm font-bold uppercase placeholder:text-muted-foreground bg-transparent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status !== "idle"}
              className="bg-foreground text-background px-6 py-3.5 sm:px-8 sm:py-4 text-sm font-bold uppercase hover:bg-alert transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading"
                ? "Sende…"
                : status === "sent"
                  ? "Mail gesendet ✓"
                  : status === "already"
                    ? "Bereits dabei ✓"
                    : "Jetzt registrieren"}
            </button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground whitespace-pre-line">
            Als Gewinn gibt es 500 € zu gewinnen.{"\n"}
            Auszahlung per Paypal oder Banküberweisung.{"\u00a0"}{"\n"}
            Der Rechtsweg ist ausgeschlossen.
          </p>
          {status === "sent" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold normal-case sm:uppercase tracking-wide text-alert leading-snug">
              📬 Bestätigungs-E-Mail unterwegs — klick den Link darin, um deine Anmeldung abzuschließen.
            </p>
          )}
          {status === "already" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold normal-case sm:uppercase tracking-wide leading-snug">
              Du bist bereits bestätigt — danke!
            </p>
          )}
        </div>
      </section>

      <footer className="snap-start min-h-[40vh] w-full flex items-center px-5 sm:px-8 md:px-12 py-10">
        <div className={panelInner}>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest items-center">
            <span>freemind</span>
            <span className="text-muted-foreground">/</span>
            <a href="/legal" className="hover:text-alert">Impressum</a>
            <span className="text-muted-foreground">/</span>
            <a href="mailto:iwan@freemind.chat" className="hover:text-alert">Kontakt</a>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}
