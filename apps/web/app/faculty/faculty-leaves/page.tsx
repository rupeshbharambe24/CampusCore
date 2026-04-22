'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FacLeave { id: string; faculty_id: string; leave_type: string; start_date: string; end_date: string; reason: string; status: string }

export default function FacultyLeavesHOD() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['hod', 'faculty-leaves'], queryFn: () => api.get<FacLeave[]>('/hod/faculty-leaves') });
  const approveMutation = useMutation({ mutationFn: (id: string) => api.post(`/hod/faculty-leaves/${id}/approve`), onSuccess: () => qc.invalidateQueries({ queryKey: ['hod', 'faculty-leaves'] }) });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const rejectMutation = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/hod/faculty-leaves/${id}/reject`, { reason }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['hod', 'faculty-leaves'] }); setRejectId(null); } });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <FileText className="mr-2 inline-block h-6 w-6 text-primary" /> Faculty Leave Approvals
      </motion.h1>
      {(data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No pending faculty leaves</p>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {(data ?? []).map((l) => (
            <StaggerItem key={l.id}>
              <div className="rounded-xl border border-warning/30 bg-card p-5 shadow-sm">
                <h3 className="font-semibold capitalize">{l.leave_type} Leave</h3>
                <p className="text-sm text-muted-foreground">{l.start_date} → {l.end_date}</p>
                <p className="mt-1 text-sm">{l.reason}</p>
                {rejectId === l.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => rejectMutation.mutate({ id: l.id, reason: rejectReason })} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white">Confirm</button>
                      <button onClick={() => setRejectId(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => approveMutation.mutate(l.id)} className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white"><CheckCircle2 className="h-4 w-4" /> Approve</button>
                    <button onClick={() => setRejectId(l.id)} className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white"><XCircle className="h-4 w-4" /> Reject</button>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
