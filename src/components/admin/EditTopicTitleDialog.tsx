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
import { Button } from '@/components/ui/button';
import { useUpdateTopicTitle, Topic } from '@/hooks/useTopics';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be less than 200 characters'),
});

type FormData = z.infer<typeof formSchema>;

interface EditTopicTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic | null;
}

export function EditTopicTitleDialog({ open, onOpenChange, topic }: EditTopicTitleDialogProps) {
  const updateTitle = useUpdateTopicTitle();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
    },
  });

  // Reset form when topic changes or dialog opens
  useEffect(() => {
    if (topic && open) {
      form.reset({ title: topic.title });
    }
  }, [topic, open, form]);

  const onSubmit = async (data: FormData) => {
    if (!topic) return;
    
    try {
      await updateTitle.mutateAsync({ topicId: topic.id, title: data.title });
      toast.success('Topic title updated');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update title');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Topic Title</DialogTitle>
          <DialogDescription>
            Change the title displayed on the main page.
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
                      placeholder="Enter the new topic title" 
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
              <Button type="submit" disabled={updateTitle.isPending}>
                {updateTitle.isPending && (
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
