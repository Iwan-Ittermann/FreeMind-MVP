import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, Users, Star, Shield, AlertTriangle, Scale, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpinionGraph } from "@/components/graph/OpinionGraph";

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

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="relative z-10 container mx-auto px-6 py-20 text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/60 mb-8">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Beta — Jetzt testen
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              <span className="text-white/40">Online-Diskussionen sind kaputt.</span>
              <br />
              <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                FreeMind macht sie wieder möglich.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
              Soziale Medien beschleunigen Polarisierung und belohnen Empörung.
              <br className="hidden md:block" />
              FreeMind ist ein Ort, an dem Menschen wieder respektvoll diskutieren können — auch wenn sie nicht einer Meinung sind.
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
                "Bewertung der Gesprächsqualität, nicht der Meinung"
              ].map((bullet, i) => (
                <motion.div 
                  key={i}
                  className="flex items-center gap-2 text-sm text-white/60"
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
                <Button size="lg" className="bg-white text-black hover:bg-white/90 px-8 py-6 text-base font-semibold shadow-2xl shadow-white/10">
                  Jetzt Diskussion starten
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="ghost" size="lg" className="text-white/60 hover:text-white hover:bg-white/5 px-6 py-6">
                  So funktioniert FreeMind →
                </Button>
              </a>
            </div>

            {/* Micro-copy */}
            <p className="text-xs text-white/30 tracking-wide uppercase">
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
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div 
              className="w-1.5 h-2.5 rounded-full bg-white/40"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Problem Section */}
      <section className="py-24 md:py-32 bg-[#080808] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        
        <div className="container mx-auto px-6 max-w-6xl relative">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Warum Diskussionen online scheitern
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
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
              className="bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 rounded-2xl p-8"
              variants={staggerItem}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold text-destructive">
                  Typische Social-Media-Diskussion
                </h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Meinungen werden als Statements gepostet",
                  "Zuspitzung bringt Reichweite",
                  "Antworten werden persönlicher statt klarer",
                  "Die lauteste Emotion gewinnt",
                  "Niemand hört wirklich zu"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/60">
                    <X className="w-5 h-5 text-destructive/60 mt-0.5 flex-shrink-0" />
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
                <h3 className="text-xl font-semibold text-success">
                  Dieselbe Diskussion auf FreeMind
                </h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Jede Position wird strukturiert formuliert",
                  "Echte Mehrheitsverhältnisse werden gezeigt",
                  "Respekt steht im Mittelpunkt",
                  "Beide Seiten bewerten den Austausch",
                  "Jedes Gespräch für andere nachvollziehbar"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/60">
                    <Check className="w-5 h-5 text-success/60 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Outcome highlight */}
          <motion.div 
            className="mt-12 text-center"
            {...fadeInUp}
          >
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/40">Ergebnis:</span>
              <span className="text-xl font-semibold bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
                Verständnis statt Empörung
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 md:py-32 bg-[#0a0a0a] relative">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Drei Schritte. Ein echtes Gespräch.
            </h2>
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
                description: "Klar, begründet und anonym."
              },
              {
                icon: Users,
                step: "02",
                title: "Chatte mit anderen",
                description: "Je unterschiedlicher die Meinung, umso spannender."
              },
              {
                icon: Star,
                step: "03",
                title: "Bewertet euren Dialog",
                description: "Beide vergeben Respekt-Punkte, der Durchschnitt zählt."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                className="relative group"
                variants={staggerItem}
              >
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-4xl font-bold text-white/10">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">
                    {item.title}
                  </h3>
                  <p className="text-white/50">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Dialog Zones Section */}
      <section className="py-24 md:py-32 bg-[#080808] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-success/[0.02] to-transparent" />
        
        <div className="container mx-auto px-6 max-w-6xl relative">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Hass rutscht an den Rand
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Wer auf FreeMind respektlos mit gegnerischen Meinungen umgeht, rutscht automatisch an den Rand — 
              hier gibt es keine Likes von Fans und Followern.
            </p>
          </motion.div>

          <motion.div 
            className="flex flex-col lg:flex-row items-center gap-12"
            {...fadeInUp}
          >
            {/* Graph visualization */}
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <OpinionGraph 
                  width={400} 
                  height={400} 
                  useMockData={true}
                />
              </div>
            </div>

            {/* Zone explanations */}
            <div className="flex-1 space-y-6">
              {[
                {
                  color: "bg-success",
                  name: "Grüne Zone",
                  description: "Hoher Respekt bei großer Meinungsverschiedenheit — echte Brückenbauer."
                },
                {
                  color: "bg-amber-500",
                  name: "Gelbe Zone",
                  description: "Respektvoller Austausch bei moderater Meinungsverschiedenheit."
                },
                {
                  color: "bg-destructive",
                  name: "Rote Zone",
                  description: "Wenig Respekt, große Meinungsverschiedenheit — der Rand der Diskussion."
                }
              ].map((zone, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className={`w-4 h-4 rounded-full ${zone.color} mt-1 flex-shrink-0`} />
                  <div>
                    <h4 className="font-semibold text-white mb-1">{zone.name}</h4>
                    <p className="text-sm text-white/50">{zone.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="py-24 md:py-32 bg-[#0a0a0a]">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Für respektvolle Gespräche gebaut
            </h2>
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
                text: "Keine algorithmische Verstärkung"
              },
              {
                icon: AlertTriangle,
                text: "Meldefunktion für illegale Inhalte"
              },
              {
                icon: Scale,
                text: "Hier gelten die gleichen Regeln wie im echten Leben"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-white/[0.02] border border-white/10"
                variants={staggerItem}
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-white/40" />
                </div>
                <p className="text-white/60 text-sm">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        
        <div className="container mx-auto px-6 max-w-3xl relative text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
              Diskutieren geht auch anders.
            </h2>
            
            <Link to="/auth">
              <Button size="lg" className="bg-white text-black hover:bg-white/90 px-10 py-7 text-lg font-semibold shadow-2xl shadow-white/10">
                Starte deine erste Diskussion
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#080808] border-t border-white/5">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/30 text-sm">
            © 2025 FreeMind
          </div>
          <div className="flex items-center gap-6">
            <Link to="/legal" className="text-white/30 hover:text-white/60 text-sm transition-colors">
              Impressum
            </Link>
            <Link to="/" className="text-white/30 hover:text-white/60 text-sm transition-colors">
              Über FreeMind
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
