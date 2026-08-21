import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { loginWithPassphrase } from '@/lib/passphrase-login';

import {
  subscribeVerificationDialog,
  closeVerificationDialog,
} from '@/lib/verification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Global verification dialog. Rendered once from App root.
 * Offers two paths for anonymous users:
 *   1. Enter an existing passphrase (received via email).
 *   2. Register with an email address (link to Landing / new signup).
 */
export function VerificationDialog() {
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeVerificationDialog(setOpen), []);

  useEffect(() => {
    if (!open) {
      setError(null);
      setPassphrase('');
      setEmail('');
    }
  }, [open]);

  const handlePassphraseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await loginWithPassphrase(passphrase);
    setBusy(false);
    if (res.ok) {
      toast.success('Willkommen zurück!');
      closeVerificationDialog();
      return;
    }
    if (res.reason === 'invalid-format') {
      setError('Ungültiges Format. Beispiel: brave-ocean-dance-42');
    } else if (res.reason === 'not-found') {
      setError('Passphrase nicht erkannt. Bitte prüfe deine E-Mail.');
    } else {
      setError('Etwas ist schiefgelaufen.');
    }
  };


  const handleRequestPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('signup-request', {
        body: { email: cleaned },
      });
      if (fnErr) {
        setError('Etwas ist schiefgelaufen.');
        return;
      }
      const status = (data as { status?: string } | null)?.status;
      if (status === 'sent') {
        toast.success('Bestätigungs-Mail gesendet. Bitte prüfe dein Postfach.');
        closeVerificationDialog();
      } else if (status === 'resent') {
        toast.success('Wir haben dir deine Passphrase erneut zugeschickt.');
        closeVerificationDialog();
      } else if (status === 'already_confirmed') {
        toast.success('Du bist schon bestätigt. Bitte prüfe dein Postfach.');
        closeVerificationDialog();
      } else if (status === 'closed') {
        setError('Anmeldung geschlossen — das Event ist vorbei.');
      } else {
        setError('Etwas ist schiefgelaufen.');
      }
    } catch {
      setError('Etwas ist schiefgelaufen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : closeVerificationDialog())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Um mitzumachen brauchst du eine Passphrase</DialogTitle>
          <DialogDescription>
            Damit stellen wir sicher, dass jede Teilnehmerin nur einmal mitdiskutiert.
            Ansehen darfst du alles auch ohne Anmeldung.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePassphraseLogin} className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Ich habe schon eine Passphrase
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={passphrase}
              onChange={(ev) => setPassphrase(ev.target.value)}
              
              className="font-mono"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button type="submit" disabled={busy}>
              Anmelden
            </Button>
          </div>
        </form>

        <div className="relative py-2 text-center">
          <span className="bg-background text-muted-foreground text-xs px-2 relative z-10">
            oder
          </span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-0" />
        </div>

        <form onSubmit={handleRequestPassphrase} className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" /> Neue Passphrase per E-Mail
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="deine@email.de"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button type="submit" variant="secondary" disabled={busy}>
              Senden
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Wir schicken dir einen Bestätigungslink. Nach dem Klick bekommst du deine Passphrase per Mail.
          </p>
        </form>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Mehr Infos auf der{' '}
          <Link
            to="/"
            className="underline hover:text-foreground"
            onClick={() => closeVerificationDialog()}
          >
            Startseite
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
