import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'fm-secret-access';
const PASSWORD = 'wonderful';

export function hasSecretAccess(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function SecretGate({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD) {
      try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch { /* ignore */ }
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6">
      <form onSubmit={submit} className="w-full max-w-[320px] space-y-3 text-center">
        <h1 className="text-base font-semibold text-foreground">{t('secret.title')}</h1>
        <p className="text-xs text-muted-foreground">{t('secret.subtitle')}</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          placeholder={t('secret.placeholder')}
          className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        {error && <p className="text-xs text-destructive">{t('secret.wrong')}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          {t('secret.submit')}
        </button>
      </form>
    </div>
  );
}
