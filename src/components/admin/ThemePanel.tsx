import { Palette } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

export function ThemePanel() {
  const { data: setting, isLoading } = useAppSetting('active_theme');
  const updateSetting = useUpdateAppSetting();

  const isCity = setting?.value === 'city';

  const handleToggle = (checked: boolean) => {
    const newTheme = checked ? 'city' : 'classic';
    updateSetting.mutate(
      { key: 'active_theme', value: newTheme },
      {
        onSuccess: () => toast.success(`Theme switched to "${newTheme}"`),
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
              Switch between Classic and City theme for all users
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="theme-toggle" className="text-sm font-medium">
            {isCity ? '🏙️ City Theme' : '🔵 Classic Theme'}
          </Label>
          <Switch
            id="theme-toggle"
            checked={isCity}
            onCheckedChange={handleToggle}
            disabled={isLoading || updateSetting.isPending}
          />
        </div>
      </div>
    </div>
  );
}
