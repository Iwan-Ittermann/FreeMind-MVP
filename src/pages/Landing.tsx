import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

type Lang = "en" | "de";

const copy = {
  en: {
    heroEyebrow: "ONE QUESTION · FOUR DAYS",
    heroTitle: "PROBABLY THE FAIREST POLITICAL DISCUSSION ON THE INTERNET.",
    heroSub1: "Not because people are nicer here.",
    heroSub2a: "But because ",
    heroSub2b: "the rules of the game are different.",
    ctaSandbox: "Try the sandbox",
    ctaAugust: "Try the August question",
    problemEyebrow: "The problem",
    problemTitle: "PUBLIC DEBATE RARELY FAILS BECAUSE OF PEOPLE.",
    problem1: "It fails because of the platforms.",
    problem2a: "Social networks reward ",
    problem2b: "attention",
    problem3a: "freemind rewards ",
    problem3b: "understanding",
    ideaEyebrow: "The idea",
    ideaTitle1: "WE WANT TO PROVE SOMETHING.",
    ideaTitle2: "NOT ARGUE ABOUT IT.",
    ideaTitle3: "PROVE IT.",
    idea1: "That public debate does not need moderation, but the right architecture.",
    idea2: "If that works, a discussion here is more than just a discussion.",
    whatTitle: "What happens?",
    what: [
      "You answer one question.",
      "You meet people you would probably never have met.",
      "You disagree.",
      "And you still try to understand each other.",
      "The graph comes alive.",
      "New conversations appear everywhere.",
      "Every conversation changes the playing field.",
      "The last day shows who built the strongest bridges.",
    ],
    whatBold: "Without any moderation.",
    aboutTitle: "About me",
    about1: "For years I have wondered why the internet can connect millions of people, yet good conversations are so rare.",
    about2: "freemind is my attempt to prove the opposite.",
    ctaTitle: "HELP FIND OUT WHETHER THE INTERNET CAN WORK DIFFERENTLY.",
    ctaLine1: "FOUR DAYS · ONE QUESTION · ",
    ctaLine2: "ONE PROOF.",
    emailPlaceholder: "Email",
    btnLoading: "Sending…",
    btnSent: "Mail sent ✓",
    btnAlready: "Already in ✓",
    btnIdle: "Register for future events",
    fine1: "Register once and we will let you know before the next event starts.",
    sentNote: "📬 Confirmation email on its way — click the link inside to complete your registration.",
    alreadyNote: "You are already confirmed — thank you!",
    imprint: "Imprint",
    questions: "Questions",
    contact: "Contact",
    errInvalidMail: "Please enter a valid email address.",
    okSent: "Confirmation email on its way.",
    okAlready: "You are already in.",
    errGeneric: "Something went wrong. Please try again.",
  },
  de: {
    heroEyebrow: "EINE FRAGE · VIER TAGE",
    heroTitle: "WAHRSCHEINLICH DIE FAIRSTE POLITISCHE DISKUSSION IM INTERNET.",
    heroSub1: "Nicht weil die Menschen hier netter sind.",
    heroSub2a: "Sondern weil ",
    heroSub2b: "die Spielregeln andere sind.",
    ctaSandbox: "Sandbox ausprobieren",
    ctaAugust: "August-Frage ausprobieren",
    problemEyebrow: "Das Problem",
    problemTitle: "ÖFFENTLICHE DEBATTE SCHEITERT SELTEN AN DEN MENSCHEN.",
    problem1: "Sie scheitert an den Plattformen.",
    problem2a: "Soziale Netzwerke belohnen ",
    problem2b: "Aufmerksamkeit",
    problem3a: "freemind belohnt ",
    problem3b: "Verständnis",
    ideaEyebrow: "Die Idee",
    ideaTitle1: "WIR WOLLEN ETWAS BEWEISEN.",
    ideaTitle2: "NICHT DARÜBER STREITEN.",
    ideaTitle3: "BEWEISEN.",
    idea1: "Dass öffentliche Debatte keine Moderation braucht, sondern die richtige Architektur.",
    idea2: "Wenn das funktioniert, ist eine Diskussion hier mehr als nur eine Diskussion.",
    whatTitle: "Was passiert?",
    what: [
      "Du beantwortest eine Frage.",
      "Du triffst Menschen, die du sonst nie getroffen hättest.",
      "Du bist anderer Meinung.",
      "Und versuchst trotzdem, einander zu verstehen.",
      "Der Graph wird lebendig.",
      "Überall entstehen neue Gespräche.",
      "Jedes Gespräch verändert das Spielfeld.",
      "Am letzten Tag zeigt sich, wer die stärksten Brücken gebaut hat.",
    ],
    whatBold: "Ganz ohne Moderation.",
    aboutTitle: "Über mich",
    about1: "Seit Jahren frage ich mich, warum das Internet Millionen Menschen verbinden kann und gute Gespräche trotzdem so selten sind.",
    about2: "freemind ist mein Versuch, das Gegenteil zu beweisen.",
    ctaTitle: "HILF HERAUSZUFINDEN, OB DAS INTERNET ANDERS FUNKTIONIEREN KANN.",
    ctaLine1: "VIER TAGE · EINE FRAGE · ",
    ctaLine2: "EIN BEWEIS.",
    emailPlaceholder: "E-Mail",
    btnLoading: "Wird gesendet…",
    btnSent: "Mail gesendet ✓",
    btnAlready: "Schon dabei ✓",
    btnIdle: "Für kommende Events anmelden",
    fine1: "Ein kommendes Event läuft vier Tage. Melde dich einmal an, wir informieren dich vor dem Start.",
    fine2: "Die fünf besten Brückenbauer erhalten je 50 € als Dankeschön.",
    fine3: "Der Rechtsweg ist ausgeschlossen.",
    sentNote: "📬 Bestätigungs-E-Mail unterwegs — klick den Link darin, um die Anmeldung abzuschließen.",
    alreadyNote: "Du bist bereits bestätigt — danke!",
    imprint: "Impressum",
    questions: "Fragen",
    contact: "Kontakt",
    errInvalidMail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    okSent: "Bestätigungs-E-Mail unterwegs.",
    okAlready: "Du bist bereits dabei.",
    errGeneric: "Etwas ist schiefgelaufen. Bitte versuch es erneut.",
  },
} as const;

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
  return null;
}

export default function Landing() {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith("de") ? "de" : "en";
  const c = copy[lang];
  const setLang = (next: Lang) => {
    i18n.changeLanguage(next);
    try {
      localStorage.setItem("freemind_lang", next);
    } catch {
      /* ignore */
    }
  };
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "already">("idle");

  useEffect(() => {
    document.title =
      lang === "de"
        ? "freemind — eine Frage, mehr Verständnis, weniger Spaltung"
        : "freemind — one question, more understanding, less division";
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        "content",
        lang === "de"
          ? "Können wir noch miteinander reden? Probier die freemind-Sandbox und sieh, wie eine faire Diskussion aussieht."
          : "Can we still talk to each other? Try the freemind sandbox and see what a fair discussion looks like.",
      );
  }, [lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = email;
    const testMode = /^#\s+/.test(raw);
    const cleaned = testMode ? raw.replace(/^#\s+/, "") : raw;
    const parsed = z.string().trim().email().max(255).safeParse(cleaned);
    if (!parsed.success) {
      toast.error(c.errInvalidMail);
      return;
    }
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("signup-request", {
        body: { email: raw },
      });
      if (error) throw error;
      if (data?.status === "sent") {
        toast.success(c.okSent);
        setStatus("sent");
      } else if (data?.status === "already_confirmed") {
        toast.success(c.okAlready);
        setStatus("already");
      } else {
        toast.error(c.errGeneric);
        setStatus("idle");
      }
    } catch {
      toast.error(c.errGeneric);
      setStatus("idle");
    }
  };

  return (
    <main
      lang={lang}
      className="landing-theme h-screen overflow-y-auto snap-y snap-proximity bg-background text-foreground font-sans relative"
    >
      <div className="fixed top-3 right-3 z-[40] flex items-center border border-foreground/40 bg-background/80 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest">
        {(["de", "en"] as Lang[]).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            className={`px-2.5 py-1.5 transition-colors ${
              lang === code
                ? "bg-foreground text-background"
                : "text-foreground/70 hover:text-alert"
            }`}
          >
            {code}
          </button>
        ))}
      </div>
      <RainOverlay />
      <HeroFlash />
      <div className="relative z-[1]">

      <section className={`${panelClass} relative overflow-hidden`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "clamp(48px, 12vw, 120px) 100%",
          }}
        />
        <div className={`${panelInner} relative flex flex-col items-start gap-10`}>
          <p className={`${eyebrowClass} flex items-center gap-3`}>
            <span className="inline-block h-2 w-2 rounded-full bg-alert animate-pulse" />
            {c.heroEyebrow}
          </p>
          <h1
            className={`${displayClass} text-left`}
            style={{ fontSize: "clamp(2.25rem, 6.5vw, 5rem)" }}
          >
            {c.heroTitle}
          </h1>
          <div className="w-16 h-[3px] bg-alert" />
          <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight space-y-2">
            <p>{c.heroSub1}</p>
            <p>
              {c.heroSub2a}<span className="text-alert">{c.heroSub2b}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="/go"
              className="group inline-flex items-center gap-3 bg-foreground text-background px-7 py-4 text-sm font-bold uppercase tracking-wider hover:bg-alert transition-colors"
            >
              {c.ctaSandbox}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="/aug-test"
              className="text-sm font-bold uppercase tracking-wider underline underline-offset-4 hover:text-alert transition-colors"
            >
              {c.ctaAugust}
            </a>
            <a
              href="/passphrase-vergessen"
              className="text-sm text-foreground/60 underline underline-offset-4 hover:text-alert transition-colors"
            >
              {"\n"}
            </a>
          </div>
        </div>
      </section>


      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>{c.problemEyebrow}</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5.5vw, 4rem)" }}>
            {c.problemTitle}
          </h2>
          <div className={bodyProseClass}>
            <p>{c.problem1}</p>
            <p>{c.problem2a}<em>{c.problem2b}</em>.</p>
            <p className="text-alert font-bold">{c.problem3a}<em>{c.problem3b}</em>.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>{c.ideaEyebrow}</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
            {c.ideaTitle1}<br />
            {c.ideaTitle2}<br />
            <span className="text-alert">{c.ideaTitle3}</span>
          </h2>
          <div className={bodyProseClass}>
            <p>{c.idea1}</p>
            <p>{c.idea2}</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            {c.whatTitle}
          </h2>
          <div className={bodyProseClass}>
            {c.what.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="font-bold">{c.whatBold}</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            {c.aboutTitle}
          </h2>
          <div className={bodyProseClass}>
            <p>{c.about1}</p>
            <p className="font-bold">{c.about2}</p>
          </div>
        </div>
      </section>

      <section id="cta" className={panelClass}>
        <div className={panelInner}>
          <h2 className={`${displayClass} mb-8`} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            {c.ctaTitle}
          </h2>
          <p className="mb-10 text-lg sm:text-xl font-bold uppercase tracking-wide">
            {c.ctaLine1}<span className="text-alert">{c.ctaLine2}</span>
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-0 border border-foreground">
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status !== "idle"}
              placeholder={c.emailPlaceholder}
              className="flex-grow py-3.5 sm:py-4 outline-none text-sm font-bold uppercase placeholder:text-muted-foreground bg-transparent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status !== "idle"}
              className="bg-foreground text-background px-6 py-3.5 sm:px-8 sm:py-4 text-sm font-bold uppercase hover:bg-alert transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading"
                ? c.btnLoading
                : status === "sent"
                  ? c.btnSent
                  : status === "already"
                    ? c.btnAlready
                    : c.btnIdle}
            </button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground whitespace-pre-line">
            {c.fine1}
          </p>
          {status === "sent" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold normal-case sm:uppercase tracking-wide text-alert leading-snug">
              {c.sentNote}
            </p>
          )}
          {status === "already" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold normal-case sm:uppercase tracking-wide leading-snug">
              {c.alreadyNote}
            </p>
          )}
        </div>
      </section>

      <footer className="snap-start min-h-[40vh] w-full flex items-center px-5 sm:px-8 md:px-12 py-10">
        <div className={panelInner}>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest items-center">
            <span>freemind</span>
            <span className="text-muted-foreground">/</span>
            <a href="/legal" className="hover:text-alert">{c.imprint}</a>
            <span className="text-muted-foreground">/</span>
            <a href="/fragen" className="hover:text-alert">{c.questions}</a>
            <span className="text-muted-foreground">/</span>
            <a href="mailto:iwan@freemind.chat" className="hover:text-alert">{c.contact}</a>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}
