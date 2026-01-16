import { useAuditLogs, AuditLog } from '@/hooks/useAuditLogs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface AuditLogTableProps {
  enabled: boolean;
}

const actionColors: Record<string, string> = {
  report_content: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  review_report: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  toggle_soft_delete: 'bg-red-500/10 text-red-700 border-red-500/20',
};

export function AuditLogTable({ enabled }: AuditLogTableProps) {
  const { data: logs = [], isLoading, error } = useAuditLogs(enabled);

  if (!enabled) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Audit-Logs werden nach Freischaltung geladen.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Fehler beim Laden der Audit-Logs. Nur Admins haben Zugriff.
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Keine Audit-Logs vorhanden.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Zeitstempel</TableHead>
            <TableHead className="w-[140px]">Aktion</TableHead>
            <TableHead className="w-[120px]">Collection</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs">
                {log.timestamp.toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={actionColors[log.action] || 'bg-muted'}
                >
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {log.collectionName}
              </TableCell>
              <TableCell className="max-w-[300px]">
                {log.details ? (
                  <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
                    {JSON.stringify(log.details, null, 0)}
                  </code>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
