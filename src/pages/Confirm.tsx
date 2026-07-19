import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "ok" | "already_confirmed" | "expired" | "invalid" | "error";

export default function Confirm() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | undefined>();
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    document.title = "Anmeldung bestätigen — freemind";
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    let cancelled = false;
    supabase.functions.invoke("signup-confirm", { body: { token } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) { setStatus("error"); return; }
        setStatus((data.status as Status) ?? "error");
        if (data.email) setEmail(data.email);
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => { cancelled = true; };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(resendEmail);
    if (!parsed.success) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setResendBusy(true);
    const { data, error } = await supabase.functions.invoke("signup-request", {
      body: { email: parsed.data },
    });
    setResendBusy(false);
    if (error || !data) { toast.error("Etwas ist schiefgelaufen."); return; }
    if (data.status === "sent") toast.success("Neuer Bestätigungslink unterwegs.");
    else if (data.status === "already_confirmed") toast.success("Du bist bereits bestätigt.");
    else toast.error("Etwas ist schiefgelaufen.");
  };

  return (
    <div lang="de" className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="border-2 border-foreground p-6 md:p-10 space-y-6">
          {status === "loading" && (
            <>
              <h1 className="font-display font-black uppercase tracking-tighter text-4xl md:text-5xl">
                Moment…
              </h1>
              <p>Wir bestätigen deine Anmeldung.</p>
            </>
          )}

          {(status === "ok" || status === "already_confirmed") && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-alert">
                {status === "ok" ? "Bestätigt" : "Bereits dabei"}
              </p>
              <h1 className="font-display font-black uppercase tracking-tighter text-4xl md:text-5xl">
                Danke! Du bist jetzt dabei.
              </h1>
              <p>
                {email ? <>Wir haben <strong>{email}</strong> bestätigt. </> : null}
                Du bekommst rechtzeitig vor dem Event alle Infos per Mail.
              </p>
              <Link
                to="/"
                className="inline-block border-b-2 border-foreground pb-1 text-sm font-bold uppercase tracking-wider hover:text-alert hover:border-alert transition-colors"
              >
                Zurück zur Startseite
              </Link>
            </>
          )}

          {(status === "expired" || status === "invalid" || status === "error") && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-alert">
                {status === "expired"
                  ? "Link abgelaufen"
                  : status === "invalid"
                    ? "Ungültiger Link"
                    : "Fehler"}
              </p>
              <h1 className="font-display font-black uppercase tracking-tighter text-3xl md:text-4xl">
                {status === "expired"
                  ? "Dein Bestätigungslink ist abgelaufen."
                  : status === "invalid"
                    ? "Diesen Link kennen wir nicht."
                    : "Da ist was schiefgelaufen."}
              </h1>
              <p>Gib deine E-Mail ein und wir schicken dir einen neuen Link.</p>
              <form onSubmit={handleResend} className="flex flex-col md:flex-row gap-0 border-2 border-foreground">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  disabled={resendBusy}
                  placeholder="E-Mail"
                  className="flex-grow p-4 outline-none text-sm font-bold uppercase placeholder:text-muted-foreground bg-card disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={resendBusy}
                  className="bg-foreground text-background px-8 py-4 text-sm font-bold uppercase hover:bg-alert transition-colors cursor-pointer disabled:opacity-60"
                >
                  {resendBusy ? "Sende…" : "Neuen Link anfordern"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
