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

export default function Faq() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "FAQ — freemind";
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

  return (
    <div style={{ minHeight: "100vh", background: "#eaf2fb", color: "#0f1b3d", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 96px" }}>
        <Link to="/" style={{ fontSize: 13, color: "#0f1b3d", textDecoration: "none", opacity: 0.7 }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 36, margin: "16px 0 8px", letterSpacing: "-0.01em" }}>FAQ</h1>
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
      </div>
    </div>
  );
}
