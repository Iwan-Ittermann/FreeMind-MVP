import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useAdminRole';
import { Download, Send, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const replySchema = z.object({
  warmth: z.number().min(0).max(100),
  understanding: z.number().min(1).max(7),
  sincerity: z.number().min(1).max(7),
  email: z.string().trim().email('Bitte geben Sie eine gültige E-Mail-Adresse ein.').max(255),
});

export default function TestDiskussion() {
  const { t } = useTranslation();
  const { data: isAdmin } = useIsAdmin();
  const [warmth, setWarmth] = useState(50);
  const [understanding, setUnderstanding] = useState(4);
  const [sincerity, setSincerity] = useState(4);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = replySchema.safeParse({ warmth, understanding, sincerity, email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: dbError } = await supabase
        .from('test_diskussion_replies')
        .insert({
          warmth: result.data.warmth,
          understanding: result.data.understanding,
          sincerity: result.data.sincerity,
          email: result.data.email,
        });

      if (dbError) {
        setError(dbError.message);
      } else {
        setSubmitted(true);
        setWarmth(50);
        setUnderstanding(4);
        setSincerity(4);
        setEmail('');
      }
    } catch {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scaleLabels = (min: string, max: string, value: number, total: number) => (
    <div className="flex justify-between text-xs text-muted-foreground mt-1">
      <span>{min}</span>
      <span className="font-semibold text-foreground">{value}/{total}</span>
      <span>{max}</span>
    </div>
  );

  const handleDownloadCSV = async () => {
    const { data, error } = await supabase
      .from('test_diskussion_replies')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return;

    const headers = ['id', 'created_at', 'email', 'warmth', 'understanding', 'sincerity'];
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => `"${String((row as any)[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-diskussion-replies-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header title="Test-Diskussion" />

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          <h1 className="text-2xl font-bold text-center">Test-Diskussion</h1>
          <p className="text-sm text-muted-foreground text-center">
            AfD-Verbotsverfahren — Ihre Einschätzung
          </p>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle className="w-12 h-12 text-accent" />
              <p className="text-lg font-medium">Danke für Ihre Teilnahme!</p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Erneut teilnehmen
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Q1: Warmth thermometer */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-snug block">
                  1. Wie warm oder kalt fühlen Sie gegenüber Menschen mit der gegenteiligen Meinung zur Prüfung des AfD-Verbotsverfahrens?
                </label>
                <Slider
                  value={[warmth]}
                  onValueChange={v => setWarmth(v[0])}
                  min={0}
                  max={100}
                  step={1}
                />
                {scaleLabels('0° (Eisig)', '100° (Herzlich)', warmth, 100)}
              </div>

              {/* Q2: Understanding */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-snug block">
                  2. Könnten Sie die Argumente der Gegenseite so erklären, dass diese sich richtig verstanden fühlt?
                </label>
                <Slider
                  value={[understanding]}
                  onValueChange={v => setUnderstanding(v[0])}
                  min={1}
                  max={7}
                  step={1}
                />
                {scaleLabels('1 (Gar nicht)', '7 (Absolut)', understanding, 7)}
              </div>

              {/* Q3: Sincerity */}
              <div className="space-y-3">
                <label className="text-sm font-medium leading-snug block">
                  3. Glauben Sie, dass die Gegenseite aus echter Sorge um unsere Demokratie handelt?
                </label>
                <Slider
                  value={[sincerity]}
                  onValueChange={v => setSincerity(v[0])}
                  min={1}
                  max={7}
                  step={1}
                />
                {scaleLabels('1 (Böswillig)', '7 (Aufrichtig)', sincerity, 7)}
              </div>

              {/* Q4: Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-snug block">
                  4. Zur Verifizierung: Wie lautet die E-Mail-Adresse, mit der Sie teilnehmen?
                </label>
                <p className="text-xs text-muted-foreground">Wird wieder gelöscht.</p>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  maxLength={255}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full h-12">
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Wird gesendet...' : 'Absenden'}
              </Button>
            </form>
          )}

          {isAdmin && (
            <div className="pt-4 border-t border-border/40">
              <Button variant="outline" onClick={handleDownloadCSV} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Antworten als CSV herunterladen
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
