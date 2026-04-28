import { useState } from 'react';
import { Bot, Plus, Trash2, Edit2, Save, X, Loader2, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  useFakeNodes, 
  useCreateFakeNode, 
  useUpdateFakeNode, 
  useDeleteFakeNode 
} from '@/hooks/useFakeNodes';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { useAllTopics } from '@/hooks/useTopics';
import { TopicTitleWithLinks } from '@/components/TopicTitleWithLinks';

interface TopicFakeNodesProps {
  topicId: string;
  topicTitle: string;
}

function TopicFakeNodes({ topicId, topicTitle }: TopicFakeNodesProps) {
  const { data: fakeNodes = [], isLoading } = useFakeNodes(topicId);
  const createFakeNode = useCreateFakeNode();
  const updateFakeNode = useUpdateFakeNode();
  const deleteFakeNode = useDeleteFakeNode();

  const [newOpinionText, setNewOpinionText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [expanded, setExpanded] = useState(false);

  const { data: hideSetting } = useAppSetting(`hide_fake_nodes_${topicId}`);
  const updateSetting = useUpdateAppSetting();
  const hideFakeNodes = hideSetting?.value === 'true';

  const handleToggleHide = () => {
    const newValue = hideFakeNodes ? 'false' : 'true';
    updateSetting.mutate({ key: `hide_fake_nodes_${topicId}`, value: newValue });
  };

  const handleCreate = () => {
    if (!newOpinionText.trim()) return;
    createFakeNode.mutate({
      topicId,
      opinionText: newOpinionText.trim(),
    });
    setNewOpinionText('');
  };

  const handleStartEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) return;
    updateFakeNode.mutate({
      id,
      topicId,
      opinionText: editText.trim(),
    });
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this fake node?')) return;
    deleteFakeNode.mutate({ id, topicId });
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-foreground truncate">
            <TopicTitleWithLinks title={topicTitle} />
          </h3>
          <Badge variant="secondary" className="text-xs">
            {fakeNodes.length} nodes
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {hideFakeNodes ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="text-muted-foreground">{hideFakeNodes ? 'Hidden' : 'Visible'}</span>
          </div>
          <Switch checked={!hideFakeNodes} onCheckedChange={handleToggleHide} />
        </div>
      </div>

      {expanded && (
        <>
          {/* Add new fake node */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Enter fake opinion text..."
              value={newOpinionText}
              onChange={(e) => setNewOpinionText(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              onClick={handleCreate}
              disabled={!newOpinionText.trim() || createFakeNode.isPending}
              size="icon"
              className="shrink-0"
            >
              {createFakeNode.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* List of fake nodes */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {fakeNodes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                No fake nodes yet for this topic.
              </p>
            )}
            {fakeNodes.map((node, index) => (
              <div
                key={node.id}
                className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card text-xs"
              >
                <Badge variant="outline" className="shrink-0 mt-0.5 text-xs">
                  #{index + 1}
                </Badge>
                
                {editingId === node.id ? (
                  <>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 min-h-[40px] text-xs"
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(node.id)} disabled={updateFakeNode.isPending}>
                        {updateFakeNode.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 text-green-600" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-xs">{node.opinion_text}</p>
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleStartEdit(node.id, node.opinion_text)}>
                        <Edit2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(node.id)} disabled={deleteFakeNode.isPending}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Collapse' : fakeNodes.length === 0 ? 'Add fake nodes' : `Show ${fakeNodes.length} fake nodes`}
      </Button>
    </div>
  );
}

export function FakeNodesPanel() {
  const { data: topics = [], isLoading: topicsLoading } = useAllTopics(true);

  if (topicsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTopics = topics.filter(t => t.status === 'Active');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Fake Nodes</CardTitle>
        </div>
        <CardDescription>
          Manage fake opinion nodes per topic. Toggle visibility to hide them once real engagement starts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTopics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active topics</p>
        ) : (
          activeTopics.map(topic => (
            <TopicFakeNodes key={topic.id} topicId={topic.id} topicTitle={topic.title} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
