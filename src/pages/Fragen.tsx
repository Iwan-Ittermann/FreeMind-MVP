import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export default function Fragen() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Fragen — freemind";
    (async () => {
      const { data } = await supabase
        .from("faq_items")
        .select("id, question, answer, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setItems((data ?? []) as FaqItem[]);
      setLoading(false);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const q = question.trim();
    if (q.length < 10) {
      setFormError("Bitte formuliere deine Frage mit mindestens 10 Zeichen.");
      return;
    }
    if (q.length > 1000) {
      setFormError("Bitte kürze deine Frage auf maximal 1000 Zeichen.");
      return;
    }
    const mail = email.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setFormError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("submit-question", {
      body: { question: q, email: mail },
    });
    setSending(false);
    if (error || !data?.ok) {
      setFormError("Das hat leider nicht funktioniert. Bitte versuche es später erneut.");
      return;
    }
    setSent(true);
    setQuestion("");
    setEmail("");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#eaf2fb", color: "#0f1b3d", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 96px" }}>
        <Link to="/" style={{ fontSize: 13, color: "#0f1b3d", textDecoration: "none", opacity: 0.7 }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 36, margin: "16px 0 8px", letterSpacing: "-0.01em" }}>Fragen</h1>
        <p style={{ margin: "0 0 32px", opacity: 0.75 }}>Häufig gestellte Fragen</p>

        {loading ? (
          <p style={{ opacity: 0.6 }}>Lädt…</p>
        ) : items.length === 0 ? (
          <p style={{ opacity: 0.6 }}>Noch keine Fragen.</p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {items.map((it) => (
              <AccordionItem key={it.id} value={it.id} className="border-b border-[#0f1b3d]/20">
                <AccordionTrigger className="text-left text-base font-medium text-[#0f1b3d] hover:no-underline">
                  {it.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#0f1b3d]/80 whitespace-pre-wrap leading-relaxed">
                  {it.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Ask a question */}
        <h2 style={{ fontSize: 22, margin: "48px 0 8px" }}>Deine Frage stellen</h2>
        <p style={{ margin: "0 0 16px", opacity: 0.75, fontSize: 14 }}>
          Deine Frage ist nicht dabei? Schreib sie uns — wir antworten so schnell wir können.
        </p>

        {sent ? (
          <div style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 16, fontSize: 14 }}>
            Danke! Deine Frage ist bei uns angekommen.
            <button
              type="button"
              onClick={() => setSent(false)}
              style={{ ...ghost, marginLeft: 12 }}
            >
              Weitere Frage
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #0f1b3d", padding: 16 }}>
            <label style={label} htmlFor="q">Frage</label>
            <textarea
              id="q"
              rows={4}
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Was möchtest du wissen?"
              style={{ ...input, resize: "vertical" }}
            />
            <label style={label} htmlFor="qmail">E-Mail (optional, für eine persönliche Antwort)</label>
            <input
              id="qmail"
              type="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@example.com"
              style={input}
            />
            {formError && <p style={{ color: "#b3261e", fontSize: 13, margin: "8px 0 0" }}>{formError}</p>}
            <button
              type="submit"
              disabled={sending}
              style={{
                marginTop: 12, padding: "10px 16px", background: "#0f1b3d", color: "#fff",
                border: 0, fontSize: 13, cursor: sending ? "not-allowed" : "pointer",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              {sending ? "Sendet…" : "Frage senden"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const label: React.CSSProperties = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, margin: "8px 0 4px" };
const input: React.CSSProperties = { width: "100%", padding: 8, border: "1px solid #0f1b3d", fontSize: 14, background: "#fff", color: "#0f1b3d" };
const ghost: React.CSSProperties = { padding: "6px 12px", background: "transparent", color: "#0f1b3d", border: "1px solid #0f1b3d", fontSize: 12, cursor: "pointer" };
