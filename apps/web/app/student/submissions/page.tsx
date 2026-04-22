'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { FileCheck, Upload, Clock, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface AssignmentWithSub {
  assignment: { id: string; title: string; description: string | null; assignment_type: string; due_date: string | null; max_marks: number | null; created_at: string };
  submission: { id: string; status: string; proof_url: string | null; submitted_at: string | null; marks: number | null; remarks: string | null } | null;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-warning bg-warning/10', label: 'Not Submitted' },
  submitted: { icon: Upload, color: 'text-info bg-info/10', label: 'Submitted' },
  checked: { icon: CheckCircle2, color: 'text-success bg-success/10', label: 'Checked' },
  graded: { icon: CheckCircle2, color: 'text-primary bg-primary/10', label: 'Graded' },
  late: { icon: AlertTriangle, color: 'text-destructive bg-destructive/10', label: 'Late' },
};

export default function StudentSubmissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'assignments'],
    queryFn: () => api.get<AssignmentWithSub[]>('/students/me/assignments'),
  });
  const qc = useQueryClient();
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');

  const submitMutation = useMutation({
    mutationFn: ({ assignmentId, proof_url }: { assignmentId: string; proof_url: string }) =>
      api.post(`/students/me/assignments/${assignmentId}/submit`, { proof_url }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student', 'assignments'] }); setUploadingFor(null); setProofUrl(''); },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <FileCheck className="mr-2 inline-block h-6 w-6 text-primary" />
        Assignments & Submissions
      </motion.h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <FileCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No assignments yet</p>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {items.map(({ assignment: a, submission: sub }) => {
            const subStatus = sub?.status ?? 'pending';
            const config = statusConfig[subStatus] ?? statusConfig.pending!;
            const Icon = config.icon;
            return (
              <StaggerItem key={a.id}>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{a.assignment_type.replace('_', ' ')}</span>
                        {a.due_date && <span>Due: {a.due_date}</span>}
                        {a.max_marks && <span>Max: {a.max_marks} marks</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium', config.color)}>
                        <Icon className="h-3.5 w-3.5" /> {config.label}
                      </span>
                      {sub?.marks != null && (
                        <span className="text-sm font-bold text-primary">{sub.marks}/{a.max_marks}</span>
                      )}
                    </div>
                  </div>

                  {/* Proof link */}
                  {sub?.proof_url && (
                    <a href={sub.proof_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> View submitted proof
                    </a>
                  )}

                  {/* Remarks */}
                  {sub?.remarks && (
                    <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">Faculty: {sub.remarks}</p>
                  )}

                  {/* Submit / resubmit */}
                  {(!sub || sub.status === 'pending') && uploadingFor !== a.id && (
                    <button
                      onClick={() => setUploadingFor(a.id)}
                      className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload Proof
                    </button>
                  )}

                  {uploadingFor === a.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-2">
                      <input
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        placeholder="Paste link to scanned PDF/photo..."
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitMutation.mutate({ assignmentId: a.id, proof_url: proofUrl })}
                          disabled={!proofUrl}
                          className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                          Submit
                        </button>
                        <button onClick={() => { setUploadingFor(null); setProofUrl(''); }} className="rounded-lg border border-border px-4 py-1.5 text-xs hover:bg-accent">
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}
