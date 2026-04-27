import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Users, LogIn, KeyRound, Trophy, CircleDot, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/AuthDialog';
import { MiniGraph } from '@/components/chat/MiniGraph';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { TopicTitleWithLinks } from '@/components/TopicTitleWithLinks';

interface TopicWithStats {
  id: string;
  title: string;
  short_code: string;
  description: string | null;
  opinionCount: number;
  chatCount: number;
  latestOpinionAt: string | null;
}

function useActiveTopicsWithStats() {
  return useQuery({
    queryKey: ['homeTopics'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TopicWithStats[]> => {
      const { data: topics, error } = await supabase
        .from('topics')
        .select('id, title, short_code, description')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!topics || topics.length === 0) return [];

      const results: TopicWithStats[] = [];

      for (const topic of topics) {
        const [opRes, chatRes, latestOpRes] = await Promise.all([
          supabase
            .from('opinions_public')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id)
            .eq('visible', true),
          supabase
            .from('chat_requests')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id)
            .eq('status', 'accepted'),
          supabase
            .from('opinions_public')
            .select('created_at')
            .eq('topic_id', topic.id)
            .eq('visible', true)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        results.push({
          id: topic.id,
          title: topic.title,
          short_code: topic.short_code,
          description: topic.description,
          opinionCount: opRes.count || 0,
          chatCount: chatRes.count || 0,
          latestOpinionAt: latestOpRes.data?.[0]?.created_at || null,
        });
      }

      // Sort by latest opinion activity
      results.sort((a, b) => {
        if (!a.latestOpinionAt && !b.latestOpinionAt) return 0;
        if (!a.latestOpinionAt) return 1;
        if (!b.latestOpinionAt) return -1;
        return new Date(b.latestOpinionAt).getTime() - new Date(a.latestOpinionAt).getTime();
      });

      return results;
    },
  });
}

interface OpinionWithTopic {
  id: string;
  text: string;
  topic_id: string;
  topic_title: string;
  topic_short_code: string;
  created_at: string;
}

function useLatestOpinions() {
  return useQuery({
    queryKey: ['latestOpinions'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OpinionWithTopic[]> => {
      const { data: opinions, error } = await supabase
        .from('opinions_public')
        .select('id, text, topic_id, created_at')
        .eq('visible', true)
        .order('created_at', { ascending: false })
        .limit(9);

      if (error) throw error;
      if (!opinions || opinions.length === 0) return [];

      // Get unique topic IDs
      const topicIds = [...new Set(opinions.map(o => o.topic_id).filter(Boolean))];
      const { data: topics } = await supabase
        .from('topics')
        .select('id, title, short_code')
        .in('id', topicIds as string[]);

      const topicMap = new Map((topics || []).map(t => [t.id, t.title]));
      const topicCodeMap = new Map((topics || []).map(t => [t.id, t.short_code]));

      return opinions
        .filter(o => o.id && o.text && o.topic_id)
        .map(o => ({
          id: o.id!,
          text: o.text!,
          topic_id: o.topic_id!,
          topic_title: topicMap.get(o.topic_id!) || '',
          topic_short_code: topicCodeMap.get(o.topic_id!) || o.topic_id!,
          created_at: o.created_at!,
        }));
    },
  });
}

// Simple hash to pick a consistent color per topic
const topicColors = [
  'bg-primary/20 text-primary',
  'bg-accent/20 text-accent',
  'bg-rose-500/20 text-rose-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
];
function colorForTopic(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return topicColors[Math.abs(hash) % topicColors.length];
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { data: topics = [], isLoading } = useActiveTopicsWithStats();
  const { data: latestOpinions = [] } = useLatestOpinions();

  const visibleTopics = showAll ? topics : topics.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-base font-semibold text-foreground">
            freemind
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">{t('home.nav.about')}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {!user ? (
              <Button
                onClick={() => setAuthDialogOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-accent text-accent hover:bg-accent/10"
              >
                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                {t('home.login')}
              </Button>
            ) : (
              <div className="w-2 h-2 rounded-full bg-accent" title={t('home.loggedIn')} />
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/20">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight"
          >
            {t('home.hero.headline')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-sm sm:text-base text-muted-foreground"
          >
            {t('home.hero.subheadline')}
          </motion.p>
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground"
          >
            <li className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <span>{t('home.hero.bullet1')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span>{t('home.hero.bullet2')}</span>
            </li>
            <li className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-primary" />
              <span>{t('home.hero.bullet3')}</span>
            </li>
          </motion.ul>
        </div>
      </section>

      {/* Topic Grid */}
      <section className="container mx-auto px-4 pt-6 md:pt-8 pb-10 md:pb-16">
        <h2 className="text-lg font-semibold text-foreground mb-6">{t('home.discussions')}</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-72 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">{t('home.noDiscussions')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTopics.map((topic, i) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/${topic.short_code}`)}
                  className="group cursor-pointer rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 p-5 flex flex-col items-center gap-4"
                >
                  <div className="w-full flex justify-center py-2">
                    <MiniGraph topicId={topic.id} size={160} />
                  </div>

                  <div className="w-full text-center">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      <TopicTitleWithLinks title={topic.title} />
                    </h3>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {topic.opinionCount} {t('home.opinions')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {topic.chatCount} {t('home.chats')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {topics.length > 3 && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showAll ? (
                    <>
                      {t('home.showLess')}
                      <ChevronUp className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      {t('home.showMore')}
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Latest Opinions */}
      {latestOpinions.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <h2 className="text-lg font-semibold text-foreground mb-6">{t('home.recentOpinions')}</h2>
          <div className="flex flex-wrap gap-3">
            {latestOpinions.map((op, i) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/${op.topic_short_code}`)}
                className="cursor-pointer rounded-2xl border border-border/40 bg-card hover:border-primary/30 transition-all px-4 py-3 max-w-xs flex flex-col gap-2"
              >
                <p className="text-sm text-foreground line-clamp-2 leading-snug">
                  "{op.text}"
                </p>
                <span className={`self-start text-[10px] font-medium rounded-full px-2 py-0.5 ${colorForTopic(op.topic_id)}`}>
                  <TopicTitleWithLinks title={op.topic_title} />
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
