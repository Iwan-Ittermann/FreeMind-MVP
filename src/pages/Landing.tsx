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
  return null;
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "already">("idle");

  useEffect(() => {
    document.title = "freemind — one question, more understanding, less division";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Can we still talk to each other? Try the freemind sandbox and see what a fair discussion looks like.");
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
        toast.error("Something went wrong. Please try again.");
        setStatus("idle");
      }
    } catch {
      toast.error("Etwas ist schiefgelaufen. Bitte versuch es erneut.");
      setStatus("idle");
    }
  };

  return (
    <main
      lang="en"
      className="landing-theme h-screen overflow-y-auto snap-y snap-proximity bg-background text-foreground font-sans relative"
    >
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
            ONE QUESTION · FOUR DAYS
          </p>
          <h1
            className={`${displayClass} text-left`}
            style={{ fontSize: "clamp(2.25rem, 6.5vw, 5rem)" }}
          >
            PROBABLY THE FAIREST POLITICAL DISCUSSION ON THE INTERNET.
          </h1>
          <div className="w-16 h-[3px] bg-alert" />
          <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight space-y-2">
            <p>Not because people are nicer here.</p>
            <p>
              But because <span className="text-alert">the rules of the game are different.</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="/go"
              className="group inline-flex items-center gap-3 bg-foreground text-background px-7 py-4 text-sm font-bold uppercase tracking-wider hover:bg-alert transition-colors"
            >
              Try the sandbox
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="/aug-test"
              className="text-sm font-bold uppercase tracking-wider underline underline-offset-4 hover:text-alert transition-colors"
            >
              See the August discussion
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
          <p className={eyebrowClass}>The problem</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5.5vw, 4rem)" }}>
            PUBLIC DEBATE RARELY FAILS BECAUSE OF PEOPLE.
          </h2>
          <div className={bodyProseClass}>
            <p>It fails because of the platforms.</p>
            <p>Social networks reward <em>attention</em>.</p>
            <p className="text-alert font-bold">freemind rewards <em>understanding</em>.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>The idea</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
            WE WANT TO PROVE SOMETHING.<br />
            NOT ARGUE ABOUT IT.<br />
            <span className="text-alert">PROVE IT.</span>
          </h2>
          <div className={bodyProseClass}>
            <p>That public debate does not need moderation, but the right architecture.</p>
            <p>If that works, a discussion here is more than just a discussion.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            What happens?
          </h2>
          <div className={bodyProseClass}>
            <p>You answer one question.</p>
            <p>You meet people you would probably never have met.</p>
            <p>You disagree.</p>
            <p>And you still try to understand each other.</p>
            <p>The graph comes alive.</p>
            <p>New conversations appear everywhere.</p>
            <p>Every conversation changes the playing field.</p>
            <p>The last day shows who built the strongest bridges.</p>
            <p className="font-bold">Without any moderation.</p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            About me
          </h2>
          <div className={bodyProseClass}>
            <p>For years I have wondered why the internet can connect millions of people, yet good conversations are so rare.</p>
            <p className="font-bold">freemind is my attempt to prove the opposite.</p>
          </div>
        </div>
      </section>

      <section id="cta" className={panelClass}>
        <div className={panelInner}>
          <h2 className={`${displayClass} mb-8`} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            HELP FIND OUT WHETHER THE INTERNET CAN WORK DIFFERENTLY.
          </h2>
          <p className="mb-10 text-lg sm:text-xl font-bold uppercase tracking-wide">
            FOUR DAYS · ONE QUESTION · <span className="text-alert">ONE PROOF.</span>
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-0 border border-foreground">
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status !== "idle"}
              placeholder="Email"
              className="flex-grow py-3.5 sm:py-4 outline-none text-sm font-bold uppercase placeholder:text-muted-foreground bg-transparent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status !== "idle"}
              className="bg-foreground text-background px-6 py-3.5 sm:px-8 sm:py-4 text-sm font-bold uppercase hover:bg-alert transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading"
                ? "Sending…"
                : status === "sent"
                  ? "Mail sent ✓"
                  : status === "already"
                    ? "Already in ✓"
                    : "Register for future events"}
            </button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground whitespace-pre-line">
            A future event runs for four days. Register once and we will let you know before it starts.{"\u00a0"}{"\n"}
            The five best bridge builders receive 50 € each as a thank you.{"\u00a0"}{"\n"}
            Legal recourse is excluded.
          </p>
          {status === "sent" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold normal-case sm:uppercase tracking-wide text-alert leading-snug">
              📬 Confirmation email on its way — click the link inside to complete your registration.
            </p>
          )}
          {status === "already" && (
            <p className="mt-4 text-[13px] sm:text-sm font-bold normal-case sm:uppercase tracking-wide leading-snug">
              You are already confirmed — thank you!
            </p>
          )}
        </div>
      </section>

      <footer className="snap-start min-h-[40vh] w-full flex items-center px-5 sm:px-8 md:px-12 py-10">
        <div className={panelInner}>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest items-center">
            <span>freemind</span>
            <span className="text-muted-foreground">/</span>
            <a href="/legal" className="hover:text-alert">Imprint</a>
            <span className="text-muted-foreground">/</span>
            <a href="/fragen" className="hover:text-alert">Questions</a>
            <span className="text-muted-foreground">/</span>
            <a href="mailto:iwan@freemind.chat" className="hover:text-alert">Contact</a>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}
