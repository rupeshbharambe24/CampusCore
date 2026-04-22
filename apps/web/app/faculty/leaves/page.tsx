'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useHodLeaves, useApproveLeave, useRejectLeave } from '@/lib/hod-hooks';

export default function LeavesPage() {
  const { data: leaves, isLoading } = useHodLeaves('pending');
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const pending = leaves ?? [];

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <FileText className="mr-2 inline-block h-6 w-6 text-primary" />
        Leave Approvals
      </motion.h1>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No pending leaves</p>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {pending.map((leave) => (
            <StaggerItem key={leave.id}>
              <div className="rounded-xl border border-warning/30 bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold capitalize">{leave.leave_type} Leave</h3>
                    <p className="text-sm text-muted-foreground">{leave.start_date} → {leave.end_date}</p>
                    <p className="mt-1 text-sm">{leave.reason}</p>
                  </div>
                  <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">Pending</span>
                </div>

                {rejectId === leave.id ? (
                  <div className="mt-4 space-y-2">
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { rejectMutation.mutate({ leaveId: leave.id, reason: rejectReason }); setRejectId(null); setRejectReason(''); }} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90">Confirm Reject</button>
                      <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => approveMutation.mutate(leave.id)} disabled={approveMutation.isPending} className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50">
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => setRejectId(leave.id)} className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
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
