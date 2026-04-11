import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Users, LogIn, KeyRound, Trophy, CircleDot } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/AuthDialog';
import { MiniGraph } from '@/components/chat/MiniGraph';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';

interface TopicWithStats {
  id: string;
  title: string;
  description: string | null;
  opinionCount: number;
  chatCount: number;
}

function useActiveTopicsWithStats() {
  return useQuery({
    queryKey: ['homeTopics'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TopicWithStats[]> => {
      const { data: topics, error } = await supabase
        .from('topics')
        .select('id, title, description')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!topics || topics.length === 0) return [];

      const results: TopicWithStats[] = [];

      for (const topic of topics) {
        const [opRes, chatRes] = await Promise.all([
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
        ]);

        results.push({
          id: topic.id,
          title: topic.title,
          description: topic.description,
          opinionCount: opRes.count || 0,
          chatCount: chatRes.count || 0,
        });
      }

      return results;
    },
  });
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { data: topics = [], isLoading } = useActiveTopicsWithStats();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-base font-semibold text-foreground">
            freemind
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">{t('landing.home.nav.about')}</Link>
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
            {t('landing.home.hero.headline')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-sm sm:text-base text-muted-foreground"
          >
            {t('landing.home.hero.subheadline')}
          </motion.p>
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground"
          >
            <li className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <span>{t('landing.home.hero.bullet1')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span>{t('landing.home.hero.bullet2')}</span>
            </li>
            <li className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-primary" />
              <span>{t('landing.home.hero.bullet3')}</span>
            </li>
          </motion.ul>
        </div>
      </section>

      {/* Topic Grid */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <h2 className="text-lg font-semibold text-foreground mb-6">{t('landing.home.discussions')}</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-72 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">{t('home.noDiscussions')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic, i) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/topic/${topic.id}`)}
                className="group cursor-pointer rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 p-5 flex flex-col items-center gap-4"
              >
                <div className="w-full flex justify-center py-2">
                  <MiniGraph topicId={topic.id} size={160} />
                </div>

                <div className="w-full text-center">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {topic.title}
                  </h3>
                  {topic.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {topic.opinionCount} {t('landing.home.opinions')}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {topic.chatCount} {t('landing.home.chats')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
