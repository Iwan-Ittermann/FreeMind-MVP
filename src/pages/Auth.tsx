import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, RefreshCw, LogIn, UserPlus, AlertCircle, Check, Download } from "lucide-react";
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

  const [mode, setMode] = useState<AuthMode>("signup");
  const [passphrase, setPassphrase] = useState("");
  const [generatedPassphrase, setGeneratedPassphrase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Generate initial passphrase for signup
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
    toast.success("Passphrase copied! Save it somewhere safe.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString();
    const content = `FreeMind Passphrase
==================
Passphrase: ${generatedPassphrase}
Downloaded: ${formattedDate}
Timestamp: ${timestamp}

⚠️ IMPORTANT: Keep this file safe! This is your only way to log in.
There is no password recovery available.

Do not share this passphrase with anyone.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freemind-passphrase-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Passphrase downloaded! Keep the file safe.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const phraseToUse = mode === "signup" ? generatedPassphrase : passphrase;

    if (!isValidPassphrase(phraseToUse)) {
      setError("Invalid passphrase format. Use format: word-word-word-number");
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
            setError("This passphrase is already taken. Generate a new one.");
          } else {
            setError(signUpError.message);
          }
        } else {
          toast.success("Account created! Redirecting...");
          navigate("/");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login")) {
            setError("Invalid passphrase. Please check and try again.");
          } else {
            setError(signInError.message);
          }
        } else {
          toast.success("Welcome back!");
          navigate("/");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 safe-area-inset">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {/* Logo */}
        <h1 className="text-2xl md:text-3xl font-medium text-center mb-2">freemind</h1>
        <p className="text-white/60 text-center mb-6 md:mb-8 text-sm md:text-base">
          Free and Safe Online Conversations
        </p>

        {/* Mode Toggle */}
        <div className="flex bg-white/10 rounded-lg p-1 mb-6 md:mb-8">
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-3 md:py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-white/20 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            <UserPlus className="inline-block w-4 h-4 mr-2" />
            Sign Up
          </button>
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-3 md:py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "login" ? "bg-white/20 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            <LogIn className="inline-block w-4 h-4 mr-2" />
            Log In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          {mode === "signup" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-white/80">Your Secret Passphrase</label>
                <p className="text-xs text-white/50">This is your only way to log in. Save it somewhere safe!</p>
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
                    title="Download passphrase as .txt file"
                  >
                    <Download className="w-5 h-5 md:w-4 md:h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateNew}
                    className="border-white/20 bg-transparent hover:bg-white/10 h-12 w-12 md:h-10 md:w-10 flex-shrink-0"
                    title="Generate new passphrase"
                  >
                    <RefreshCw className="w-5 h-5 md:w-4 md:h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-200">
                  ⚠️ <strong>Important:</strong> Store your passphrase carefully. There is no way to recover it if lost.
                  ⚠️ <strong>Important:</strong> No illegal content. Your IP adress is tracked.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-sm text-white/80">Enter Your Passphrase</label>
              <Input
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="brave-ocean-dance-42"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 font-mono h-12 md:h-10 text-base md:text-sm"
              />
              <p className="text-xs text-white/50">Format: word-word-word-number</p>
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
                {mode === "signup" ? "Creating Account..." : "Logging In..."}
              </span>
            ) : mode === "signup" ? (
              "Create Account"
            ) : (
              "Log In"
            )}
          </Button>
        </form>

        {/* Back link */}
        <p className="text-center mt-6 md:mt-8 text-white/40 text-sm">
          <a href="/" className="hover:text-white transition-colors py-2 inline-block">
            ← Back to home
          </a>
        </p>
      </motion.div>
    </div>
  );
}
