import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLaws } from '@/hooks/useLaws';
import { useReportContent } from '@/hooks/useReports';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentType: 'Opinion' | 'ChatMessage';
  contentPreview?: string;
}

export function ReportDialog({
  open,
  onOpenChange,
  contentId,
  contentType,
  contentPreview,
}: ReportDialogProps) {
  const { data: laws = [], isLoading: lawsLoading } = useLaws();
  const reportMutation = useReportContent();
  
  const [selectedLawId, setSelectedLawId] = useState<string>('');
  const [description, setDescription] = useState('');

  const selectedLaw = laws.find((l) => l.id === selectedLawId);

  const handleSubmit = async () => {
    if (!selectedLaw) {
      toast.error('Bitte wählen Sie einen Tatbestand aus');
      return;
    }

    try {
      await reportMutation.mutateAsync({
        contentId,
        contentType,
        lawBook: selectedLaw.lawBook,
        paragraph: selectedLaw.paragraph,
        offense: selectedLaw.offense,
        description: description.trim() || undefined,
      });

      toast.success('Meldung erfolgreich eingereicht');
      onOpenChange(false);
      setSelectedLawId('');
      setDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Einreichen der Meldung');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedLawId('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Inhalt melden
          </DialogTitle>
          <DialogDescription>
            Melden Sie potenziell rechtswidrige Inhalte. Ihre Meldung wird vertraulich behandelt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content preview */}
          {contentPreview && (
            <div className="p-3 rounded-lg bg-muted border border-border">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Gemeldeter Inhalt
              </Label>
              <p className="mt-1 text-sm text-foreground line-clamp-3">{contentPreview}</p>
            </div>
          )}

          {/* Law selection */}
          <div className="space-y-2">
            <Label htmlFor="law-select">Vermuteter Tatbestand *</Label>
            <Select value={selectedLawId} onValueChange={setSelectedLawId}>
              <SelectTrigger id="law-select" className="w-full">
                <SelectValue placeholder={lawsLoading ? 'Laden...' : 'Tatbestand auswählen'} />
              </SelectTrigger>
              <SelectContent>
                {laws.map((law) => (
                  <SelectItem key={law.id} value={law.id}>
                    <span className="font-mono text-xs mr-2">{law.lawBook} {law.paragraph}</span>
                    {law.offense}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Begründung (optional)</Label>
            <Textarea
              id="description"
              placeholder="Beschreiben Sie, warum Sie diesen Inhalt für rechtswidrig halten..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedLawId || reportMutation.isPending}
            variant="destructive"
          >
            {reportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Meldung einreichen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
