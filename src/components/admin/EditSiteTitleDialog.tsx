import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useSiteTitle, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be under 100 characters'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditSiteTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSiteTitleDialog({ open, onOpenChange }: EditSiteTitleDialogProps) {
  const { t } = useTranslation();
  const { data: siteTitleSetting, isLoading } = useSiteTitle();
  const updateSetting = useUpdateAppSetting();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
    },
  });

  useEffect(() => {
    if (siteTitleSetting) {
      form.reset({ title: siteTitleSetting.value });
    }
  }, [siteTitleSetting, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateSetting.mutateAsync({ key: 'site_title', value: values.title });
      toast.success(t('admin.toast.siteTitleUpdated'));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t('admin.toast.failedToUpdateTitle'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Edit Webpage Title
          </DialogTitle>
          <DialogDescription>
            Change the title that appears in the browser tab and search results.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="FreeMind - Free and Safe Online Conversations"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSetting.isPending}>
                  {updateSetting.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
