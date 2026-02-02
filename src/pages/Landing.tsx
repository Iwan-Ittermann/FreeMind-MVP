import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { ArrowRight, MessageSquare, Users, Star, Shield, AlertTriangle, Scale, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: { staggerChildren: 0.12 },
  },
  viewport: { once: true },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

// Zone configuration with brand colors
const zones = [
  {
    name: "Grüne Zone",
    description: "Hoher Respekt bei großer Meinungsverschiedenheit — echte Brückenbauer.",
    colorClass: "bg-success",
    ringClass: "ring-success/30",
    size: 100,
  },
  {
    name: "Gelbe Zone",
    description: "Respektvoller Austausch bei moderater Meinungsverschiedenheit.",
    colorClass: "bg-accent",
    ringClass: "ring-accent/30",
    size: 200,
  },
  {
    name: "Rote Zone",
    description: "Wenig Respekt, große Meinungsverschiedenheit — der Rand der Diskussion.",
    colorClass: "bg-primary",
    ringClass: "ring-primary/30",
    size: 300,
  },
];

export default function Landing() {
  const zonesRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: zonesRef,
    offset: ["start end", "end start"],
  });

  // Parallax transforms for each zone circle
  const zone1Scale = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const zone1Opacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);

  const zone2Scale = useTransform(scrollYProgress, [0.15, 0.45], [0, 1]);
  const zone2Opacity = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);

  const zone3Scale = useTransform(scrollYProgress, [0.3, 0.6], [0, 1]);
  const zone3Opacity = useTransform(scrollYProgress, [0.3, 0.55], [0, 1]);

  // Text box reveals
  const text1Opacity = useTransform(scrollYProgress, [0.2, 0.35], [0, 1]);
  const text1X = useTransform(scrollYProgress, [0.2, 0.35], [50, 0]);

  const text2Opacity = useTransform(scrollYProgress, [0.35, 0.5], [0, 1]);
  const text2X = useTransform(scrollYProgress, [0.35, 0.5], [50, 0]);

  const text3Opacity = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);
  const text3X = useTransform(scrollYProgress, [0.5, 0.65], [50, 0]);

  const textTransforms = [
    { opacity: text1Opacity, x: text1X },
    { opacity: text2Opacity, x: text2X },
    { opacity: text3Opacity, x: text3X },
  ];

  const zoneTransforms = [
    { scale: zone1Scale, opacity: zone1Opacity },
    { scale: zone2Scale, opacity: zone2Opacity },
    { scale: zone3Scale, opacity: zone3Opacity },
  ];

  return (
    <div className="min-h-screen bg-foreground text-background font-sans">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground via-foreground/95 to-foreground" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--background) / 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--background) / 0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial glow with primary brand color */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="relative z-10 container mx-auto px-6 py-20 text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-background/10 bg-background/5 text-sm text-background/60 mb-8">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Alpha — Test
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight mb-6">
              <span className="text-background/40">Online-Diskussionen sind kaputt.</span>
              <br />
              <span className="bg-gradient-to-r from-background via-background to-background/80 bg-clip-text text-transparent">
                FreeMind macht sie wieder möglich.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-background/50 max-w-2xl mx-auto leading-relaxed mb-10">
              Soziale Medien beschleunigen Polarisierung und belohnen Empörung.
              <br className="hidden md:block" />
              FreeMind ist ein Ort, an dem Menschen wieder respektvoll diskutieren können — auch wenn sie nicht einer
              Meinung sind.
            </p>

            {/* Value Bullets */}
            <motion.div
              className="flex flex-wrap justify-center gap-4 md:gap-6 mb-10"
              variants={staggerContainer}
              initial="initial"
              animate="whileInView"
            >
              {[
                "Keine Likes. Keine Empörungs-Dynamik.",
                "Eins-zu-Eins Gespräche statt Kommentar-Chaos",
                "Bewertung der Gesprächsqualität, nicht der Meinung",
              ].map((bullet, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2 text-sm text-background/60"
                  variants={staggerItem}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {bullet}
                </motion.div>
              ))}
            </motion.div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="bg-background text-foreground hover:bg-background/90 px-8 py-6 text-base font-medium shadow-2xl shadow-background/10"
                >
                  Jetzt Diskussion starten
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-background/60 hover:text-background hover:bg-background/5 px-6 py-6"
                >
                  So funktioniert FreeMind →
                </Button>
              </a>
            </div>

            {/* Micro-copy */}
            <p className="text-xs text-background/30 tracking-wide uppercase">
              Keine Likes · Keine Reichweite · Kein Feed
            </p>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-background/20 flex items-start justify-center p-2">
            <motion.div
              className="w-1.5 h-2.5 rounded-full bg-background/40"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Problem Section */}
      <section className="py-24 md:py-32 bg-foreground relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />

        <div className="container mx-auto px-6 max-w-6xl relative">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6">Warum Diskussionen online scheitern</h2>
            <p className="text-lg text-background/50 max-w-2xl mx-auto">
              Die meisten Plattformen sind nicht für Gespräche gebaut —
              <br className="hidden md:block" />
              sondern für Aufmerksamkeit.
            </p>
          </motion.div>

          {/* Side by side comparison */}
          <motion.div
            className="grid md:grid-cols-2 gap-6 md:gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {/* Social Media - Bad */}
            <motion.div
              className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-8"
              variants={staggerItem}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-medium text-primary">Typische Social-Media-Diskussion</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Meinungen werden als Statements gepostet",
                  "Zuspitzung bringt Reichweite",
                  "Antworten werden persönlicher statt klarer",
                  "Die lauteste Emotion gewinnt",
                  "Niemand hört wirklich zu",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-background/60">
                    <X className="w-5 h-5 text-primary/60 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* FreeMind - Good */}
            <motion.div
              className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-2xl p-8"
              variants={staggerItem}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <h3 className="text-xl font-medium text-success">Dieselbe Diskussion auf FreeMind</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Jede Position wird strukturiert formuliert",
                  "Echte Mehrheitsverhältnisse werden gezeigt",
                  "Respekt steht im Mittelpunkt",
                  "Beide Seiten bewerten den Austausch",
                  "Jedes Gespräch für andere nachvollziehbar",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-background/60">
                    <Check className="w-5 h-5 text-success/60 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Outcome highlight */}
          <motion.div className="mt-12 text-center" {...fadeInUp}>
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-full bg-background/5 border border-background/10">
              <span className="text-background/40">Ergebnis:</span>
              <span className="text-xl font-medium bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
                Verständnis statt Empörung
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 md:py-32 bg-foreground relative">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4">Drei Schritte. Ein echtes Gespräch.</h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              {
                icon: MessageSquare,
                step: "01",
                title: "Veröffentliche deine Meinung",
                description: "Klar, begründet und anonym.",
              },
              {
                icon: Users,
                step: "02",
                title: "Chatte mit anderen",
                description: "Je unterschiedlicher die Meinung, umso spannender.",
              },
              {
                icon: Star,
                step: "03",
                title: "Bewertet euren Dialog",
                description: "Beide vergeben Punkte, Durchschnitt wird errechnet.",
              },
            ].map((item, i) => (
              <motion.div key={i} className="relative group" variants={staggerItem}>
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-background/10 to-transparent" />
                )}

                <div className="bg-background/[0.02] border border-background/10 rounded-2xl p-8 hover:bg-background/[0.04] hover:border-background/20 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-4xl font-medium text-background/10">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-medium mb-3 text-background">{item.title}</h3>
                  <p className="text-background/50">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Dialog Zones Section - Sticky Scroll */}
      <section ref={zonesRef} className="bg-foreground relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-success/[0.02] to-transparent" />

        {/* Scrollable container - height determines scroll duration */}
        <div className="relative h-[300vh]">
          {/* Sticky content that stays fixed while scrolling */}
          <div className="sticky top-0 h-screen flex items-center overflow-hidden">
            <div className="container mx-auto px-6 max-w-6xl">
              <motion.div className="text-center mb-8 md:mb-12" {...fadeInUp}>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4 md:mb-6 text-background">
                  Hass rutscht an den Rand
                </h2>
                <p className="text-base md:text-lg text-background/50 max-w-2xl mx-auto">
                  Wer auf FreeMind respektlos mit anderen Meinungen umgeht, rutscht automatisch an den Rand — hier gibt
                  es keine Likes von Fans und Followern.
                </p>
              </motion.div>

              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                {/* Static Zone Circles - always visible, zones animate in */}
                <div className="flex-1 flex justify-center">
                  <div className="relative w-[280px] h-[280px] md:w-[360px] md:h-[360px] lg:w-[400px] lg:h-[400px]">
                    {/* Zone 3 - Outer (Red/Primary) */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/90"
                      style={{
                        scale: zoneTransforms[2].scale,
                        opacity: zoneTransforms[2].opacity,
                      }}
                    />

                    {/* Zone 2 - Middle (Yellow/Accent) */}
                    <motion.div
                      className="absolute rounded-full bg-accent/95"
                      style={{
                        scale: zoneTransforms[1].scale,
                        opacity: zoneTransforms[1].opacity,
                        width: "66%",
                        height: "66%",
                        top: "17%",
                        left: "17%",
                      }}
                    />

                    {/* Zone 1 - Center (Green/Success) */}
                    <motion.div
                      className="absolute rounded-full bg-success/90 flex items-center justify-center"
                      style={{
                        scale: zoneTransforms[0].scale,
                        opacity: zoneTransforms[0].opacity,
                        width: "33%",
                        height: "33%",
                        top: "33.5%",
                        left: "33.5%",
                      }}
                    >
                      <motion.span
                        className="text-2xl md:text-3xl lg:text-4xl"
                        style={{ opacity: zoneTransforms[0].opacity }}
                      >
                        👑
                      </motion.span>
                    </motion.div>
                  </div>
                </div>

                {/* Zone explanations - scroll triggered */}
                <div className="flex-1 space-y-4 md:space-y-6 max-w-md lg:max-w-none">
                  {zones.map((zone, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-background/[0.02] border border-background/10"
                      style={{
                        opacity: textTransforms[i].opacity,
                        x: textTransforms[i].x,
                      }}
                    >
                      <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${zone.colorClass} mt-1 flex-shrink-0`} />
                      <div>
                        <h4 className="font-medium text-background mb-1 text-sm md:text-base">{zone.name}</h4>
                        <p className="text-xs md:text-sm text-background/50">{zone.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="py-24 md:py-32 bg-foreground">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4">Für respektvolle Gespräche gebaut</h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Shield,
                text: "Keine algorithmische Verstärkung",
              },
              {
                icon: AlertTriangle,
                text: "Meldefunktion für illegale Inhalte",
              },
              {
                icon: Scale,
                text: "Selbstregulierend durch Bridging-Score",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-background/[0.02] border border-background/10"
                variants={staggerItem}
              >
                <div className="w-12 h-12 rounded-full bg-background/5 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-background/40" />
                </div>
                <p className="text-background/60 text-sm">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-foreground to-foreground/95 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />

        <div className="container mx-auto px-6 max-w-3xl relative text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-8">Diskutieren geht auch anders.</h2>

            <Link to="/auth">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 px-10 py-7 text-lg font-medium shadow-2xl shadow-background/10"
              >
                Starte deine erste Diskussion
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground border-t border-background/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-medium text-background">FreeMind</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-background/40">
              <Link to="/legal" className="hover:text-background/60 transition-colors">
                Impressum
              </Link>
              <Link to="/legal" className="hover:text-background/60 transition-colors">
                Datenschutz
              </Link>
            </div>
            <p className="text-sm text-background/30">© 2024 FreeMind. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
