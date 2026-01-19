import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Settings, Shield, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { emailToPassphrase } from '@/lib/passphrase';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigPanel({ open, onOpenChange }: ConfigPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const passphrase = user?.email ? emailToPassphrase(user.email) : null;

  const handleCopy = async () => {
    if (!passphrase) return;
    
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      toast.success('Passphrase copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!passphrase) return;
    
    const content = `Your Freemind Passphrase\n========================\n\n${passphrase}\n\nKeep this safe! You'll need it to log back in.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freemind-passphrase.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Passphrase downloaded!');
  };

  const handleOpenAdmin = () => {
    onOpenChange(false);
    navigate('/admin');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
      
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Manage your account and preferences
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Passphrase Section */}
          {user && passphrase && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Your Passphrase
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-muted font-mono text-sm text-foreground truncate">
                  {passphrase}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-9 w-9 shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleDownload}
                  className="h-9 w-9 shrink-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Save this passphrase securely. You'll need it to log back in.
              </p>
            </div>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground">
              Sign in to view your passphrase and access settings.
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Admin Dashboard */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Administration
            </label>
            <Button
              onClick={handleOpenAdmin}
              variant="outline"
              className="w-full justify-start"
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Dashboard
            </Button>
            <p className="text-xs text-muted-foreground">
              Requires admin password to access moderation tools.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
