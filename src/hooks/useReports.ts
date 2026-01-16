import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Report {
  id: string;
  contentId: string;
  contentType: 'Opinion' | 'ChatMessage';
  reportingUserId: string;
  lawBook: string;
  paragraph: string;
  offense: string;
  description: string | null;
  createdAt: Date;
  status: 'Unreviewed' | 'In-Review' | 'No-Suspicion' | 'Suspicion';
  adminId: string | null;
  reviewTimestamp: Date | null;
  // Joined data
  contentText?: string;
  contentCreatorId?: string;
}

interface ReportContentParams {
  contentId: string;
  contentType: 'Opinion' | 'ChatMessage';
  lawBook: string;
  paragraph: string;
  offense: string;
  description?: string;
}

interface ReviewReportParams {
  reportId: string;
  newStatus: 'In-Review' | 'No-Suspicion' | 'Suspicion';
  noticeText?: string;
}

// Fetch all reports (admin) or own reports (user)
export function useReports(isAdmin: boolean = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', isAdmin, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((report): Report => ({
        id: report.id,
        contentId: report.content_id,
        contentType: report.content_type as Report['contentType'],
        reportingUserId: report.reporting_user_id,
        lawBook: report.law_book,
        paragraph: report.paragraph,
        offense: report.offense,
        description: report.description,
        createdAt: new Date(report.created_at),
        status: report.status as Report['status'],
        adminId: report.admin_id,
        reviewTimestamp: report.review_timestamp ? new Date(report.review_timestamp) : null,
      }));
    },
    enabled: !!user,
  });
}

// Submit a new report
export function useReportContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ReportContentParams) => {
      const { data, error } = await supabase.rpc('report_content', {
        _content_id: params.contentId,
        _content_type: params.contentType,
        _law_book: params.lawBook,
        _paragraph: params.paragraph,
        _offense: params.offense,
        _description: params.description || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['topic-data'] });
    },
  });
}

// Admin: Review a report
export function useReviewReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ReviewReportParams) => {
      const { error } = await supabase.rpc('review_report', {
        _report_id: params.reportId,
        _new_status: params.newStatus,
        _notice_text: params.noticeText || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['topic-data'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
}

// Admin: Toggle soft delete
export function useToggleSoftDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      contentId: string; 
      contentType: 'Opinion' | 'ChatMessage'; 
      visible: boolean;
      noticeText?: string;
    }) => {
      const { error } = await supabase.rpc('toggle_soft_delete', {
        _content_id: params.contentId,
        _content_type: params.contentType,
        _visible: params.visible,
        _notice_text: params.noticeText || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-data'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
}
