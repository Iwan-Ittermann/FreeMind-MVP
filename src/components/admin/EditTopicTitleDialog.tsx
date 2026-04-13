import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUpdateTopicTitle, useUpdateTopicDescription, Topic } from '@/hooks/useTopics';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface EditTopicTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic | null;
}

export function EditTopicTitleDialog({ open, onOpenChange, topic }: EditTopicTitleDialogProps) {
  const { t } = useTranslation();
  const updateTitle = useUpdateTopicTitle();
  const updateDescription = useUpdateTopicDescription();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // Reset form when topic changes or dialog opens
  useEffect(() => {
    if (topic && open) {
      form.reset({ title: topic.title, description: topic.description || '' });
    }
  }, [topic, open, form]);

  const onSubmit = async (data: FormData) => {
    if (!topic) return;
    
    try {
      const promises: Promise<void>[] = [];
      
      if (data.title !== topic.title) {
        promises.push(updateTitle.mutateAsync({ topicId: topic.id, title: data.title }));
      }
      
      const newDesc = data.description || null;
      if (newDesc !== topic.description) {
        promises.push(updateDescription.mutateAsync({ topicId: topic.id, description: newDesc }));
      }

      await Promise.all(promises);
      toast.success(t('admin.toast.topicUpdated'));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t('admin.toast.failedToUpdate'));
    }
  };

  const isPending = updateTitle.isPending || updateDescription.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
          <DialogDescription>
            Change the title and description of this topic.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter the topic title" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a short description" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
