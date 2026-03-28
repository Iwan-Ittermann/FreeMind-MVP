import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useAdminRole';
import { Download, Send, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const replySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  message: z.string().trim().min(5, 'Message too short').max(2000),
});

export default function TestDiskussion() {
  const { t } = useTranslation();
  const { isAdmin } = useAdminRole();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = replySchema.safeParse({ name, email, message });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: dbError } = await supabase
        .from('test_diskussion_replies')
        .insert({ name: result.data.name, email: result.data.email, message: result.data.message });

      if (dbError) {
        setError(dbError.message);
      } else {
        setSubmitted(true);
        setName('');
        setEmail('');
        setMessage('');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadCSV = async () => {
    const { data, error } = await supabase
      .from('test_diskussion_replies')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return;

    const headers = ['id', 'created_at', 'name', 'email', 'message'];
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
            Teile deine Meinung — deine Antwort wird gespeichert.
          </p>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle className="w-12 h-12 text-accent" />
              <p className="text-lg font-medium">Danke für deine Antwort!</p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Weitere Antwort abgeben
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Dein Name"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">E-Mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nachricht</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Deine Meinung oder Nachricht..."
                  maxLength={2000}
                  rows={4}
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
