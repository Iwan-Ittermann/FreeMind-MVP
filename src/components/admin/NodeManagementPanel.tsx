import { useState } from 'react';
import { Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function NodeManagementPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: opinions = [], isLoading } = useQuery({
    queryKey: ['admin-opinions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opinions')
        .select('id, text, created_at, user_id, visible, status')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (opinionId: string) => {
    setDeletingId(opinionId);
    try {
      const { error } = await supabase.rpc('delete_opinion_cascade', {
        _opinion_id: opinionId,
      });
      if (error) throw error;
      toast.success(t('admin.toast.nodeDeleted'));
      queryClient.invalidateQueries({ queryKey: ['admin-opinions'] });
      queryClient.invalidateQueries({ queryKey: ['topic'] });
    } catch (err: any) {
      toast.error(err.message || t('admin.toast.failedToDeleteNode'));
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const filtered = opinions.filter(o =>
    o.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Node Management</h3>
        <p className="text-sm text-muted-foreground">
          Delete opinion nodes and all associated data (chats, messages, ratings, requests).
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search opinions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No opinions found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((opinion) => (
            <div
              key={opinion.id}
              className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2">{opinion.text}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{new Date(opinion.created_at).toLocaleDateString()}</span>
                  {!opinion.visible && (
                    <span className="text-destructive">Hidden</span>
                  )}
                  <span className="font-mono truncate max-w-[120px]">{opinion.user_id.slice(0, 8)}…</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmId(opinion.id)}
                disabled={deletingId === opinion.id}
              >
                {deletingId === opinion.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this opinion and ALL related chats, messages, ratings, and requests. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && handleDelete(confirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
