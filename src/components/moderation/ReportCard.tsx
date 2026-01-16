import { useState } from 'react';
import { motion } from 'framer-motion';
import { Report, useReviewReport } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Scale,
  Loader2,
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

export function ReportCard({ report, contentText }: ReportCardProps) {
  const reviewMutation = useReviewReport();
  const [customNotice, setCustomNotice] = useState('');
  const [showActions, setShowActions] = useState(false);

  const config = statusConfig[report.status];
  const StatusIcon = config.icon;

  const handleReview = async (newStatus: 'In-Review' | 'No-Suspicion' | 'Suspicion') => {
    try {
      await reviewMutation.mutateAsync({
        reportId: report.id,
        newStatus,
        noticeText: newStatus === 'Suspicion' && customNotice ? customNotice : undefined,
      });
      toast.success(`Status geändert: ${statusConfig[newStatus].label}`);
      setShowActions(false);
      setCustomNotice('');
    } catch (err: any) {
      toast.error(err.message || 'Fehler bei der Aktualisierung');
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

      {/* Content preview */}
      {contentText && (
        <div className="p-3 rounded bg-muted/50 border border-border mb-3">
          <p className="text-sm text-foreground line-clamp-3">{contentText}</p>
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
