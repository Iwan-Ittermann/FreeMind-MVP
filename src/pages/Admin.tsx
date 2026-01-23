import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield, FileText, History, AlertTriangle, ArrowLeft, Loader2, Layers, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ReportCard } from '@/components/moderation/ReportCard';
import { AuditLogTable } from '@/components/moderation/AuditLogTable';
import { TopicPanel } from '@/components/admin/TopicPanel';
import { useReports } from '@/hooks/useReports';
import { useGrantAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';


export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const grantAdminRole = useGrantAdminRole();
  const queryClient = useQueryClient();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const { data: reports = [], isLoading: reportsLoading } = useReports(isUnlocked);

  const handleUnlock = async () => {
    try {
      // Grant admin role to the user using password verification
      await grantAdminRole.mutateAsync(password);
      setIsUnlocked(true);
      setPassword('');
      toast.success('Admin-Dashboard freigeschaltet');
    } catch (err: any) {
      toast.error(err.message || 'Falsches Passwort');
      setPassword('');
    }
  };

  const handleResetDatabase = async () => {
    // Prompt for password instead of hardcoding
    const enteredPassword = prompt('Enter admin password to confirm database reset:');
    if (!enteredPassword) return;
    
    if (!confirm('Are you sure you want to reset the database? This will delete ALL opinions, chats, messages, ratings, and requests. This cannot be undone!')) {
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.functions.invoke('reset-database', {
        body: { password: enteredPassword },
      });

      if (error) throw error;

      toast.success('Database reset successfully');
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset database');
    } finally {
      setIsResetting(false);
    }
  };

  const pendingReports = reports.filter((r) => r.status === 'Unreviewed' || r.status === 'In-Review');
  const reviewedReports = reports.filter((r) => r.status === 'No-Suspicion' || r.status === 'Suspicion');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
            </div>
          </div>
          {isUnlocked && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Lock className="w-3 h-3 mr-1" />
              Freigeschaltet
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Zugang erforderlich</h2>
                    <p className="text-sm text-muted-foreground">
                      Geben Sie das Admin-Passwort ein
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Passwort eingeben..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    className="bg-background"
                  />
                  <Button 
                    onClick={handleUnlock} 
                    className="w-full"
                    disabled={grantAdminRole.isPending}
                  >
                    {grantAdminRole.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    Freischalten
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Tabs defaultValue="topics" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-6">
                  <TabsTrigger value="topics">
                    <Layers className="w-4 h-4 mr-2" />
                    Topics
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="relative">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Offen
                    {pendingReports.length > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {pendingReports.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="reviewed">
                    <FileText className="w-4 h-4 mr-2" />
                    Geprüft
                  </TabsTrigger>
                  <TabsTrigger value="audit">
                    <History className="w-4 h-4 mr-2" />
                    Audit-Log
                  </TabsTrigger>
                  <TabsTrigger value="danger" className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Danger
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="topics">
                  <TopicPanel />
                </TabsContent>

                <TabsContent value="pending">
                  {reportsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : pendingReports.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Keine offenen Meldungen</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 max-w-2xl">
                      {pendingReports.map((report) => (
                        <ReportCard key={report.id} report={report} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reviewed">
                  {reviewedReports.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Keine geprüften Meldungen</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 max-w-2xl">
                      {reviewedReports.map((report) => (
                        <ReportCard key={report.id} report={report} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="audit">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <AuditLogTable enabled={isUnlocked} />
                  </div>
                </TabsContent>

                <TabsContent value="danger">
                  <div className="max-w-md">
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-destructive">Danger Zone</h3>
                          <p className="text-sm text-muted-foreground">
                            Irreversible actions
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        This will permanently delete all opinions, chats, messages, ratings, and requests. This action cannot be undone.
                      </p>
                      
                      <Button
                        onClick={handleResetDatabase}
                        disabled={isResetting}
                        variant="destructive"
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isResetting ? 'Resetting...' : 'Reset Database'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
