import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Linkedin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

// Abstract discourse graph visualization
function DiscourseGraph({ className = "" }: { className?: string }) {
  const nodes = [
    { cx: 50, cy: 50, r: 4, zone: "green" },
    { cx: 42, cy: 45, r: 3, zone: "green" },
    { cx: 58, cy: 53, r: 3.5, zone: "green" },
    { cx: 35, cy: 35, r: 3, zone: "orange" },
    { cx: 65, cy: 38, r: 3, zone: "orange" },
    { cx: 30, cy: 60, r: 2.5, zone: "orange" },
    { cx: 70, cy: 55, r: 2.5, zone: "orange" },
    { cx: 45, cy: 30, r: 2.5, zone: "orange" },
    { cx: 55, cy: 68, r: 2.5, zone: "orange" },
    { cx: 20, cy: 25, r: 2, zone: "red" },
    { cx: 80, cy: 75, r: 2, zone: "red" },
    { cx: 15, cy: 70, r: 2, zone: "red" },
    { cx: 85, cy: 30, r: 2, zone: "red" },
    { cx: 25, cy: 80, r: 1.8, zone: "red" },
    { cx: 75, cy: 20, r: 1.8, zone: "red" },
  ];

  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [0, 7],
    [0, 8],
    [3, 5],
    [4, 6],
    [5, 9],
    [6, 10],
    [7, 14],
    [8, 13],
  ];

  const zoneColors: Record<string, string> = {
    green: "hsl(153, 96%, 43%)",
    orange: "hsl(42, 100%, 50%)",
    red: "hsl(330, 97%, 43%)",
  };

  return (
    <svg viewBox="0 0 100 100" className={className}>
      {/* Concentric circles */}
      <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(0,0%,85%)" strokeWidth="0.3" strokeDasharray="2 2" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="hsl(0,0%,85%)" strokeWidth="0.3" strokeDasharray="2 2" />
      <circle cx="50" cy="50" r="15" fill="none" stroke="hsl(153,96%,43%)" strokeWidth="0.4" opacity="0.4" />

      {/* Edges */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].cx}
          y1={nodes[a].cy}
          x2={nodes[b].cx}
          y2={nodes[b].cy}
          stroke="hsl(0,0%,75%)"
          strokeWidth="0.4"
          opacity="0.5"
        />
      ))}

      {/* Nodes */}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={zoneColors[n.zone]} opacity="0.8" />
      ))}
    </svg>
  );
}

function ContactForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, open mailto as fallback
    const subject = encodeURIComponent(`FreeMind.city Kontakt: ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:contact@freemind.city?subject=${subject}&body=${body}`;
    toast.success(t("landing.contact.success"));
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <Input placeholder={t("landing.contact.name")} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        type="email"
        placeholder={t("landing.contact.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Textarea
        placeholder={t("landing.contact.message")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        className="min-h-[120px]"
      />
      <Button type="submit" className="w-full">
        {t("landing.contact.send")}
      </Button>
    </form>
  );
}

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">FreeMind.city</span>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-xs text-muted-foreground">{t("landing.trustLine")}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* SECTION 1 — Hero */}
      <section className="pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.15] tracking-tight mb-5">
                {t("landing.hero.headline")}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                {t("landing.hero.subheadline")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-base font-medium">
                    {t("landing.hero.cta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth?mode=login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 py-6 text-base">
                    {t("common.logIn")}
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground">{t("landing.hero.reassurance")}</p>
            </motion.div>

            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <DiscourseGraph className="w-full max-w-sm lg:max-w-md opacity-70" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Das Problem */}
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-center mb-12" {...fadeInUp}>
            {t("landing.problem.headline")}
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {(["polarization", "volume", "structure"] as const).map((key) => (
              <motion.div
                key={key}
                className="border border-border rounded-xl p-6 bg-background"
                variants={staggerItem}
              >
                <h3 className="text-lg font-medium mb-2">{t(`landing.problem.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.problem.${key}.desc`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SECTION 3 — Unser Ansatz */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-center mb-12" {...fadeInUp}>
            {t("landing.approach.headline")}
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {(["discourse", "respect", "quality"] as const).map((key) => (
              <motion.div
                key={key}
                className="border border-border rounded-xl p-6 bg-background"
                variants={staggerItem}
              >
                <h3 className="text-lg font-medium mb-2">{t(`landing.approach.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.approach.${key}.desc`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SECTION 4 — Geeignet für (commented out)
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-center mb-10" {...fadeInUp}>
            {t("landing.useCases.headline")}
          </motion.h2>

          <motion.div
            className="grid sm:grid-cols-2 gap-4 mb-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {(["municipalities", "infrastructure", "education", "youth"] as const).map((key) => (
              <motion.div
                key={key}
                className="border border-border rounded-lg p-5 bg-background"
                variants={staggerItem}
              >
                <p className="font-medium text-sm">{t(`landing.useCases.${key}`)}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.p className="text-center text-sm text-muted-foreground italic" {...fadeInUp}>
            {t("landing.useCases.note")}
          </motion.p>
        </div>
      </section>
      */}

      {/* SECTION 5 — Wie es funktioniert */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-center mb-14" {...fadeInUp}>
            {t("landing.steps.headline")}
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {(["publish", "choose", "rate"] as const).map((key, i) => (
              <motion.div key={key} className="relative text-center" variants={staggerItem}>
                {/* Arrow connector */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-8">
                    <ArrowRight className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                  </div>
                )}
                <div className="text-3xl font-medium text-muted-foreground/20 mb-3">{i + 1}</div>
                <h3 className="text-lg font-medium mb-2">{t(`landing.steps.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.steps.${key}.desc`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SECTION 6 — Produkt + Key Benefits */}
      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div className="flex justify-center" {...fadeInUp}>
              <DiscourseGraph className="w-full max-w-xs opacity-60" />
            </motion.div>

            <motion.div {...fadeInUp}>
              <ul className="space-y-4">
                {(["passkey", "graph", "moderation", "rating"] as const).map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{t(`landing.benefits.${key}`)}</span>
                  </li>
                ))}
                <li className="flex items-start gap-3 pt-2">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-base font-semibold leading-relaxed">{t("landing.benefits.bold")}</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — FAQ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-center mb-10" {...fadeInUp}>
            FAQ
          </motion.h2>

          <motion.div {...fadeInUp}>
            <Accordion type="single" collapsible className="w-full">
              {(["social", "abuse", "public"] as const).map((key) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {t(`landing.faq.${key}.q`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {t(`landing.faq.${key}.a`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* SECTION 8 — Contact */}
      <section id="contact" className="py-20 md:py-28 bg-muted/50">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-center mb-4">
              {t("landing.contact.headline")}
            </h2>
            <p className="text-center text-muted-foreground mb-2">{t("landing.contact.intro")}</p>
            <p className="text-center text-sm font-medium mb-1">{t("landing.contact.founder")}</p>
            <p className="text-center mb-8">
              <a
                href="https://linkedin.com/in/iwan-ittermann"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-4 w-4" />
                {t("landing.contact.linkedin")}
              </a>
            </p>

            <ContactForm />
          </motion.div>
        </div>
      </section>

      {/* SECTION 9 — Final CTA */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium mb-8">{t("landing.cta.headline")}</h2>
            <Link to="/auth">
              <Button size="lg" className="px-10 py-6 text-base font-medium">
                {t("landing.cta.button")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-4 text-xs text-muted-foreground">{t("landing.cta.reassurance")}</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm font-medium">FreeMind.city</span>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link to="/legal" className="hover:text-foreground transition-colors">
                {t("landing.footer.privacy")}
              </Link>
              <Link to="/legal" className="hover:text-foreground transition-colors">
                {t("landing.footer.imprint")}
              </Link>
              <a href="#contact" className="hover:text-foreground transition-colors">
                {t("landing.footer.contact")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
