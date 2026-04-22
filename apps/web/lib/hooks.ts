/**
 * React Query hooks for all CampusCore API endpoints.
 * Each hook manages loading, error, and caching via TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// ---- Types (match backend Pydantic schemas) ----

export interface MeResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone: string | null;
    photo_url: string | null;
    is_active: boolean;
    must_change_password: boolean;
    last_login_at: string | null;
    created_at: string;
  };
  student: {
    roll_number: string;
    branch_id: string;
    admission_year: number;
    current_section_id: string | null;
    lab_batch: string | null;
    prn: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_relation: string | null;
    address: string | null;
    blood_group: string | null;
    date_of_birth: string | null;
    gender: string | null;
    category: string | null;
  } | null;
  faculty: {
    employee_id: string;
    department_id: string;
    designation: string | null;
    is_hod: boolean;
  } | null;
}

export interface TimetableEntry {
  period_id: string;
  instance_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_label: string;
  subject_code: string;
  subject_name: string;
  faculty_name: string;
  room_name: string | null;
  period_type: string;
  lab_batch: string | null;
  status: string;
}

export interface SubjectAttendance {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  total: number;
  present: number;
  activity: number;
  absent: number;
  percentage: number;
  lecture_percentage: number;
}

export interface AttendanceSummary {
  total_classes: number;
  present: number;
  activity: number;
  absent: number;
  overall_percentage: number;
  lecture_only_percentage: number;
  subjects_below_75: string[];
  subjects_below_75_count: number;
}

export interface ActivityRequest {
  id: string;
  student_id: string;
  activity_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  proof_url: string | null;
  status: string;
  approver_id: string | null;
  approved_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

export interface RosterEntry {
  student_id: string;
  roll_number: string;
  full_name: string;
  lab_batch: string | null;
  status: string | null;
}

export interface AttendanceRecord {
  id: string;
  period_instance_id: string;
  student_id: string;
  status: string;
  marked_by: string | null;
  marked_at: string;
  edited_at: string | null;
  edit_reason: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ---- Hooks ----

// Me
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeResponse>('/me'),
    retry: false,
  });
}

// Student: timetable
export function useStudentTimetable(date?: string) {
  const params = date ? `?date=${date}` : '';
  return useQuery({
    queryKey: ['student', 'timetable', date],
    queryFn: () => api.get<TimetableEntry[]>(`/students/me/timetable${params}`),
  });
}

// Student: attendance summary
export function useAttendanceSummary() {
  return useQuery({
    queryKey: ['student', 'attendance', 'summary'],
    queryFn: () => api.get<AttendanceSummary>('/students/me/attendance/summary'),
  });
}

// Student: attendance by subject
export function useAttendanceBySubject() {
  return useQuery({
    queryKey: ['student', 'attendance', 'by-subject'],
    queryFn: () => api.get<SubjectAttendance[]>('/students/me/attendance/by-subject'),
  });
}

// Student: activity requests
export function useActivityRequests(status?: string) {
  const params = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: ['student', 'activity-requests', status],
    queryFn: () => api.get<ActivityRequest[]>(`/students/me/activity-requests${params}`),
  });
}

export function useSubmitActivityRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { activity_id: string; start_date: string; end_date: string; reason: string; proof_url?: string }) =>
      api.post<ActivityRequest>('/students/me/activity-requests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'activity-requests'] }),
  });
}

export function useCancelActivityRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      api.post<ActivityRequest>(`/students/me/activity-requests/${requestId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'activity-requests'] }),
  });
}

// Faculty: today
export function useFacultyToday() {
  return useQuery({
    queryKey: ['faculty', 'today'],
    queryFn: () => api.get<TimetableEntry[]>('/faculty/me/today'),
  });
}

// Faculty: timetable
export function useFacultyTimetable() {
  return useQuery({
    queryKey: ['faculty', 'timetable'],
    queryFn: () => api.get<TimetableEntry[]>('/faculty/me/timetable'),
  });
}

// Faculty: roster for a period instance
export function useRoster(instanceId: string) {
  return useQuery({
    queryKey: ['faculty', 'roster', instanceId],
    queryFn: () => api.get<RosterEntry[]>(`/faculty/me/period-instances/${instanceId}/roster`),
    enabled: !!instanceId,
  });
}

// Faculty: submit attendance
export function useSubmitAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, marks }: { instanceId: string; marks: { student_id: string; status: string }[] }) =>
      api.post(`/faculty/me/period-instances/${instanceId}/attendance`, { marks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
    },
  });
}

// Faculty: edit attendance
export function useEditAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, status, reason }: { recordId: string; status: string; reason: string }) =>
      api.patch<AttendanceRecord>(`/faculty/me/attendance/${recordId}`, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty'] });
    },
  });
}

// Faculty: activity approvals
export function useActivityApprovals(status = 'pending') {
  return useQuery({
    queryKey: ['faculty', 'activity-approvals', status],
    queryFn: () => api.get<ActivityRequest[]>(`/faculty/me/activity-approvals?status=${status}`),
  });
}

export function useApproveActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      api.post<ActivityRequest>(`/faculty/me/activity-approvals/${requestId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'activity-approvals'] }),
  });
}

export function useRejectActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      api.post<ActivityRequest>(`/faculty/me/activity-approvals/${requestId}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'activity-approvals'] }),
  });
}

// Notifications
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => api.get<NotificationItem[]>(`/me/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/me/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// Admin: paginated lists
export function useAdminList<T>(entity: string, page = 1, size = 50) {
  return useQuery({
    queryKey: ['admin', entity, page, size],
    queryFn: () => api.get<PaginatedResponse<T>>(`/admin/${entity}?page=${page}&size=${size}`),
  });
}

// Admin: reports
export function useReport(report: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['admin', 'reports', report, params],
    queryFn: () => api.get<Record<string, unknown>[]>(`/admin/reports/${report}${qs ? `?${qs}` : ''}`),
    enabled: Object.keys(params).length > 0 || report === 'activity-summary',
  });
}
