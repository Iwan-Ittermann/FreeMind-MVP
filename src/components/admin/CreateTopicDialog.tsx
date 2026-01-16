import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateTopic } from '@/hooks/useTopics';
import { toast } from 'sonner';

interface CreateTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTopicDialog({ open, onOpenChange }: CreateTopicDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const createTopic = useCreateTopic();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      await createTopic.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Topic created successfully');
      setTitle('');
      setDescription('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create topic');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Topic</DialogTitle>
          <DialogDescription>
            Create a new discussion topic. A unique URL will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., How should we handle AI regulation?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createTopic.isPending}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide more context about the topic..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createTopic.isPending}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTopic.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTopic.isPending}>
              {createTopic.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Topic'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
