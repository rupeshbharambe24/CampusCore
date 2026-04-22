import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface LookupItem {
  id: string;
  label: string;
  extra: string | null;
}

const lookup = (path: string) => api.get<LookupItem[]>(`/lookups/${path}`);

export function useDepartments() {
  return useQuery({ queryKey: ['lookup', 'departments'], queryFn: () => lookup('departments') });
}

export function useBranches() {
  return useQuery({ queryKey: ['lookup', 'branches'], queryFn: () => lookup('branches') });
}

export function useAcademicYears() {
  return useQuery({ queryKey: ['lookup', 'academic-years'], queryFn: () => lookup('academic-years') });
}

export function useSemesters() {
  return useQuery({ queryKey: ['lookup', 'semesters'], queryFn: () => lookup('semesters') });
}

export function useSections(semesterId?: string, branchId?: string) {
  const params = new URLSearchParams();
  if (semesterId) params.set('semester_id', semesterId);
  if (branchId) params.set('branch_id', branchId);
  const qs = params.toString();
  return useQuery({
    queryKey: ['lookup', 'sections', semesterId, branchId],
    queryFn: () => lookup(`sections${qs ? `?${qs}` : ''}`),
  });
}

export function useSubjects(departmentId?: string) {
  const qs = departmentId ? `?department_id=${departmentId}` : '';
  return useQuery({ queryKey: ['lookup', 'subjects', departmentId], queryFn: () => lookup(`subjects${qs}`) });
}

export function useActivities() {
  return useQuery({ queryKey: ['lookup', 'activities'], queryFn: () => lookup('activities') });
}

export function useFacultyLookup(departmentId?: string) {
  const qs = departmentId ? `?department_id=${departmentId}` : '';
  return useQuery({ queryKey: ['lookup', 'faculty', departmentId], queryFn: () => lookup(`faculty${qs}`) });
}

export function useStudentLookup(q?: string, branchId?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (branchId) params.set('branch_id', branchId);
  const qs = params.toString();
  return useQuery({
    queryKey: ['lookup', 'students', q, branchId],
    queryFn: () => lookup(`students${qs ? `?${qs}` : ''}`),
    enabled: (q?.length ?? 0) >= 2,
  });
}

export function useBatches() {
  return useQuery({ queryKey: ['lookup', 'batches'], queryFn: () => lookup('batches') });
}
