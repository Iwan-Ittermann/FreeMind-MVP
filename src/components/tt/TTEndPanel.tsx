import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, PartyPopper, Copy, Check, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const PRIZE_EMAIL = 'impressum@freemind.chat';

const NOUNS = [
  'Anker', 'Brücke', 'Delta', 'Feder', 'Funke', 'Garten', 'Hafen', 'Insel',
  'Kompass', 'Krone', 'Leuchtturm', 'Nebel', 'Norden', 'Ozean', 'Pfeil', 'Quelle',
  'Schiff', 'Stern', 'Strom', 'Wolke',
];

/** Deterministic, per-opinion prize code: Nomen + 4-stellige Zahl. */
function prizeCode(opinionId: string): string {
  let h = 2166136261;
  for (let i = 0; i < opinionId.length; i++) {
    h ^= opinionId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const noun = NOUNS[h % NOUNS.length];
  const num = 1000 + ((h >>> 8) % 9000);
  return `${noun}${num}`;
}

interface TTEndPanelProps {
  isWinner: boolean;
  rank: number | null;
  ownOpinionId: string | null;
}

export function TTEndPanel({ isWinner, rank, ownOpinionId }: TTEndPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [interestSent, setInterestSent] = useState(
    () => localStorage.getItem('fm-further-interest') === '1',
  );
  const [sending, setSending] = useState(false);

  const code = useMemo(() => (ownOpinionId ? prizeCode(ownOpinionId) : ''), [ownOpinionId]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard not available */
    }
  };

  const sendInterest = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('submit-question', {
        body: {
          question:
            'Interesse an weiteren Diskussionen: Ein Teilnehmer möchte bei künftigen freemind-Diskussionen dabei sein.' +
            (code ? ` Kennung: ${code}.` : ''),
        },
      });
      if (error) throw error;
      localStorage.setItem('fm-further-interest', '1');
      setInterestSent(true);
      toast({ title: 'Danke! Wir melden uns.' });
    } catch {
      toast({ title: 'Konnte nicht gesendet werden.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-3 right-3 bottom-[86px] z-30 flex justify-center"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md transition-colors ${
            isWinner
              ? 'border-primary/50 bg-primary/15 text-primary hover:bg-primary/25'
              : 'border-border/40 bg-background/90 text-foreground hover:bg-background'
          }`}
        >
          {isWinner ? <Trophy className="h-4 w-4 shrink-0" /> : <PartyPopper className="h-4 w-4 shrink-0" />}
          <span className="truncate">
            {isWinner ? 'Du hast gewonnen — Gewinn abrufen' : 'Diskussion beendet'}
          </span>
        </button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isWinner ? 'Herzlichen Glückwunsch!' : 'Die Diskussion ist vorbei'}
            </DialogTitle>
          </DialogHeader>

          {isWinner ? (
            <div className="space-y-4 text-sm text-foreground">
              <p>
                Du bist mit deinen Brückenpunkten
                {rank ? ` auf Platz ${rank}` : ''} unter den Top 5 — du gewinnst 50 €.
              </p>

              <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-center">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Dein persönliches Kennwort
                </div>
                <div className="mt-1 font-mono text-lg font-semibold">{code}</div>
                <button
                  type="button"
                  onClick={() => copy(code)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'kopiert' : 'kopieren'}
                </button>
              </div>

              <p>
                Schick uns dein Kennwort mit <strong>IBAN, Name und Bank</strong> oder deiner{' '}
                <strong>PayPal-Adresse</strong> an:
              </p>

              <Button asChild className="w-full">
                <a
                  href={`mailto:${PRIZE_EMAIL}?subject=${encodeURIComponent(
                    `freemind Gewinn ${code}`,
                  )}&body=${encodeURIComponent(
                    `Kennwort: ${code}\n\nIBAN:\nName:\nBank:\n\noder PayPal-Adresse:\n`,
                  )}`}
                >
                  {PRIZE_EMAIL}
                </a>
              </Button>

              <div className="text-center">
                <a
                  href={`mailto:${PRIZE_EMAIL}?subject=${encodeURIComponent(
                    `Gewinn spenden ${code}`,
                  )}&body=${encodeURIComponent(
                    `Kennwort: ${code}\n\nIch möchte meinen Gewinn an freemind spenden.`,
                  )}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  <Heart className="h-3 w-3" />
                  Meinen Gewinn an freemind spenden
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-foreground">
              <p>
                Danke, dass du dabei warst. Die Diskussion ist beendet — wir melden uns bald mit
                einer Auswertung.
              </p>
              <Button
                className="w-full"
                disabled={sending || interestSent}
                onClick={sendInterest}
              >
                {interestSent
                  ? 'Danke — wir melden uns!'
                  : sending
                    ? 'Wird gesendet …'
                    : 'Ich habe Interesse an weiteren Diskussionen'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
