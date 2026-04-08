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

const PRIMARY_TOPIC_ID = '00000000-0000-0000-0000-000000000001';

export function FakeNodesPanel() {
  const { data: fakeNodes = [], isLoading } = useFakeNodes(PRIMARY_TOPIC_ID);
  const createFakeNode = useCreateFakeNode();
  const updateFakeNode = useUpdateFakeNode();
  const deleteFakeNode = useDeleteFakeNode();

  const [newOpinionText, setNewOpinionText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleCreate = () => {
    if (!newOpinionText.trim()) return;
    createFakeNode.mutate({
      topicId: PRIMARY_TOPIC_ID,
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
      topicId: PRIMARY_TOPIC_ID,
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
    deleteFakeNode.mutate({ id, topicId: PRIMARY_TOPIC_ID });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { data: hideSetting } = useAppSetting('hide_fake_nodes');
  const updateSetting = useUpdateAppSetting();
  const hideFakeNodes = hideSetting?.value === 'true';

  const handleToggleHide = () => {
    updateSetting.mutate({ key: 'hide_fake_nodes', value: hideFakeNodes ? 'false' : 'true' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Fake Nodes</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {fakeNodes.length} nodes
          </Badge>
        </div>
        <CardDescription>
          Create fake opinion nodes to populate the graph. These nodes will have random connections 
          with empathy between -20 and +50, and disagreement between 80 and 100.
        </CardDescription>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm">
            {hideFakeNodes ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            <span className="text-muted-foreground">{hideFakeNodes ? 'Fake nodes hidden' : 'Fake nodes visible'}</span>
          </div>
          <Switch checked={!hideFakeNodes} onCheckedChange={handleToggleHide} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="space-y-2">
          {fakeNodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No fake nodes yet. Add one above.</p>
            </div>
          ) : (
            fakeNodes.map((node, index) => (
              <div
                key={node.id}
                className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card"
              >
                <Badge variant="outline" className="shrink-0 mt-1">
                  #{index + 1}
                </Badge>
                
                {editingId === node.id ? (
                  <>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEdit(node.id)}
                        disabled={updateFakeNode.isPending}
                      >
                        {updateFakeNode.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm">{node.opinion_text}</p>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartEdit(node.id, node.opinion_text)}
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(node.id)}
                        disabled={deleteFakeNode.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
