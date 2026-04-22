import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface DeptOverview {
  department_name: string;
  department_code: string;
  total_faculty: number;
  total_students: number;
  total_sections: number;
  total_subjects: number;
  pending_leaves: number;
}

export interface FacultyItem {
  user_id: string;
  full_name: string;
  email: string;
  employee_id: string;
  designation: string | null;
  is_hod: boolean;
}

export interface StudentItem {
  user_id: string;
  full_name: string;
  email: string;
  roll_number: string;
  admission_year: number;
  lab_batch: string | null;
  section_name: string | null;
}

export interface LeaveApp {
  id: string;
  student_id: string;
  department_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  proof_url: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

export function useHodOverview() {
  return useQuery({
    queryKey: ['hod', 'overview'],
    queryFn: () => api.get<DeptOverview>('/hod/overview'),
  });
}

export function useHodFaculty() {
  return useQuery({
    queryKey: ['hod', 'faculty'],
    queryFn: () => api.get<FacultyItem[]>('/hod/faculty'),
  });
}

export function useHodStudents() {
  return useQuery({
    queryKey: ['hod', 'students'],
    queryFn: () => api.get<StudentItem[]>('/hod/students'),
  });
}

export function useHodLeaves(status = 'pending') {
  return useQuery({
    queryKey: ['hod', 'leaves', status],
    queryFn: () => api.get<LeaveApp[]>(`/hod/leave-applications?status=${status}`),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: string) => api.post<LeaveApp>(`/hod/leave-applications/${leaveId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hod', 'leaves'] }),
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, reason }: { leaveId: string; reason: string }) =>
      api.post<LeaveApp>(`/hod/leave-applications/${leaveId}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hod', 'leaves'] }),
  });
}

// Student: my leaves
export function useMyLeaves() {
  return useQuery({
    queryKey: ['student', 'leaves'],
    queryFn: () => api.get<LeaveApp[]>('/hod/my-leaves'),
  });
}

export function useSubmitLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { leave_type: string; start_date: string; end_date: string; reason: string }) =>
      api.post<LeaveApp>('/hod/leave-applications', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'leaves'] }),
  });
}
