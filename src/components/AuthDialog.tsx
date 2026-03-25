import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Copy, RefreshCw, LogIn, UserPlus, AlertCircle, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generatePassphrase, isValidPassphrase, passphraseToEmail, passphraseToPassword } from "@/lib/passphrase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AuthMode = "login" | "signup";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [passphrase, setPassphrase] = useState("");
  const [generatedPassphrase, setGeneratedPassphrase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && mode === "signup") {
      setGeneratedPassphrase(generatePassphrase());
    }
  }, [open, mode]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setPassphrase("");
      setCopied(false);
    }
  }, [open]);

  const handleGenerateNew = () => {
    setGeneratedPassphrase(generatePassphrase());
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPassphrase);
    setCopied(true);
    toast.success(t("auth.passphraseCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `${t("auth.downloadFileTitle")}\n==================\nPassphrase: ${generatedPassphrase}\nDownloaded: ${new Date().toLocaleString()}\n\n${t("auth.downloadFileWarning")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freemind-passphrase-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("auth.passphraseDownloaded"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const phraseToUse = mode === "signup" ? generatedPassphrase : passphrase;

    if (!isValidPassphrase(phraseToUse)) {
      setError(t("auth.invalidPassphraseFormat"));
      setIsSubmitting(false);
      return;
    }

    const email = passphraseToEmail(phraseToUse);
    const password = passphraseToPassword(phraseToUse);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signUpError) {
          setError(signUpError.message.includes("already registered") ? t("auth.passphraseTaken") : signUpError.message);
        } else {
          localStorage.setItem('freemind_new_account', 'true');
          toast.success(t("auth.accountCreated"));
          onOpenChange(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message.includes("Invalid login") ? t("auth.invalidPassphrase") : signInError.message);
        } else {
          toast.success(t("auth.welcomeBack"));
          onOpenChange(false);
        }
      }
    } catch {
      setError(t("auth.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">freemind</DialogTitle>
          <DialogDescription className="text-center">
            {t("auth.tagline")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {mode === "signup" ? (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("auth.yourSecretPassphrase")}</label>
              <p className="text-xs text-muted-foreground/70">{t("auth.passphraseHelp")}</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted border border-border rounded-lg px-3 py-3 font-mono text-sm break-all">
                  {generatedPassphrase}
                </div>
                <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="h-11 w-11 shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={handleDownload} className="h-11 w-11 shrink-0">
                  <Download className="w-4 h-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={handleGenerateNew} className="h-11 w-11 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("auth.enterPassphrase")}</label>
              <Input
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t("auth.passphrasePlaceholder")}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground/70">{t("auth.passphraseFormat")}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary-foreground" />
                {mode === "signup" ? t("auth.creatingAccount") : t("auth.loggingIn")}
              </span>
            ) : mode === "signup" ? t("common.signUp") : t("common.logIn")}
          </Button>

          <p className="text-center text-sm">
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "signup" ? t("auth.alreadyHavePassphrase") : t("auth.dontHavePassphrase")}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
