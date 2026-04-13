import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Report, useReviewReport } from '@/hooks/useReports';
import { useCourtCaseByReport, CourtCase } from '@/hooks/useCourtCases';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CourtCaseDialog } from './CourtCaseDialog';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Scale,
  Loader2,
  Gavel,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportCardProps {
  report: Report;
  contentText?: string;
}

const statusConfig = {
  'Unreviewed': { 
    label: 'Ungeprüft', 
    icon: Clock, 
    variant: 'secondary' as const,
    color: 'text-muted-foreground'
  },
  'In-Review': { 
    label: 'In Prüfung', 
    icon: FileText, 
    variant: 'outline' as const,
    color: 'text-yellow-500'
  },
  'No-Suspicion': { 
    label: 'Kein Verdacht', 
    icon: CheckCircle, 
    variant: 'outline' as const,
    color: 'text-green-500'
  },
  'Suspicion': { 
    label: 'Verdacht bestätigt', 
    icon: AlertTriangle, 
    variant: 'destructive' as const,
    color: 'text-destructive'
  },
};

const decisionConfig = {
  'Pending': { label: 'Anhängig', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  'Dismissed': { label: 'Eingestellt', color: 'bg-gray-500/20 text-gray-500 border-gray-500/30' },
  'Acquittal': { label: 'Freispruch', color: 'bg-green-500/20 text-green-500 border-green-500/30' },
  'Conviction': { label: 'Verurteilung', color: 'bg-red-500/20 text-red-500 border-red-500/30' },
};

function CourtCaseSection({ courtCase, reportId }: { courtCase: CourtCase | null; reportId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!courtCase) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="w-full mt-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Gerichtsdaten hinzufügen
        </Button>
        <CourtCaseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          reportId={reportId}
        />
      </>
    );
  }

  const decision = decisionConfig[courtCase.decision_type];

  return (
    <>
      <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Gerichtsverfahren</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={courtCase.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}>
              {courtCase.status === 'Active' ? 'Aktiv' : 'Inaktiv'}
            </Badge>
            <Badge className={decision.color}>
              {decision.label}
            </Badge>
          </div>
        </div>
        
        {(courtCase.court_name || courtCase.case_number) && (
          <div className="text-xs text-muted-foreground mb-2">
            {courtCase.court_name && <span>{courtCase.court_name}</span>}
            {courtCase.court_name && courtCase.case_number && <span> · </span>}
            {courtCase.case_number && <span className="font-mono">{courtCase.case_number}</span>}
          </div>
        )}

        {courtCase.decision_date && (
          <div className="text-xs text-muted-foreground">
            Entscheidung: {new Date(courtCase.decision_date).toLocaleDateString('de-DE')}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="w-full mt-2 text-muted-foreground"
        >
          Bearbeiten
        </Button>
      </div>
      <CourtCaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reportId={reportId}
        existingCase={courtCase}
      />
    </>
  );
}

export function ReportCard({ report, contentText }: ReportCardProps) {
  const reviewMutation = useReviewReport();
  const [customNotice, setCustomNotice] = useState('');
  const [showActions, setShowActions] = useState(false);
  
  // Fetch court case for this report (only for Suspicion status)
  const { data: courtCase } = useCourtCaseByReport(
    report.id, 
    report.status === 'Suspicion'
  );

  const config = statusConfig[report.status];
  const StatusIcon = config.icon;

  const handleReview = async (newStatus: 'In-Review' | 'No-Suspicion' | 'Suspicion') => {
    try {
      await reviewMutation.mutateAsync({
        reportId: report.id,
        newStatus,
        noticeText: newStatus === 'Suspicion' && customNotice ? customNotice : undefined,
      });
      toast.success(t('admin.report.statusChanged'));
      setShowActions(false);
      setCustomNotice('');
    } catch (err: any) {
      toast.error(err.message || t('admin.report.updateFailed'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="flex items-center gap-1">
            <StatusIcon className={`w-3 h-3 ${config.color}`} />
            {config.label}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {report.contentType}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {report.createdAt.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {/* Legal reference */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <Scale className="w-4 h-4 text-muted-foreground" />
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
          {report.lawBook} {report.paragraph}
        </span>
        <span className="text-muted-foreground">{report.offense}</span>
      </div>

      {/* Content preview - use report.contentText if available */}
      {(report.contentText || contentText) && (
        <div className="p-3 rounded bg-muted/50 border border-border mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gemeldeter Inhalt</p>
          <p className="text-sm text-foreground line-clamp-3">{report.contentText || contentText}</p>
        </div>
      )}

      {/* Reported user IP */}
      {report.reportedUserIp && (
        <div className="mb-3 flex items-center gap-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">IP des gemeldeten Users:</p>
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{report.reportedUserIp}</span>
        </div>
      )}

      {/* Reporter description */}
      {report.description && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Begründung</p>
          <p className="text-sm text-foreground">{report.description}</p>
        </div>
      )}

      {/* Review info */}
      {report.reviewTimestamp && (
        <div className="text-xs text-muted-foreground mb-3">
          Geprüft am {report.reviewTimestamp.toLocaleDateString('de-DE')}
        </div>
      )}

      {/* Court case section for Suspicion status */}
      {report.status === 'Suspicion' && (
        <CourtCaseSection courtCase={courtCase || null} reportId={report.id} />
      )}

      {/* Actions for unreviewed/in-review reports */}
      {(report.status === 'Unreviewed' || report.status === 'In-Review') && (
        <div className="pt-3 border-t border-border">
          {!showActions ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActions(true)}
              className="w-full"
            >
              Prüfen
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Custom notice for suspicion */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Hinweistext bei Verdacht (optional)
                </p>
                <Textarea
                  value={customNotice}
                  onChange={(e) => setCustomNotice(e.target.value)}
                  placeholder="Dieser Inhalt wurde aufgrund eines begründeten Verdachts..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="flex gap-2">
                {report.status === 'Unreviewed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReview('In-Review')}
                    disabled={reviewMutation.isPending}
                    className="flex-1"
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Clock className="w-4 h-4 mr-1" />
                        In Prüfung
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReview('No-Suspicion')}
                  disabled={reviewMutation.isPending}
                  className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Kein Verdacht
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReview('Suspicion')}
                  disabled={reviewMutation.isPending}
                  className="flex-1"
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Verdacht
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(false)}
                className="w-full text-muted-foreground"
              >
                Abbrechen
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}