import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, FlaskConical, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// Facebook Pixel tracking helpers
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
const trackFBEvent = (event: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
};
const fadeInUp = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};
const staggerContainer = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};
const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};
export default function Splash() {
  const [visitStart] = useState(Date.now());
  const [progress, setProgress] = useState(0);

  // Track page view on mount
  useEffect(() => {
    trackFBEvent("PageView");
    trackFBEvent("ViewContent", {
      content_name: "Splash Page",
    });

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 50);

    // Track visit duration on unmount
    return () => {
      clearInterval(progressInterval);
      const duration = Math.round((Date.now() - visitStart) / 1000);
      trackFBEvent("CustomEvent", {
        event_name: "SplashPageDuration",
        duration_seconds: duration,
      });
    };
  }, [visitStart]);
  const handleCTAClick = () => {
    const duration = Math.round((Date.now() - visitStart) / 1000);
    trackFBEvent("Lead", {
      content_name: "Beim Test mitmachen Button",
      duration_before_click: duration,
    });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          className="max-w-2xl w-full text-center space-y-8"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight"
          >
            Wer soll ins Echinger Rathaus?
          </motion.h1>

          {/* Subheadline / Marketing Text */}
          <motion.div variants={fadeInUp} className="space-y-4">
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Hilf uns <span className="text-primary font-semibold">FreeMind</span> zu testen. Hier steht der Respekt
              für andere Meinungen im Mittelpunkt.
            </p>
            <p className="text-base sm:text-lg text-muted-foreground/80">
              Nur diesen Sonntag (25.01.) Die Ergebnisse werden veröffentlicht.
            </p>
            <p className="text-base sm:text-lg text-muted-foreground/80">
              Dein Engagement zählt. Führe viele Gespräche und bewerte sie.
            </p>
          </motion.div>

          {/* Icons Section */}
          <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-6 sm:gap-10 py-6">
            {/* Icon 1: Discussion */}
            <motion.div
              className="flex flex-col items-center gap-2 group cursor-default"
              whileHover={{
                scale: 1.1,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
              }}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageCircle
                  className="w-8 h-8 sm:w-10 sm:h-10 text-primary group-hover:rotate-12 transition-transform"
                  aria-hidden="true"
                />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Diskussionen</span>
            </motion.div>

            {/* Icon 2: Beta/Test */}
            <motion.div className="flex flex-col items-center gap-2 cursor-default" animate={pulseAnimation}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-accent/50 flex items-center justify-center">
                <FlaskConical className="w-8 h-8 sm:w-10 sm:h-10 text-accent-foreground" aria-hidden="true" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Testversion</span>
            </motion.div>

            {/* Icon 3: Progress */}
            <motion.div
              className="flex flex-col items-center gap-2 cursor-default"
              whileHover={{
                scale: 1.05,
              }}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-success/10 flex items-center justify-center relative overflow-hidden">
                <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-success z-10" aria-hidden="true" />
                {/* Mini animated progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-success/20">
                  <motion.div
                    className="h-full bg-success"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground font-medium">Entwicklung</span>
            </motion.div>
          </motion.div>

          {/* Micro-interactive hint */}
          <motion.div variants={fadeInUp}>
            <motion.p
              className="text-base text-muted-foreground italic px-4 py-3 rounded-xl bg-muted/50 border border-border/50 inline-block cursor-default"
              whileHover={{
                backgroundColor: "hsl(var(--primary) / 0.1)",
                borderColor: "hsl(var(--primary) / 0.3)",
              }}
              whileTap={{
                scale: 0.98,
              }}
              tabIndex={0}
              role="note"
              aria-label="Hinweis zur Plattform"
            >
              Teste jetzt, ob man im Netz noch respektvoll und ehrlich miteinander reden kann!
            </motion.p>
          </motion.div>

          {/* CTA Button */}
          <motion.div variants={fadeInUp} className="pt-4">
            <Link to="/auth" onClick={handleCTAClick}>
              <Button
                size="lg"
                className="text-lg px-8 py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Mitdiskutieren
              </Button>
            </Link>
          </motion.div>

          {/* Optional: Small footer note */}
          <motion.p variants={fadeInUp} className="text-xs text-muted-foreground/60 pt-4">
            FreeMind – Eine neuartige Plattform für freie und sichere Online-Gespräche
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
