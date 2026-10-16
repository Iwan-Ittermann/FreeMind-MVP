import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { EventSimulationEmbed } from "@/components/EventSimulationEmbed";
import { Button } from "@/components/ui/button";
// Dark (navy) wordmark: the /wedium top bar is a pale blush surface, so the white
// variant's "dium" half disappears there. The white one stays for /wedium/go and the sim.
import wediumLogo from "@/assets/wedium-logo-rgb-pos.png.asset.json";

const panelClass =
  "snap-start min-h-screen w-full flex items-center justify-center px-5 sm:px-8 md:px-12 py-16 sm:py-20 md:py-24 border-b border-foreground/15";
const panelInner = "w-full max-w-5xl";
const eyebrowClass =
  "text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-alert";
const displayClass = "font-display font-black uppercase tracking-tighter leading-[0.9]";
const bodyProseClass = "text-lg sm:text-xl md:text-2xl leading-snug space-y-5 max-w-3xl";

type Lang = "en" | "de";


const copy = {
  de: {
    metaTitle: "wedium x freemind — Live-Event 10.–14. Oktober 2026",
    metaDesc:
      "wedium-Creator und ihre Communities diskutieren vier Tage lang eine Frage: Welche Gesetze wünschst du dir für soziale Medien?",
    heroEyebrow: "WEDIUM X FREEMIND · 28.–31. OKTOBER 2026",
    heroTitle: "VIER TAGE. EINE FRAGE. 100 MEINUNGEN.",
    heroSub1: "wedium steht für echte Menschen.",
    heroSub2a: "freemind gibt euch den Raum für ",
    heroSub2b: "echte Gespräche.",
    ctaPrimary: "MITMACHEN",
    ctaSecondary: "Wie funktioniert's? ",
    questionEyebrow: "Die Frage",
    questionTitle: "WAS WÜRDEST DU AN SOCIAL MEDIA ÄNDERN? ",
    questionNote: "\n",
    question1:
      "Alle beschweren sich über soziale Medien. Fast niemand fragt die Nutzer:innen, was sie verbessern würden. ",
    question2:
      "Genau das machen wir: Du beantwortest die Frage in eigenen Worten — kein Like, kein Kommentar.",
    question3: "Und dann sprichst du mit Menschen, die es anders sehen.",
    experimentEyebrow: "Das Experiment",
    experimentTitle: "WAS SOLL DAS? ",
    exp1a: "Herkömmliche soziale Netzwerke belohnen ",
    exp1b: "Aufmerksamkeit",
    exp2a: "freemind und wedium belohnen ",
    exp2b: "Echtheit",
    exp3: "Können wir noch produktiv diskutieren? Finde es mit uns heraus – und lerne 4 Tage lang neue Perspektiven kennen.",
    whatTitle: "Was passiert?",
    what: [
      "Es beginnt damit, dass du eine Frage beantwortest.",
      "Dann triffst du Menschen, die du sonst nie getroffen hättest.",
      "Könnt ihr euch verstehen, auch wenn ihr stark anderer Meinung seid?",
      "Jedes Gespräch erscheint live im Graph — einer lebendigen Visualisierung der Diskussion.",
      "Vier Tage lang rückt der Graph die Brückenbauer:innen ins Zentrum.",
    ],
    whatBold: "Gebaut für echte Gespräche.",
    faqLeadBefore: "Du hast noch Fragen? Gerne ",
    faqLinkWord: "hier",
    faqLeadAfter: " stellen!",
    faqLink: "Häufige Fragen ansehen →",
    creatorsEyebrow: "Die Creator",
    creatorsTitle: "FÜNF STIMMEN, FÜNF COMMUNITIES.",
    creatorsNote: "Namen, Bilder und Zitate folgen.",
    creatorName: "Creator folgt",
    creatorHandle: "@wedium",
    creatorQuote: "„Zitat folgt.“",

    ctaTitle: "SEI DABEI!",
    ctaLine1: "28.–31. OKTOBER 2026 · ",
    ctaLine2: "HILF UNS ZU BEWEISEN, DASS ECHTE GESPRÄCHE IM INTERNET MÖGLICH SIND. ",
    emailPlaceholder: "E-Mail",
    btnLoading: "Wird gesendet…",
    btnSent: "Mail gesendet ✓",
    btnAlready: "Schon dabei ✓",
    btnIdle: "REGISTRIEREN",
    fine1:
      "Bitte bestätige deine E-Mail, schau auch im Spam nach. Wir schicken dir alle Informationen vor dem Start. \nAbmelden jederzeit mit einem Klick.",
    sentNote:
      "📬 Bestätigungs-E-Mail unterwegs — klick den Link darin, um die Anmeldung abzuschließen.",
    alreadyNote: "Du bist bereits bestätigt — danke!",
    imprint: "Impressum",
    questions: "Fragen",
    contact: "Kontakt",
    errInvalidMail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    okSent: "Bestätigungs-E-Mail unterwegs.",
    okAlready: "Du bist bereits dabei.",
    errGeneric: "Etwas ist schiefgelaufen. Bitte versuch es erneut.",
  },
  en: {
    metaTitle: "wedium x freemind — live event 10–14 October 2026",
    metaDesc:
      "wedium creators and their communities discuss one question for five days: which laws do you want for social media?",
    heroEyebrow: "WEDIUM X FREEMIND · 10–14 OCTOBER 2026",
    heroTitle: "FIVE DAYS. ONE QUESTION. ONE PROOF.",
    heroSub1: "wedium creators bring their communities together.",
    heroSub2a: "freemind makes sure it turns into ",
    heroSub2b: "a real conversation.",
    ctaPrimary: "Save your spot",
    ctaSecondary: "Try it beforehand",
    questionEyebrow: "The question",
    questionTitle: "WHICH LAWS DO YOU WANT FOR SOCIAL MEDIA?",
    questionNote: "Working title — the final wording follows.",
    question1:
      "Everyone talks about social media. Almost nobody is asked which rules they actually want.",
    question2:
      "That is exactly what we do: you answer the question in your own words — no like, no comment, no poll with four options.",
    question3: "And then you talk to people who see it differently.",
    experimentEyebrow: "The experiment",
    experimentTitle: "FIELD TEST #2 — THIS TIME WITH YOU.",
    exp1a: "Social networks reward ",
    exp1b: "attention",
    exp2a: "freemind rewards ",
    exp2b: "understanding",
    exp3: "And we measure it: before and after the event we ask how you feel about the other side.",
    whatTitle: "What happens?",
    what: [
      "It starts with you answering one question.",
      "Then you meet people you would probably never have met.",
      "Can you understand each other, even if you strongly disagree?",
      "Every conversation appears live on the graph — a living visualisation of the discussion.",
      "For five days, the graph puts the bridge builders at the centre of attention.",
    ],
    whatBold: "Built to be _moderate_, not moderated.",
    faqLeadBefore: "Have questions? Feel free to ask them ",
    faqLinkWord: "here",
    faqLeadAfter: ".",
    faqLink: "Read the FAQ →",
    creatorsEyebrow: "The creators",
    creatorsTitle: "FIVE VOICES, FIVE COMMUNITIES.",
    creatorsNote: "Names, pictures and quotes to follow.",
    creatorName: "Creator to follow",
    creatorHandle: "@wedium",
    creatorQuote: "“Quote to follow.”",

    ctaTitle: "BE THERE WHEN WE TRY IT AGAIN.",
    ctaLine1: "10–14 OCTOBER 2026 · ",
    ctaLine2: "ONE PROOF.",
    emailPlaceholder: "Email",
    btnLoading: "Sending…",
    btnSent: "Mail sent ✓",
    btnAlready: "Already in ✓",
    btnIdle: "Reserve my place",
    fine1:
      "Confirm your email to reserve your place. You will receive your access before the start and a short evening email during the event. Unsubscribe any time with one click.",
    sentNote:
      "📬 Confirmation email on its way — click the link inside to complete your registration.",
    alreadyNote: "You are already confirmed — thank you!",
    imprint: "Imprint",
    questions: "Questions",
    contact: "Contact",
    errInvalidMail: "Please enter a valid email address.",
    okSent: "Confirmation email on its way.",
    okAlready: "You are already in.",
    errGeneric: "Something went wrong. Please try again.",
  },
} as const;

function EmText({ children }: { children: string }) {
  const parts = children.split(/_(.+?)_/);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part))}</>;
}

function WediumMark() {
  return (
    <img src={wediumLogo.url} alt="wedium" className="h-[18px] sm:h-[22px] w-auto object-contain" />
  );
}

export default function Wedium() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith("en") ? "en" : "de";
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
    document.title = c.metaTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", c.metaDesc);
  }, [c]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = email;
    const cleaned = raw.replace(/^#\s+/, "");
    const parsed = z.string().trim().email().max(255).safeParse(cleaned);
    if (!parsed.success) {
      toast.error(c.errInvalidMail);
      trackEvent("signup_form_submitted", { page: "wedium", result: "invalid_email" });
      return;
    }
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("wedium-signup-request", {
        body: { email: raw },
      });

      if (error) throw error;
      if (data?.status === "sent") {
        toast.success(c.okSent);
        setStatus("sent");
        trackEvent("signup_form_submitted", { page: "wedium", result: "sent" });
      } else if (data?.status === "already_confirmed") {
        toast.success(c.okAlready);
        setStatus("already");
        trackEvent("signup_form_submitted", { page: "wedium", result: "already_confirmed" });
      } else {
        toast.error(c.errGeneric);
        setStatus("idle");
        trackEvent("signup_form_submitted", { page: "wedium", result: "error" });
      }
    } catch {
      toast.error(c.errGeneric);
      setStatus("idle");
      trackEvent("signup_form_submitted", { page: "wedium", result: "error" });
    }
  };

  return (
    <main
      lang={lang}
      className="wedium-theme h-screen overflow-y-auto snap-y snap-proximity bg-background text-foreground font-sans relative"
    >
      {/* Top bar: co-branding + language switch */}
      <div className="fixed top-0 inset-x-0 z-[40] flex items-center justify-between gap-3 px-4 py-2.5 border-b border-foreground/20 bg-background/80 backdrop-blur-sm">
        <a href="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-xl sm:text-2xl leading-none font-black uppercase tracking-tighter">
            freemind
          </span>
          <span className="text-sm font-bold text-alert">x</span>
          <WediumMark />
        </a>
        <div className="flex items-center border border-foreground/40 text-[10px] font-bold uppercase tracking-widest">
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
      </div>

      {/* Hero */}
      <section className={`${panelClass} wedium-gradient relative overflow-hidden pt-24`}>
        <div className={`${panelInner} relative flex flex-col items-start gap-8`}>
          <p className={`${eyebrowClass} flex items-center gap-3`}>
            <span className="inline-block h-2 w-2 rounded-full bg-alert animate-pulse" />
            {c.heroEyebrow}
          </p>
          <h1 className={`${displayClass} text-left`} style={{ fontSize: "clamp(2.25rem, 6.5vw, 5rem)" }}>
            {c.heroTitle}
          </h1>
          <div className="w-16 h-[3px] bg-alert" />
          <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight space-y-2">
            <p>{c.heroSub1}</p>
            <p>
              {c.heroSub2a}
              <span className="text-alert">{c.heroSub2b}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="#cta"
              className="group inline-flex items-center gap-3 bg-foreground text-background px-7 py-4 text-sm font-bold uppercase tracking-wider hover:bg-alert transition-colors"
            >
              {c.ctaPrimary}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <Button asChild variant="link" className="text-foreground underline underline-offset-4">
              <a href="#simulation">{c.ctaSecondary} →</a>
            </Button>
          </div>
        </div>
      </section>

      {/* The question */}
      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>{c.questionEyebrow}</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5.5vw, 4rem)" }}>
            {c.questionTitle}
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {c.questionNote}
          </p>
          <div className={bodyProseClass}>
            <p>{c.question1}</p>
            <p>{c.question2}</p>
            <p className="font-bold">{c.question3}</p>
          </div>
        </div>
      </section>

      {/* The experiment */}
      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>{c.experimentEyebrow}</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5.5vw, 4rem)" }}>
            {c.experimentTitle}
          </h2>
          <div className={bodyProseClass}>
            <p>
              {c.exp1a}
              <em>{c.exp1b}</em>.
            </p>
            <p className="text-alert font-bold">
              {c.exp2a}
              <em>{c.exp2b}</em>.
            </p>
            <p>{c.exp3}</p>
          </div>
        </div>
      </section>

      {/* What happens */}
      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            {c.whatTitle}
          </h2>
          <div className={bodyProseClass}>
            {c.what.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="font-bold">
              <EmText>{c.whatBold}</EmText>
            </p>
          </div>
          <div className="max-w-3xl border-t border-foreground/20 pt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-base sm:text-lg text-muted-foreground">
              {c.faqLeadBefore}
              <a
                href="/faq"
                className="font-bold text-alert underline underline-offset-4 hover:no-underline"
              >
                {c.faqLinkWord}
              </a>
              {c.faqLeadAfter}
            </p>
          </div>
        </div>

      </section>

      <section id="simulation" className="simulation-section snap-start min-h-[100svh] w-full flex items-center justify-center px-5 sm:px-8 md:px-12 py-12 border-b border-foreground/15">
        <div className={panelInner}>
          <EventSimulationEmbed wedium />
        </div>
      </section>

      {/* Registration */}
      <section id="cta" className={`${panelClass} wedium-gradient`}>
        <div className={panelInner}>
          <h2 className={`${displayClass} mb-8`} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            {c.ctaTitle}
          </h2>
          <p className="mb-10 text-lg sm:text-xl font-bold uppercase tracking-wide">
            {c.ctaLine1}
            <span className="text-alert">{c.ctaLine2}</span>
          </p>
          <Button asChild variant="link" className="mb-6 h-auto p-0 text-foreground underline underline-offset-4">
            <a href="#simulation">{c.ctaSecondary} →</a>
          </Button>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-0 border border-foreground">
            <input
              type="email"
              autoComplete="email"
              aria-label={c.emailPlaceholder}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status !== "idle"}
              placeholder={c.emailPlaceholder}
              className="min-w-0 flex-grow px-4 py-3.5 sm:py-4 outline-none text-sm font-bold uppercase placeholder:text-muted-foreground bg-transparent disabled:opacity-60"
            />
            <Button
              type="submit"
              disabled={status !== "idle"}
              className="h-auto rounded-none whitespace-normal bg-foreground text-background px-6 py-3.5 sm:px-8 sm:py-4 text-sm font-bold uppercase hover:bg-alert transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading"
                ? c.btnLoading
                : status === "sent"
                  ? c.btnSent
                  : status === "already"
                    ? c.btnAlready
                    : c.btnIdle}
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground max-w-2xl">{c.fine1}</p>
          {status === "sent" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold leading-snug text-alert">{c.sentNote}</p>
          )}
          {status === "already" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold leading-snug">{c.alreadyNote}</p>
          )}
        </div>
      </section>

      <footer className="snap-start min-h-[40vh] w-full flex items-center px-5 sm:px-8 md:px-12 py-10">
        <div className={panelInner}>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest items-center">
            <span>freemind</span>
            <span className="text-muted-foreground">x</span>
            <a href="https://wedium.social" className="hover:text-alert" rel="noreferrer" target="_blank">
              wedium
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="/legal" className="hover:text-alert">
              {c.imprint}
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="/faq" className="hover:text-alert">
              {c.questions}
            </a>
            <span className="text-muted-foreground">/</span>
            <a href="mailto:iwan@freemind.chat" className="hover:text-alert">
              {c.contact}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
