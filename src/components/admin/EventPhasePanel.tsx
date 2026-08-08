import { useEffect, useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

/** Convert an ISO string to the value format of <input type="datetime-local"> (local time). */
function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({
  settingKey,
  label,
  hint,
  type,
}: {
  settingKey: string;
  label: string;
  hint: string;
  type: 'text' | 'datetime-local';
}) {
  const { data: setting, isLoading } = useAppSetting(settingKey);
  const update = useUpdateAppSetting();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isLoading) return;
    const raw = setting?.value ?? '';
    setValue(type === 'datetime-local' ? toLocalInput(raw) : raw);
  }, [setting?.value, isLoading, type]);

  const save = () => {
    let out = value.trim();
    if (type === 'datetime-local' && out) {
      const d = new Date(out);
      if (isNaN(d.getTime())) {
        toast.error('Ungültiges Datum');
        return;
      }
      out = d.toISOString();
    }
    update.mutate(
      { key: settingKey, value: out },
      {
        onSuccess: () => toast.success('Gespeichert'),
        onError: () => toast.error('Speichern fehlgeschlagen'),
      },
    );
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={settingKey} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={settingKey}
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isLoading}
          placeholder={type === 'text' ? 'z.B. 4g8l' : undefined}
        />
        <Button variant="outline" size="icon" onClick={save} disabled={update.isPending}>
          <Save className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Admin controls for the event phases and which topic is test vs. real. */
export function EventPhasePanel() {
  return (
    <div className="max-w-md bg-card border border-border rounded-lg p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarClock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Event-Phasen</h3>
          <p className="text-sm text-muted-foreground">Testthema, echtes Thema und Zeitpunkte</p>
        </div>
      </div>

      <Row
        settingKey="test_topic_short_code"
        label="Testthema (Short-Code)"
        hint="Immer offen, erreichbar unter /test"
        type="text"
      />
      <Row
        settingKey="real_topic_short_code"
        label="Echtes Thema (Short-Code)"
        hint="Erreichbar unter /go. Leer = /go zeigt weiterhin das Testthema ohne Zeitsperren."
        type="text"
      />
      <Row
        settingKey="opinions_open_at"
        label="Meinungen ab"
        hint="Vorher: Countdown, keine Abgabe möglich (auch serverseitig gesperrt)."
        type="datetime-local"
      />
      <Row
        settingKey="discussion_open_at"
        label="Diskussion ab"
        hint="Vorher: keine Chats möglich (auch serverseitig gesperrt)."
        type="datetime-local"
      />
    </div>
  );
}
