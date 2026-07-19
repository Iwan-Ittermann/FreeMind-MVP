import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "valid" | "invalid" | "already" | "confirming" | "done" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    document.title = "Abmelden – freemind";
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } },
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("confirming");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error || !data?.success) setState("error");
    else setState("done");
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight">Abmelden</h1>
        {state === "loading" && <p className="text-muted-foreground">Lade…</p>}
        {state === "invalid" && (
          <p className="text-muted-foreground">Dieser Link ist ungültig oder abgelaufen.</p>
        )}
        {state === "already" && (
          <p className="text-muted-foreground">Diese E-Mail ist bereits abgemeldet.</p>
        )}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground">
              Klicke auf den Button, um dich von freemind-E-Mails abzumelden.
            </p>
            <button
              onClick={confirm}
              className="px-6 py-3 bg-foreground text-background text-sm font-bold uppercase tracking-wider"
            >
              Abmeldung bestätigen
            </button>
          </>
        )}
        {state === "confirming" && <p className="text-muted-foreground">Abmelden…</p>}
        {state === "done" && <p>Du bist abgemeldet. Danke.</p>}
        {state === "error" && (
          <p className="text-destructive">Etwas ist schiefgelaufen. Bitte versuche es später erneut.</p>
        )}
      </div>
    </main>
  );
}
