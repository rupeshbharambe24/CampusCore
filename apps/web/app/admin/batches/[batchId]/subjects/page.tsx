'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { BookOpen, Check, ArrowLeft, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import { useDepartments } from '@/lib/lookup-hooks';
import Link from 'next/link';

interface SubjectItem { subject_id: string; subject_code: string; subject_name: string; kind: string; is_assigned: boolean }

export default function BatchSubjectsPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const [deptId, setDeptId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: deptOpts, isLoading: deptLoading } = useDepartments();

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['batch-subjects', batchId, deptId],
    queryFn: () => api.get<SubjectItem[]>(`/batches/${batchId}/subjects/${deptId}`),
    enabled: !!deptId,
  });

  // Sync selected state when data loads
  useEffect(() => {
    if (subjects) {
      setSelected(new Set(subjects.filter((s) => s.is_assigned).map((s) => s.subject_id)));
    }
  }, [subjects]);

  const saveMutation = useMutation({
    mutationFn: () => api.post('/batches/assign-subjects', { batch_id: batchId, department_id: deptId, subject_ids: Array.from(selected) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batch-subjects'] }),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/batches" className="rounded-lg p-1.5 hover:bg-accent"><ArrowLeft className="h-5 w-5" /></Link>
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <BookOpen className="mr-2 inline-block h-6 w-6 text-primary" />
          Manage Subjects for Batch
        </motion.h1>
      </div>

      <p className="text-sm text-muted-foreground">Select which subjects this batch studies this semester. This is Step 1 before assigning faculty.</p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Department</label>
        <LookupSelect items={deptOpts} isLoading={deptLoading} value={deptId} onChange={setDeptId} placeholder="Select department..." className="max-w-md" />
      </div>

      {isLoading && deptId && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {subjects && subjects.length > 0 && (
        <>
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm">
            <strong>{selected.size}</strong> of {subjects.length} subjects selected
          </div>

          <StaggerList className="space-y-2">
            {subjects.map((subj) => {
              const isChecked = selected.has(subj.subject_id);
              return (
                <StaggerItem key={subj.subject_id}>
                  <button
                    type="button"
                    onClick={() => toggle(subj.subject_id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all',
                      isChecked ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30',
                    )}
                  >
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                      isChecked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                    )}>
                      {isChecked && <Check className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{subj.subject_code} — {subj.subject_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{subj.kind}</p>
                    </div>
                  </button>
                </StaggerItem>
              );
            })}
          </StaggerList>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Subject Assignments
          </motion.button>

          {saveMutation.isSuccess && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-success font-medium">
              Subjects saved! Now go to each division to assign faculty.
            </motion.p>
          )}
        </>
      )}

      {subjects && subjects.length === 0 && deptId && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No subjects found for this department. Create subjects in Academic Setup first.</p>
        </div>
      )}
    </div>
  );
}
