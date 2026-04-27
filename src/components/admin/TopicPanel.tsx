import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Archive, Trash2, Link2, Copy, Loader2, ExternalLink, Pencil, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllTopics, useUpdateTopicStatus, Topic } from '@/hooks/useTopics';
import { CreateTopicDialog } from './CreateTopicDialog';
import { EditTopicTitleDialog } from './EditTopicTitleDialog';
import { EditSiteTitleDialog } from './EditSiteTitleDialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { TopicTitleWithLinks } from '@/components/TopicTitleWithLinks';

interface TopicCardProps {
  topic: Topic;
  onArchive: (topicId: string) => void;
  onDelete: (topicId: string) => void;
  onRestore: (topicId: string) => void;
  onEdit: (topic: Topic) => void;
  isUpdating: boolean;
}

function TopicCard({ topic, onArchive, onDelete, onRestore, onEdit, isUpdating }: TopicCardProps) {
  const { t } = useTranslation();
  const baseUrl = window.location.origin;
  const topicUrl = `${baseUrl}/${topic.short_code}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(topicUrl);
    toast.success(t('admin.toast.urlCopied'));
  };

  const statusBadge = {
    Active: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>,
    Archived: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Archived</Badge>,
    Deleted: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Deleted</Badge>,
  }[topic.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              <TopicTitleWithLinks title={topic.title} />
            </h3>
            {statusBadge}
          </div>
          {topic.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {topic.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link2 className="w-3 h-3" />
            <span className="truncate">/{topic.short_code}</span>
            <button onClick={copyUrl} className="hover:text-foreground">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {topic.status === 'Active' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(topic)}
                title="Edit topic"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/${topic.short_code}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onArchive(topic.id)}
                disabled={isUpdating}
              >
                <Archive className="w-4 h-4" />
              </Button>
            </>
          )}
          {topic.status === 'Archived' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRestore(topic.id)}
                disabled={isUpdating}
              >
                Restore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(topic.id)}
                disabled={isUpdating}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {topic.status === 'Deleted' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRestore(topic.id)}
              disabled={isUpdating}
            >
              Restore
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function TopicPanel() {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editSiteTitleDialogOpen, setEditSiteTitleDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const { data: topics = [], isLoading } = useAllTopics(true);
  const updateStatus = useUpdateTopicStatus();

  const activeTopics = topics.filter(t => t.status === 'Active');
  const archivedTopics = topics.filter(t => t.status === 'Archived');
  const deletedTopics = topics.filter(t => t.status === 'Deleted');

  const handleArchive = async (topicId: string) => {
    try {
      await updateStatus.mutateAsync({ topicId, status: 'Archived' });
      toast.success(t('admin.toast.topicArchived'));
    } catch (err: any) {
      toast.error(err.message || t('admin.toast.failedToArchive'));
    }
  };

  const handleDelete = async (topicId: string) => {
    try {
      await updateStatus.mutateAsync({ topicId, status: 'Deleted' });
      toast.success(t('admin.toast.topicDeleted'));
    } catch (err: any) {
      toast.error(err.message || t('admin.toast.failedToDelete'));
    }
  };

  const handleRestore = async (topicId: string) => {
    try {
      await updateStatus.mutateAsync({ topicId, status: 'Active' });
      toast.success(t('admin.toast.topicRestored'));
    } catch (err: any) {
      toast.error(err.message || t('admin.toast.failedToRestore'));
    }
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Topics</h2>
          <p className="text-sm text-muted-foreground">
            Manage discussion topics ({topics.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditSiteTitleDialogOpen(true)}>
            <Globe className="w-4 h-4 mr-2" />
            Edit Site Title
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Topic
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
          <TabsTrigger value="active" className="relative">
            Active
            {activeTopics.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeTopics.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived
            {archivedTopics.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {archivedTopics.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deleted">
            Deleted
            {deletedTopics.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {deletedTopics.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeTopics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No active topics</p>
              <Button 
                variant="link" 
                onClick={() => setCreateDialogOpen(true)}
                className="mt-2"
              >
                Create your first topic
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 max-w-2xl">
              {activeTopics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  onEdit={handleEdit}
                  isUpdating={updateStatus.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {archivedTopics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No archived topics</p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-2xl">
              {archivedTopics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  onEdit={handleEdit}
                  isUpdating={updateStatus.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deleted">
          {deletedTopics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No deleted topics</p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-2xl">
              {deletedTopics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  onEdit={handleEdit}
                  isUpdating={updateStatus.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateTopicDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
      
      <EditTopicTitleDialog
        open={!!editingTopic}
        onOpenChange={(open) => { if (!open) setEditingTopic(null); }}
        topic={editingTopic}
      />

      <EditSiteTitleDialog
        open={editSiteTitleDialogOpen}
        onOpenChange={setEditSiteTitleDialogOpen}
      />
    </div>
  );
}
