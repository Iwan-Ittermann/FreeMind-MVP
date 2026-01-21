import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageSquare, MessagesSquare, Star, Shield, Bot, Gavel, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, ease: "easeOut" as const }
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: { staggerChildren: 0.15 }
  },
  viewport: { once: true }
};

const steps = [
  {
    icon: MessageSquare,
    title: "STATE",
    description: "Share your perspective on the question. Your opinion becomes a node on the graph."
  },
  {
    icon: MessagesSquare,
    title: "CHAT",
    description: "Connect with people who think differently. Request conversations with other nodes."
  },
  {
    icon: Star,
    title: "RATE",
    description: "Evaluate your conversation partner on empathy and disagreement to calculate bridging scores."
  }
];

const zones = [
  {
    name: "Green Zone",
    range: "> 2500",
    color: "bg-success",
    textColor: "text-success",
    meaning: "High empathy + High disagreement = True bridging. You understood someone you deeply disagree with."
  },
  {
    name: "Orange Zone",
    range: "0 – 2500",
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    meaning: "Moderate bridging potential. Good conversation, but room to grow in empathy or find deeper disagreement."
  },
  {
    name: "Red Zone",
    range: "< 0",
    color: "bg-destructive",
    textColor: "text-destructive",
    meaning: "Negative empathy indicates harmful interaction. The conversation wasn't constructive."
  }
];

const privacyFeatures = [
  {
    icon: Shield,
    title: "Anonymous Identity",
    description: "Passphrase-based login with no email or phone required. Your identity stays private."
  },
  {
    icon: Bot,
    title: "AI Conciliation",
    description: "AI mediator available to help de-escalate heated discussions and find common ground."
  },
  {
    icon: Gavel,
    title: "Community Moderation",
    description: "Report system with court-style review process ensures fair and transparent content moderation."
  }
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header title="About FreeMind" />
      
      <main className="container mx-auto px-4 py-12 md:py-20 max-w-4xl">
        {/* Hero Section */}
        <motion.section 
          className="text-center mb-16 md:mb-24"
          {...fadeInUp}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            About FreeMind
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Transforming online disagreement into understanding
          </p>
        </motion.section>

        {/* The Problem Section */}
        <motion.section 
          className="mb-16 md:mb-24"
          {...fadeInUp}
        >
          <div className="bg-card/50 border border-border rounded-2xl p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">The Problem</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Today's social platforms reward <span className="text-destructive font-medium">outrage over understanding</span>. 
              Algorithms amplify conflict because angry engagement drives clicks. The result? 
              We've forgotten how to disagree constructively with people who think differently.
            </p>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <p className="text-destructive font-medium mb-1">Engagement-Driven</p>
                <p className="text-sm text-muted-foreground">Rewards anger, division, and echo chambers</p>
              </div>
              <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                <p className="text-success font-medium mb-1">Empathy-Driven</p>
                <p className="text-sm text-muted-foreground">Rewards understanding, bridging, and growth</p>
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
          <motion.h2 
            className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground"
            {...fadeInUp}
          >
            How It Works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="bg-card/50 border border-border rounded-xl p-6 text-center"
                variants={{
                  initial: { opacity: 0, y: 30 },
                  whileInView: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.15 } }
                }}
              >
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Step {index + 1}</div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Bridging Score Section */}
        <motion.section 
          className="mb-16 md:mb-24"
          {...fadeInUp}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground">
            The Bridging Score
          </h2>
          
          {/* Formula Card */}
          <div className="bg-card/50 border border-border rounded-2xl p-6 md:p-8 mb-8">
            <div className="text-center mb-6">
              <div className="inline-block bg-primary/10 border border-primary/20 rounded-xl px-6 py-4">
                <p className="text-sm text-muted-foreground mb-2">The Formula</p>
                <p className="text-2xl md:text-3xl font-mono font-bold text-primary">
                  Bridging = Empathy × Disagreement
                </p>
              </div>
            </div>
            <p className="text-center text-muted-foreground max-w-xl mx-auto">
              <span className="text-foreground font-medium">Empathy</span> ranges from -50 to +50. 
              <span className="text-foreground font-medium"> Disagreement</span> ranges from 0 to 100. 
              Your score ranges from <span className="text-destructive font-medium">-5000</span> to <span className="text-success font-medium">+5000</span>.
            </p>
          </div>

          {/* Zones */}
          <div className="space-y-4">
            {zones.map((zone, index) => (
              <motion.div
                key={zone.name}
                className="bg-card/50 border border-border rounded-xl p-5 flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`w-4 h-4 rounded-full ${zone.color} mt-1 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-bold ${zone.textColor}`}>{zone.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {zone.range}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{zone.meaning}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Graph Visualization Explained */}
        <motion.section 
          className="mb-16 md:mb-24"
          {...fadeInUp}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground">
            Reading the Graph
          </h2>
          <div className="bg-card/50 border border-border rounded-2xl p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-foreground mb-2">Concentric Circles</h3>
                <p className="text-sm text-muted-foreground">
                  The graph displays three rings representing bridging score zones. 
                  The closer to the center, the higher the bridging score.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">Nodes & Edges</h3>
                <p className="text-sm text-muted-foreground">
                  Each node is an opinion. Lines connecting nodes represent conversations. 
                  Thicker lines indicate deeper engagement.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">Top 5 Bridgers</h3>
                <p className="text-sm text-muted-foreground">
                  The five highest-scoring bridgers appear in the green center zone with special prominence.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">Your Position</h3>
                <p className="text-sm text-muted-foreground">
                  Your node is highlighted. Click other nodes to request conversations or view existing chats.
                </p>
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
          <motion.h2 
            className="text-2xl md:text-3xl font-bold mb-8 text-center text-foreground"
            {...fadeInUp}
          >
            Privacy & Safety
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {privacyFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="bg-card/50 border border-border rounded-xl p-6"
                variants={{
                  initial: { opacity: 0, y: 30 },
                  whileInView: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.15 } }
                }}
              >
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.section 
          className="text-center"
          {...fadeInUp}
        >
          <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Ready to bridge the divide?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Join the conversation and discover what happens when empathy meets disagreement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
