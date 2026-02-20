import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Copy, RefreshCw, LogIn, UserPlus, AlertCircle, Check, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generatePassphrase, isValidPassphrase, passphraseToEmail, passphraseToPassword } from "@/lib/passphrase";

type AuthMode = "login" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [passphrase, setPassphrase] = useState("");
  const [generatedPassphrase, setGeneratedPassphrase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (mode === "signup") {
      setGeneratedPassphrase(generatePassphrase());
    }
  }, [mode]);

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
    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString();
    const content = `${t("auth.downloadFileTitle")}\n==================\nPassphrase: ${generatedPassphrase}\nDownloaded: ${formattedDate}\nTimestamp: ${timestamp}\n\n${t("auth.downloadFileWarning")}`;

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
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            setError(t("auth.passphraseTaken"));
          } else {
            setError(signUpError.message);
          }
        } else {
          localStorage.setItem('freemind_new_account', 'true');
          toast.success(t("auth.accountCreated"));
          navigate("/");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login")) {
            setError(t("auth.invalidPassphrase"));
          } else {
            setError(signInError.message);
          }
        } else {
          toast.success(t("auth.welcomeBack"));
          navigate("/");
        }
      }
    } catch (err) {
      setError(t("auth.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 safe-area-inset relative">
      {/* Back button - top left, aligned with content on desktop */}
      <div className="absolute top-4 left-4 md:static md:w-full md:max-w-md md:mb-2">
        <a
          href="/home"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth.back")}
        </a>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {/* Logo */}
        <h1 className="text-2xl md:text-3xl font-medium text-center mb-2">freemind</h1>
        <p className="text-white/60 text-center mb-6 md:mb-8 text-sm md:text-base">
          {t("auth.tagline")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          {mode === "signup" ? (
            <div className="space-y-2">
              <label className="text-sm text-white/80">{t("auth.yourSecretPassphrase")}</label>
              <p className="text-xs text-white/50">{t("auth.passphraseHelp")}</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 md:px-4 py-3 font-mono text-base md:text-lg break-all">
                  {generatedPassphrase}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="border-white/20 bg-transparent hover:bg-white/10 h-12 w-12 md:h-10 md:w-10 flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-5 h-5 md:w-4 md:h-4 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 md:w-4 md:h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDownload}
                  className="border-white/20 bg-transparent hover:bg-white/10 h-12 w-12 md:h-10 md:w-10 flex-shrink-0"
                  title={t("auth.passphraseDownloaded")}
                >
                  <Download className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateNew}
                  className="border-white/20 bg-transparent hover:bg-white/10 h-12 w-12 md:h-10 md:w-10 flex-shrink-0"
                >
                  <RefreshCw className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm text-white/80">{t("auth.enterPassphrase")}</label>
              <Input
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t("auth.passphrasePlaceholder")}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 font-mono h-12 md:h-10 text-base md:text-sm"
              />
              <p className="text-xs text-white/50">{t("auth.passphraseFormat")}</p>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 h-12 md:h-10 text-base md:text-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                {mode === "signup" ? t("auth.creatingAccount") : t("auth.loggingIn")}
              </span>
            ) : mode === "signup" ? (
              t("common.signUp")
            ) : (
              t("common.logIn")
            )}
          </Button>

          {/* Toggle link */}
          <p className="text-center text-sm">
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              {mode === "signup" ? t("auth.alreadyHavePassphrase") : t("auth.dontHavePassphrase")}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
