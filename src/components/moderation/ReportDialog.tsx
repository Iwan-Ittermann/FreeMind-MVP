import { useState, useMemo } from 'react';
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
import { STGB_PARAGRAPHS, MIN_JUSTIFICATION_LENGTH, type StGBParagraph } from '@/lib/stgb-paragraphs';
import { useReportContent } from '@/hooks/useReports';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Info } from 'lucide-react';

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
  const reportMutation = useReportContent();
  
  const [selectedParagraph, setSelectedParagraph] = useState<StGBParagraph | ''>('');
  const [justification, setJustification] = useState('');

  const selectedParagraphInfo = useMemo(() => {
    if (!selectedParagraph) return null;
    return STGB_PARAGRAPHS.find((p) => p.id === selectedParagraph) || null;
  }, [selectedParagraph]);

  const justificationLength = justification.trim().length;
  const isJustificationValid = justificationLength >= MIN_JUSTIFICATION_LENGTH;
  const canSubmit = selectedParagraph && isJustificationValid;

  const handleSubmit = async () => {
    if (!selectedParagraphInfo) {
      toast.error('Bitte wählen Sie einen Tatbestand aus');
      return;
    }

    if (!isJustificationValid) {
      toast.error('Begründung ist Pflicht und muss mindestens 100 Zeichen lang sein.');
      return;
    }

    try {
      await reportMutation.mutateAsync({
        contentId,
        contentType,
        lawBook: 'StGB',
        paragraph: selectedParagraphInfo.id,
        offense: selectedParagraphInfo.offense,
        description: justification.trim(),
      });

      toast.success('Meldung erfolgreich eingereicht');
      onOpenChange(false);
      setSelectedParagraph('');
      setJustification('');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Einreichen der Meldung');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedParagraph('');
    setJustification('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="law-select">Vermuteter Tatbestand (StGB) *</Label>
            <Select 
              value={selectedParagraph} 
              onValueChange={(value) => setSelectedParagraph(value as StGBParagraph)}
            >
              <SelectTrigger id="law-select" className="w-full">
                <SelectValue placeholder="Tatbestand auswählen" />
              </SelectTrigger>
              <SelectContent>
                {STGB_PARAGRAPHS.map((para) => (
                  <SelectItem key={para.id} value={para.id}>
                    <span className="font-mono text-xs mr-2">{para.id}</span>
                    {para.offense}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paragraph text display */}
          {selectedParagraphInfo && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {selectedParagraphInfo.id} StGB – {selectedParagraphInfo.offense}
                  </p>
                  <p className="text-sm text-foreground/80 italic">
                    {selectedParagraphInfo.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Justification (required) */}
          <div className="space-y-2">
            <Label htmlFor="justification">
              Begründung *
            </Label>
            <Textarea
              id="justification"
              placeholder="Beschreiben Sie ausführlich, warum Sie diesen Inhalt für rechtswidrig halten. Mindestens 100 Zeichen erforderlich."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={5}
              className={`resize-none ${!isJustificationValid && justificationLength > 0 ? 'border-destructive' : ''}`}
            />
            <div className="flex justify-between items-center text-xs">
              <span className={`${justificationLength < MIN_JUSTIFICATION_LENGTH ? 'text-muted-foreground' : 'text-green-600'}`}>
                {justificationLength} / {MIN_JUSTIFICATION_LENGTH} Zeichen (Minimum)
              </span>
              {justificationLength > 0 && !isJustificationValid && (
                <span className="text-destructive">
                  Noch {MIN_JUSTIFICATION_LENGTH - justificationLength} Zeichen erforderlich
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit || reportMutation.isPending}
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
