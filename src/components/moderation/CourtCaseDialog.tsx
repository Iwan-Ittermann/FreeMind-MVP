import { useState } from 'react';
import { Loader2, Gavel, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useCreateCourtCase, 
  useUpdateCourtCaseDecision, 
  useApproveCourtCase,
  CourtCase 
} from '@/hooks/useCourtCases';
import { toast } from 'sonner';

interface CourtCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  existingCase?: CourtCase | null;
}

export function CourtCaseDialog({ 
  open, 
  onOpenChange, 
  reportId, 
  existingCase 
}: CourtCaseDialogProps) {
  const [courtName, setCourtName] = useState(existingCase?.court_name || '');
  const [caseNumber, setCaseNumber] = useState(existingCase?.case_number || '');
  const [decisionType, setDecisionType] = useState<'Pending' | 'Dismissed' | 'Acquittal' | 'Conviction'>(
    existingCase?.decision_type || 'Pending'
  );
  const [decisionDate, setDecisionDate] = useState(existingCase?.decision_date || '');

  const createCase = useCreateCourtCase();
  const updateDecision = useUpdateCourtCaseDecision();
  const approveCase = useApproveCourtCase();

  const isEditing = !!existingCase;
  const isLoading = createCase.isPending || updateDecision.isPending || approveCase.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateDecision.mutateAsync({
          caseId: existingCase.id,
          decisionType,
          decisionDate: decisionDate || undefined,
          courtName: courtName || undefined,
          caseNumber: caseNumber || undefined,
        });
        toast.success('Court case updated');
      } else {
        await createCase.mutateAsync({
          reportId,
          courtName: courtName || undefined,
          caseNumber: caseNumber || undefined,
        });
        toast.success('Court case created');
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save court case');
    }
  };

  const handleApprove = async () => {
    if (!existingCase) return;
    try {
      await approveCase.mutateAsync(existingCase.id);
      toast.success('Court case activated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve court case');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5" />
            {isEditing ? 'Update Court Case' : 'Add Court Data'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the court case details and decision.'
              : 'Create a court case record for this report. It will be inactive until approved.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courtName">Court Name</Label>
              <Input
                id="courtName"
                placeholder="e.g., Amtsgericht Berlin"
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caseNumber">Case Number</Label>
              <Input
                id="caseNumber"
                placeholder="e.g., 123 Js 456/24"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="decisionType">Decision</Label>
                <Select
                  value={decisionType}
                  onValueChange={(v) => setDecisionType(v as typeof decisionType)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Dismissed">Dismissed</SelectItem>
                    <SelectItem value="Acquittal">Acquittal (Freispruch)</SelectItem>
                    <SelectItem value="Conviction">Conviction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {decisionType !== 'Pending' && (
                <div className="space-y-2">
                  <Label htmlFor="decisionDate">Decision Date</Label>
                  <Input
                    id="decisionDate"
                    type="date"
                    value={decisionDate}
                    onChange={(e) => setDecisionDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}

              {existingCase?.status === 'Inactive' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                    This court case is inactive and won't affect the content status.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    {approveCase.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Gavel className="w-4 h-4 mr-2" />
                    )}
                    Activate Court Case
                  </Button>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update'
              ) : (
                'Create Case'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
