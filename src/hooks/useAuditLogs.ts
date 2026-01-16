import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  action: string;
  collectionName: string;
  recordId: string | null;
  userId: string | null;
  timestamp: Date;
  details: Record<string, any> | null;
}

export function useAuditLogs(enabled: boolean = false) {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data.map((log): AuditLog => ({
        id: log.id,
        action: log.action,
        collectionName: log.collection_name,
        recordId: log.record_id,
        userId: log.user_id,
        timestamp: new Date(log.timestamp),
        details: log.details as Record<string, any> | null,
      }));
    },
    enabled,
  });
}
