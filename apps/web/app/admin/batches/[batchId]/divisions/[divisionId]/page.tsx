'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Users, ArrowLeft, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import { useFacultyLookup } from '@/lib/lookup-hooks';
import Link from 'next/link';

interface FacAssignment {
  subject_id: string; subject_code: string; subject_name: string; kind: string;
  faculty_id: string | null; faculty_name: string | null; lab_batch: string | null; assignment_id: string | null;
}

export default function DivisionFacultyPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const divisionId = params.divisionId as string;
  const qc = useQueryClient();

  const { data: facOpts, isLoading: facLoading } = useFacultyLookup();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['division-faculty', divisionId],
    queryFn: () => api.get<FacAssignment[]>(`/divisions/${divisionId}/faculty-assignments`),
  });

  const setFaculty = useMutation({
    mutationFn: (data: { division_id: string; subject_id: string; faculty_id: string; lab_batch?: string }) =>
      api.post('/divisions/set-faculty', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['division-faculty'] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const items = assignments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/batches" className="rounded-lg p-1.5 hover:bg-accent"><ArrowLeft className="h-5 w-5" /></Link>
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <Users className="mr-2 inline-block h-6 w-6 text-primary" />
          Faculty Assignments
        </motion.h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Assign faculty to each subject for this division. This is Step 2 — subjects must be assigned first via batch management.
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No subjects assigned to this division yet.</p>
          <Link href={`/admin/batches/${batchId}/subjects` as '/'} className="mt-2 inline-block text-sm text-primary hover:underline">
            Go to Manage Subjects
          </Link>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {items.map((a) => (
            <StaggerItem key={`${a.subject_id}-${a.lab_batch ?? ''}`}>
              <div className={cn(
                'rounded-xl border bg-card p-4 shadow-sm transition-all',
                a.faculty_id ? 'border-success/30' : 'border-warning/30',
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{a.subject_code} — {a.subject_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {a.kind}{a.lab_batch ? ` · Lab Batch: ${a.lab_batch}` : ''}
                    </p>
                  </div>
                  {a.faculty_id ? (
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Assigned</span>
                  ) : (
                    <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">Not assigned</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Faculty</label>
                    <LookupSelect
                      items={facOpts}
                      isLoading={facLoading}
                      value={a.faculty_id ?? ''}
                      onChange={(fid) => setFaculty.mutate({
                        division_id: divisionId,
                        subject_id: a.subject_id,
                        faculty_id: fid,
                        lab_batch: a.lab_batch ?? undefined,
                      })}
                      placeholder="Select faculty..."
                    />
                  </div>
                  {a.faculty_name && (
                    <p className="text-sm text-muted-foreground pt-4">Current: {a.faculty_name}</p>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
