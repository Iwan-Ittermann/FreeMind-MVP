import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageSquare, MessagesSquare, Star, Shield, Bot, Gavel, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: { staggerChildren: 0.15 },
  },
  viewport: { once: true },
};

const stepIcons = [MessageSquare, MessagesSquare, Star];
const stepKeys = ["state", "chat", "rate"] as const;

const zoneData = [
  { key: "green", color: "bg-success", textColor: "text-success" },
  { key: "orange", color: "bg-yellow-500", textColor: "text-yellow-500" },
  { key: "red", color: "bg-destructive", textColor: "text-destructive" },
] as const;

const privacyIcons = [Shield, Bot, Gavel];
const privacyKeys = ["anonymous", "ai", "legal"] as const;

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header title={t("about.title")} />

      <main className="container mx-auto px-4 py-12 md:py-20 max-w-4xl">
        {/* Hero Section */}
        <motion.section className="text-center mb-16 md:mb-24" {...fadeInUp}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {t("about.title")}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            {t("about.tagline")}
          </p>
        </motion.section>

        {/* The Problem Section */}
        <motion.section className="mb-16 md:mb-24" {...fadeInUp}>
          <div className="bg-card/50 border border-border rounded-2xl p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              {t("about.problem.title")}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t("about.problem.description", {
                highlight: "",
              }).split("{{highlight}}")[0]}
              <span className="text-destructive font-medium">{t("about.problem.outrage")}</span>
              {t("about.problem.description", {
                highlight: "",
              }).split("{{highlight}}")[1]}
            </p>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <p className="text-destructive font-medium mb-1">{t("about.problem.engagementDriven")}</p>
                <p className="text-sm text-muted-foreground">{t("about.problem.engagementDesc")}</p>
              </div>
              <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                <p className="text-success font-medium mb-1">{t("about.problem.empathyDriven")}</p>
                <p className="text-sm text-muted-foreground">{t("about.problem.empathyDesc")}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 3-Step Process Section */}
        <motion.section
          className="mb-16 md:mb-24"
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
        >
          <motion.h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground" {...fadeInUp}>
            {t("about.howItWorks")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {stepKeys.map((key, index) => {
              const Icon = stepIcons[index];
              return (
                <motion.div
                  key={key}
                  className="bg-card/50 border border-border rounded-xl p-6 text-center"
                  variants={{
                    initial: { opacity: 0, y: 30 },
                    whileInView: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.15 } },
                  }}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {t("about.step")} {index + 1}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    {t(`about.steps.${key}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`about.steps.${key}.description`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Bridging Score Section */}
        <motion.section className="mb-16 md:mb-24" {...fadeInUp}>
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground">
            {t("about.bridgingScore.title")}
          </h2>

          {/* Formula Card */}
          <div className="bg-card/50 border border-border rounded-2xl p-6 md:p-8 mb-8">
            <div className="text-center mb-6">
              <div className="inline-block bg-primary/10 border border-primary/20 rounded-xl px-6 py-4">
                <p className="text-sm text-muted-foreground mb-2">{t("about.bridgingScore.formula")}</p>
                <p className="text-2xl md:text-3xl font-mono font-bold text-primary">
                  {t("about.bridgingScore.formulaText")}
                </p>
              </div>
            </div>
            <p className="text-center text-muted-foreground max-w-xl mx-auto">
              <span className="text-foreground font-medium">{t("about.bridgingScore.empathy")}</span>
              {" "}{t("about.bridgingScore.rangesFrom")}{" "}
              <span className="text-foreground font-medium">{t("about.bridgingScore.disagreement")}</span>
              {" "}{t("about.bridgingScore.disagreementRanges")}{" "}
              <span className="text-destructive font-medium">-5000</span> {t("about.bridgingScore.to")}{" "}
              <span className="text-success font-medium">+5000</span>.
            </p>
          </div>

          {/* Zones */}
          <div className="space-y-4">
            {zoneData.map((zone, index) => (
              <motion.div
                key={zone.key}
                className="bg-card/50 border border-border rounded-xl p-5 flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`w-4 h-4 rounded-full ${zone.color} mt-1 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-bold ${zone.textColor}`}>
                      {t(`about.zones.${zone.key}.name`)}
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {t(`about.zones.${zone.key}.range`)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`about.zones.${zone.key}.meaning`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Graph Visualization Explained */}
        <motion.section className="mb-16 md:mb-24" {...fadeInUp}>
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground">
            {t("about.graph.title")}
          </h2>
          <div className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-foreground mb-2">{t("about.graph.circles.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("about.graph.circles.description")}</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">{t("about.graph.nodes.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("about.graph.nodes.description")}</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">{t("about.graph.top5.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("about.graph.top5.description")}</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">{t("about.graph.position.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("about.graph.position.description")}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Privacy & Safety Section */}
        <motion.section
          className="mb-16 md:mb-24"
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
        >
          <motion.h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground" {...fadeInUp}>
            {t("about.privacy.title")}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {privacyKeys.map((key, index) => {
              const Icon = privacyIcons[index];
              return (
                <motion.div
                  key={key}
                  className="bg-card/50 border border-border rounded-xl p-6"
                  variants={{
                    initial: { opacity: 0, y: 30 },
                    whileInView: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.15 } },
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">
                    {t(`about.privacy.${key}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`about.privacy.${key}.description`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Call to Action - inline section */}
        <motion.section className="text-center pb-24" {...fadeInUp}>
          <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              {t("about.cta.title")}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("about.cta.description")}
            </p>
          </div>
        </motion.section>
      </main>

      {/* Floating CTA Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Link to="/">
          <Button 
            size="lg" 
            className="shadow-2xl shadow-primary/30 animate-pulse-fast px-8"
          >
            {t("about.cta.getStarted")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
