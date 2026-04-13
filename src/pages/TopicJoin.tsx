import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, LogIn, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTopicBySlug, useJoinTopic, useHasJoinedTopic } from '@/hooks/useTopics';
import { toast } from 'sonner';

export default function TopicJoin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [joining, setJoining] = useState(false);

  const { data: topic, isLoading: topicLoading, error: topicError } = useTopicBySlug(slug || '');
  const { data: hasJoined, isLoading: joinedLoading } = useHasJoinedTopic(topic?.id || '');
  const joinTopic = useJoinTopic();

  // Redirect to topic view if already joined
  useEffect(() => {
    if (hasJoined && topic) {
      navigate(`/topic/${topic.id}`);
    }
  }, [hasJoined, topic, navigate]);

  const handleJoin = async () => {
    if (!slug) return;
    
    setJoining(true);
    try {
      const topicId = await joinTopic.mutateAsync(slug);
      toast.success(t('topicJoin.joinedSuccess'));
      navigate(`/topic/${topicId}`);
    } catch (err: any) {
      toast.error(err.message || t('topicJoin.failedToJoin'));
    } finally {
      setJoining(false);
    }
  };

  const isLoading = authLoading || topicLoading || joinedLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (topicError || !topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-card border border-border rounded-lg p-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Topic Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This topic doesn't exist or is no longer active.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10">
            <Users className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {topic.title}
          </h1>
          
          {topic.description && (
            <p className="text-muted-foreground text-center mb-6">
              {topic.description}
            </p>
          )}

          {!user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Sign in to join this discussion topic.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In to Join
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You've been invited to join this discussion.
              </p>
              <Button 
                onClick={handleJoin} 
                className="w-full"
                disabled={joining}
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                {joining ? 'Joining...' : 'Join Topic'}
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By joining, your IP address will be logged for moderation purposes.
        </p>
      </motion.div>
    </div>
  );
}
