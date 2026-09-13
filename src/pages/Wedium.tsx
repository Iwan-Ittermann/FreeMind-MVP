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

/** Placeholder creators — replaced as soon as wedium sends names, photos, quotes. */
const CREATORS = [1, 2, 3, 4, 5];

const copy = {
  de: {
    metaTitle: "wedium x freemind — Live-Event 10.–14. Oktober 2026",
    metaDesc:
      "wedium-Creator und ihre Communities diskutieren vier Tage lang eine Frage: Welche Gesetze wünschst du dir für soziale Medien?",
    heroEyebrow: "WEDIUM X FREEMIND · 10.–14. OKTOBER 2026",
    heroTitle: "FÜNF TAGE. EINE FRAGE. EIN BEWEIS.",
    heroSub1: "wedium-Creator bringen ihre Communities zusammen.",
    heroSub2a: "freemind sorgt dafür, dass daraus ",
    heroSub2b: "ein echtes Gespräch wird.",
    ctaPrimary: "Platz sichern",
    ctaSecondary: "Vorher ausprobieren",
    questionEyebrow: "Die Frage",
    questionTitle: "WELCHE GESETZE WÜNSCHST DU DIR FÜR SOZIALE MEDIEN?",
    questionNote: "Arbeitstitel — die endgültige Formulierung folgt.",
    question1:
      "Alle reden über soziale Medien. Fast niemand wird gefragt, welche Regeln er sich eigentlich wünscht.",
    question2:
      "Genau das machen wir: Du beantwortest die Frage in eigenen Worten — kein Like, kein Kommentar, keine Umfrage mit vier Antwortmöglichkeiten.",
    question3: "Und dann sprichst du mit Menschen, die es anders sehen.",
    experimentEyebrow: "Das Experiment",
    experimentTitle: "DIES IST EIN VERSUCH.",
    exp1a: "Soziale Netzwerke belohnen ",
    exp1b: "Aufmerksamkeit",
    exp2a: "freemind belohnt ",
    exp2b: "Verständnis",
    exp3: "Können wir noch produktiv diskutieren? Finde es mit uns heraus - und lerne 4 Tage lang neue Perspektiven kennen.",
    whatTitle: "Was passiert?",
    what: [
      "Es beginnt damit, dass du eine Frage beantwortest.",
      "Dann triffst du Menschen, die du sonst nie getroffen hättest.",
      "Könnt ihr euch verstehen, auch wenn ihr stark anderer Meinung seid?",
      "Jedes Gespräch erscheint live im Graph — einer lebendigen Visualisierung der Diskussion.",
      "Fünf Tage lang rückt der Graph die Brückenbauer ins Zentrum.",
    ],
    whatBold: "Gebaut, um _moderat_ zu sein, nicht moderiert.",
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
    ctaLine1: "FÜNF TAGE · EINE FRAGE · ",
    ctaLine2: "EIN BEWEIS.",
    emailPlaceholder: "E-Mail",
    btnLoading: "Wird gesendet…",
    btnSent: "Mail gesendet ✓",
    btnAlready: "Schon dabei ✓",
    btnIdle: "Für das Event anmelden",
    fine1:
      "Du bekommst eine Bestätigungs-Mail, eine Willkommens-Mail, kurz vor dem Start eine Erinnerung mit deinem Zugang und während des Events eine kurze Abend-Mail. Abmelden jederzeit mit einem Klick.",
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
    ctaLine1: "FIVE DAYS · ONE QUESTION · ",
    ctaLine2: "ONE PROOF.",
    emailPlaceholder: "Email",
    btnLoading: "Sending…",
    btnSent: "Mail sent ✓",
    btnAlready: "Already in ✓",
    btnIdle: "Register for the event",
    fine1:
      "You get a confirmation mail, a welcome mail, a reminder with your access just before the start, and a short evening mail during the event. Unsubscribe any time with one click.",
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

/** Text stand-in for the wedium wordmark until the real logo file arrives. */
function WediumMark() {
  return (
    <span className="font-display text-xl sm:text-2xl font-black lowercase tracking-tight text-foreground">
      <em className="not-italic font-black">we</em>
      <span className="font-bold">dium</span>
    </span>
  );
}

export default function Wedium() {
  const { i18n } = useTranslation();
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
      className="wedium-theme h-screen overflow-y-auto snap-y snap-proximity bg-background text-foreground font-sans relative"
    >
      {/* Top bar: co-branding + language switch */}
      <div className="fixed top-0 inset-x-0 z-[40] flex items-center justify-between gap-3 px-4 py-2.5 border-b border-foreground/20 bg-background/80 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-2.5">
          <span className="font-display text-xl sm:text-2xl font-black uppercase tracking-tighter">
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
                href="/fragen"
                className="font-bold text-alert underline underline-offset-4 hover:no-underline"
              >
                {c.faqLinkWord}
              </a>
              {c.faqLeadAfter}
            </p>
          </div>
        </div>

      </section>

      {/* Creators */}
      <section className={`${panelClass} relative overflow-hidden`}>
        <div
          aria-hidden="true"
          className="wedium-gradient pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl"
        />
        <div className={`${panelInner} relative`}>
          <div className="mb-12 md:mb-20 text-left">
            <p className={eyebrowClass}>{c.creatorsEyebrow}</p>
            <h2 className={displayClass} style={{ fontSize: "clamp(2rem, 7vw, 5rem)" }}>
              {c.creatorsTitle}
            </h2>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {c.creatorsNote}
            </p>
          </div>

          {/* Mobile: stacked */}
          <div className="flex flex-col gap-16 md:hidden">
            {CREATORS.map((n) => (
              <div key={n} className="flex flex-col items-center text-center gap-5">
                <div className="w-36 h-36 rounded-full p-1.5 wedium-gradient shadow-xl">
                  <div className="w-full h-full rounded-full bg-background" />
                </div>
                <div>
                  <p className={`${displayClass} text-xl`}>
                    {c.creatorName} {n}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-alert">
                    {c.creatorHandle}
                  </p>
                  <p className="mt-2 text-base italic text-foreground/80 leading-snug">
                    {c.creatorQuote}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: freeform constellation */}
          <div className="relative hidden md:block h-[760px]">
            {[
              { top: "top-[0%]", left: "left-[0%]", align: "items-start", text: "text-left", width: "max-w-[260px]" },
              { top: "top-[6%]", left: "right-[0%]", align: "items-end", text: "text-right", width: "max-w-[280px]" },
              { top: "top-[40%]", left: "left-1/2 -translate-x-1/2", align: "items-center", text: "text-center", width: "max-w-[340px]" },
              { top: "bottom-[6%]", left: "left-[4%]", align: "items-start", text: "text-left", width: "max-w-[280px]" },
              { top: "bottom-[10%]", left: "right-[6%]", align: "items-end", text: "text-right", width: "max-w-[280px]" },
            ].map((pos, i) => (
              <div
                key={i}
                className={`absolute ${pos.top} ${pos.left} flex flex-col ${pos.align} ${pos.text} gap-5 ${pos.width} transition-transform duration-500 hover:-translate-y-2`}
              >
                <div className="w-40 h-40 rounded-full p-1.5 wedium-gradient shadow-xl">
                  <div className="w-full h-full rounded-full bg-background" />
                </div>
                <div>
                  <p className={`${displayClass} text-2xl`}>
                    {c.creatorName} {CREATORS[i]}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-alert">
                    {c.creatorHandle}
                  </p>
                  <p className="mt-2 text-lg italic text-foreground/80 leading-relaxed">
                    {c.creatorQuote}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-0 border border-foreground">
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status !== "idle"}
              placeholder={c.emailPlaceholder}
              className="flex-grow px-4 py-3.5 sm:py-4 outline-none text-sm font-bold uppercase placeholder:text-muted-foreground bg-transparent disabled:opacity-60"
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
            <a href="/fragen" className="hover:text-alert">
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
