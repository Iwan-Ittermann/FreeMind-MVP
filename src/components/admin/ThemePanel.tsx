import { Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

const THEMES = [
  { value: 'classic', label: '🔵 Classic' },
  { value: 'city', label: '🏙️ City' },
  { value: 'arcane', label: '🏰 Arcane' },
  { value: 'signal', label: '📡 Signal & Noise' },
] as const;

export function ThemePanel() {
  const { data: setting, isLoading } = useAppSetting('active_theme');
  const updateSetting = useUpdateAppSetting();

  const currentTheme = setting?.value ?? 'classic';

  const handleChange = (value: string) => {
    updateSetting.mutate(
      { key: 'active_theme', value },
      {
        onSuccess: () => toast.success(`Theme switched to "${value}"`),
        onError: () => toast.error('Failed to update theme'),
      }
    );
  };

  return (
    <div className="max-w-md">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Global Theme</h3>
            <p className="text-sm text-muted-foreground">
              Choose the visual theme for all users
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="theme-select" className="text-sm font-medium">
            Active Theme
          </Label>
          <Select
            value={currentTheme}
            onValueChange={handleChange}
            disabled={isLoading || updateSetting.isPending}
          >
            <SelectTrigger id="theme-select" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
