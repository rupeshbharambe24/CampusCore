'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { RefreshCw, Plus, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import { useExams, useSubjects } from '@/lib/lookup-hooks';

interface ReEvalItem { id: string; exam_id: string; subject_id: string; reason: string; status: string; new_marks: string | null; reject_reason: string | null; created_at: string }

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-warning bg-warning/10', label: 'Pending' },
  resolved: { icon: CheckCircle2, color: 'text-success bg-success/10', label: 'Resolved' },
  rejected: { icon: XCircle, color: 'text-destructive bg-destructive/10', label: 'Rejected' },
  approved: { icon: CheckCircle2, color: 'text-info bg-info/10', label: 'Approved' },
};

export default function ReEvalPage() {
  const [showForm, setShowForm] = useState(false);
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  const { data: examOpts, isLoading: examLoading } = useExams();
  const { data: subjectOpts, isLoading: subjLoading } = useSubjects();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['student', 'reeval'],
    queryFn: () => api.get<ReEvalItem[]>('/students/me/reeval-requests'),
  });

  const submitMutation = useMutation({
    mutationFn: (data: { exam_id: string; subject_id: string; reason: string }) => api.post('/students/me/reeval-requests', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student', 'reeval'] }); setShowForm(false); setReason(''); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <RefreshCw className="mr-2 inline-block h-6 w-6 text-primary" />
          Re-evaluation Requests
        </motion.h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-primary">
        Re-evaluation is available for class tests and mid-semester exams only.
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam</label>
              <LookupSelect items={examOpts} isLoading={examLoading} value={examId} onChange={setExamId} placeholder="Select exam..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <LookupSelect items={subjectOpts} isLoading={subjLoading} value={subjectId} onChange={setSubjectId} placeholder="Select subject..." />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Reason for re-evaluation</label>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why you think your answer deserves re-checking..." className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => submitMutation.mutate({ exam_id: examId, subject_id: subjectId, reason })} disabled={!examId || !subjectId || !reason} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Submit</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (requests ?? []).length > 0 ? (
        <StaggerList className="space-y-3">
          {(requests ?? []).map((req) => {
            const config = statusConfig[req.status] ?? statusConfig.pending!;
            const Icon = config.icon;
            return (
              <StaggerItem key={req.id}>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={cn('mt-0.5 rounded-lg p-2', config.color)}><Icon className="h-4 w-4" /></div>
                      <div>
                        <p className="font-medium">Re-evaluation Request</p>
                        <p className="mt-1 text-sm">{req.reason}</p>
                        {req.new_marks && <p className="mt-1 text-sm text-success font-medium">Updated marks: {req.new_marks}</p>}
                        {req.reject_reason && <p className="mt-1 text-sm text-destructive">Rejected: {req.reject_reason}</p>}
                      </div>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', config.color)}>{config.label}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Submitted {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <RefreshCw className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No re-evaluation requests</p>
        </div>
      )}
    </div>
  );
}
