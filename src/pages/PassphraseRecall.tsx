import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export default function PassphraseRecall() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");

  useEffect(() => {
    document.title = "Passphrase vergessen? · freemind";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Passphrase vergessen? Gib deine registrierte E-Mail-Adresse ein und wir schicken sie dir erneut zu.",
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setStatus("loading");
    try {
      const { error } = await supabase.functions.invoke("passphrase-recall", {
        body: { email: parsed.data },
      });
      if (error) throw error;
      setStatus("sent");
    } catch {
      toast.error("Etwas ist schiefgelaufen. Bitte versuch es erneut.");
      setStatus("idle");
    }
  };

  return (
    <main
      lang="de"
      className="landing-theme min-h-screen w-full bg-background text-foreground font-sans flex items-center justify-center px-5 py-16"
    >
      <div className="w-full max-w-xl flex flex-col gap-8">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-alert">
          Zugang
        </p>
        <h1
          className="font-display font-black uppercase tracking-tighter leading-[0.9]"
          style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
        >
          Passphrase vergessen?
        </h1>
        <p className="text-lg sm:text-xl leading-snug">
          Gib die E-Mail-Adresse ein, mit der du dich registriert hast. Wenn wir sie
          kennen, ist deine Passphrase in wenigen Minuten in deinem Postfach.
        </p>

        {status === "sent" ? (
          <div className="border border-foreground/20 p-6 space-y-3">
            <p className="text-lg font-bold">Erledigt.</p>
            <p className="text-base leading-snug">
              Falls diese Adresse registriert ist, ist deine Passphrase unterwegs.
              Schau auch im Spam-Ordner nach.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <label className="sr-only" htmlFor="recall-email">
              E-Mail-Adresse
            </label>
            <input
              id="recall-email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="deine@email.de"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={255}
              className="flex-1 bg-transparent border border-foreground/30 px-4 py-4 text-base outline-none focus:border-alert"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-foreground text-background px-7 py-4 text-sm font-bold uppercase tracking-wider hover:bg-alert transition-colors disabled:opacity-60"
            >
              {status === "loading" ? "Senden…" : "Passphrase senden"}
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to="/" className="underline hover:text-alert">
            Zurück zur Startseite
          </Link>
          <Link to="/go" className="underline hover:text-alert">
            Zur Diskussion
          </Link>
        </div>
      </div>
    </main>
  );
}
