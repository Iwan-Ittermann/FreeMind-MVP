import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CourtCase {
  id: string;
  report_id: string;
  topic_id: string;
  court_name: string | null;
  case_number: string | null;
  decision_date: string | null;
  decision_type: 'Pending' | 'Dismissed' | 'Acquittal' | 'Conviction';
  status: 'Inactive' | 'Active';
  admin_id: string | null;
  created_at: string;
  updated_at: string;
}

// Get court cases (admin only)
export function useCourtCases(topicId?: string, enabled = false) {
  return useQuery({
    queryKey: ['courtCases', topicId],
    queryFn: async (): Promise<CourtCase[]> => {
      let query = supabase.from('court_cases').select('*');
      
      if (topicId) {
        query = query.eq('topic_id', topicId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as CourtCase[];
    },
    enabled,
  });
}

// Get court case by report ID
export function useCourtCaseByReport(reportId: string, enabled = false) {
  return useQuery({
    queryKey: ['courtCases', 'report', reportId],
    queryFn: async (): Promise<CourtCase | null> => {
      const { data, error } = await supabase
        .from('court_cases')
        .select('*')
        .eq('report_id', reportId)
        .maybeSingle();

      if (error) throw error;
      return data as CourtCase | null;
    },
    enabled: enabled && !!reportId,
  });
}

// Create court case
export function useCreateCourtCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      reportId, 
      courtName, 
      caseNumber 
    }: { 
      reportId: string; 
      courtName?: string; 
      caseNumber?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_court_case', {
        _report_id: reportId,
        _court_name: courtName || null,
        _case_number: caseNumber || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courtCases'] });
    },
  });
}

// Approve court case
export function useApproveCourtCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.rpc('approve_court_case', {
        _case_id: caseId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courtCases'] });
    },
  });
}

// Update court case decision
export function useUpdateCourtCaseDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      caseId, 
      decisionType, 
      decisionDate,
      courtName,
      caseNumber,
    }: { 
      caseId: string;
      decisionType: 'Pending' | 'Dismissed' | 'Acquittal' | 'Conviction';
      decisionDate?: string;
      courtName?: string;
      caseNumber?: string;
    }) => {
      const { error } = await supabase.rpc('update_court_case_decision', {
        _case_id: caseId,
        _decision_type: decisionType,
        _decision_date: decisionDate || null,
        _court_name: courtName || null,
        _case_number: caseNumber || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courtCases'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
