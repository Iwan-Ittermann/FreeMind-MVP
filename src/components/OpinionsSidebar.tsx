import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OpinionsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
}

interface OpinionItem {
  id: string;
  text: string;
  created_at: string;
  visible: boolean;
  notice_text: string | null;
}

export function OpinionsSidebar({ open, onOpenChange, topicId }: OpinionsSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Fetch all opinions for the topic using the public view
  const { data: opinions, isLoading } = useQuery({
    queryKey: ['allOpinions', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opinions_public')
        .select('id, text, created_at, visible, notice_text')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OpinionItem[];
    },
    enabled: open && !!topicId,
  });

  const filteredOpinions = useMemo(() => {
    if (!opinions) return [];
    if (!search.trim()) return opinions;
    
    const query = search.toLowerCase();
    return opinions.filter(op => 
      op.text.toLowerCase().includes(query)
    );
  }, [opinions, search]);

  const handleOpinionClick = (opinionId: string) => {
    // Navigate to view this opinion's chat (read-only)
    navigate(`/chat?their=${opinionId}&readonly=true`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {t('sidebar.allOpinions', 'All Opinions')}
          </SheetTitle>
          <SheetDescription>
            {t('sidebar.browseOpinions', 'Browse all opinions on this topic')}
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('sidebar.searchOpinions', 'Search opinions...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Opinions List */}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : filteredOpinions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {search 
                ? t('sidebar.noOpinionsFound', 'No opinions found')
                : t('sidebar.noOpinionsYet', 'No opinions yet')
              }
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredOpinions.map((opinion) => (
                <button
                  key={opinion.id}
                  onClick={() => handleOpinionClick(opinion.id)}
                  className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  {opinion.visible === false ? (
                    <p className="text-sm text-destructive/70 italic">
                      {opinion.notice_text || t('index.contentHidden')}
                    </p>
                  ) : (
                    <p className="text-sm text-foreground line-clamp-3">
                      "{opinion.text}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(opinion.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Count */}
        {opinions && opinions.length > 0 && (
          <div className="pt-2 border-t border-border text-xs text-muted-foreground">
            {filteredOpinions.length} {t('sidebar.of', 'of')} {opinions.length} {t('common.opinions')}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
