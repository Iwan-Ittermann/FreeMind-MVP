import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, RefreshCw, LogIn, UserPlus, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  generatePassphrase, 
  isValidPassphrase, 
  passphraseToEmail, 
  passphraseToPassword 
} from '@/lib/passphrase';

type AuthMode = 'login' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signup');
  const [passphrase, setPassphrase] = useState('');
  const [generatedPassphrase, setGeneratedPassphrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Generate initial passphrase for signup
  useEffect(() => {
    if (mode === 'signup') {
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
    toast.success('Passphrase copied! Save it somewhere safe.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const phraseToUse = mode === 'signup' ? generatedPassphrase : passphrase;

    if (!isValidPassphrase(phraseToUse)) {
      setError('Invalid passphrase format. Use format: word-word-word-number');
      setIsSubmitting(false);
      return;
    }

    const email = passphraseToEmail(phraseToUse);
    const password = passphraseToPassword(phraseToUse);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('This passphrase is already taken. Generate a new one.');
          } else {
            setError(signUpError.message);
          }
        } else {
          toast.success('Account created! Redirecting...');
          navigate('/');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login')) {
            setError('Invalid passphrase. Please check and try again.');
          } else {
            setError(signInError.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <h1 className="text-3xl font-medium text-center mb-2">freemind</h1>
        <p className="text-white/60 text-center mb-8">Free and Safe Online Conversations</p>

        {/* Mode Toggle */}
        <div className="flex bg-white/10 rounded-lg p-1 mb-8">
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'signup' 
                ? 'bg-primary text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <UserPlus className="inline-block w-4 h-4 mr-2" />
            Sign Up
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'login' 
                ? 'bg-primary text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <LogIn className="inline-block w-4 h-4 mr-2" />
            Log In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'signup' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-white/80">Your Secret Passphrase</label>
                <p className="text-xs text-white/50">
                  This is your only way to log in. Save it somewhere safe!
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 font-mono text-lg">
                    {generatedPassphrase}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="border-white/20 bg-transparent hover:bg-white/10"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateNew}
                    className="border-white/20 bg-transparent hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-200">
                  ⚠️ <strong>Important:</strong> Copy and save your passphrase before continuing. 
                  There is no way to recover it if lost.
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
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 font-mono"
              />
              <p className="text-xs text-white/50">
                Format: word-word-word-number
              </p>
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
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                {mode === 'signup' ? 'Creating Account...' : 'Logging In...'}
              </span>
            ) : (
              mode === 'signup' ? 'Create Account' : 'Log In'
            )}
          </Button>
        </form>

        {/* Back link */}
        <p className="text-center mt-8 text-white/40 text-sm">
          <a href="/" className="hover:text-white transition-colors">
            ← Back to home
          </a>
        </p>
      </motion.div>
    </div>
  );
}
