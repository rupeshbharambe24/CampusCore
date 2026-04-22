'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { ClipboardList, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useActivityApprovals, useApproveActivity, useRejectActivity } from '@/lib/hooks';

export default function ApprovalsPage() {
  const { data: pending, isLoading } = useActivityApprovals('pending');
  const approveMutation = useApproveActivity();
  const rejectMutation = useRejectActivity();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    rejectMutation.mutate({ requestId: id, reason: rejectReason });
    setRejectId(null);
    setRejectReason('');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingList = pending ?? [];

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight"
      >
        <ClipboardList className="mr-2 inline-block h-6 w-6 text-primary" />
        Activity Approvals
      </motion.h1>

      {pendingList.length > 0 ? (
        <StaggerList className="space-y-3">
          {pendingList.map((req) => (
            <StaggerItem key={req.id}>
              <div className="rounded-xl border border-warning/30 bg-card p-5 shadow-sm">
                <div>
                  <h3 className="font-semibold">Activity Request</h3>
                  <p className="text-sm text-muted-foreground">{req.start_date} → {req.end_date}</p>
                  <p className="mt-1 text-sm">{req.reason}</p>
                </div>

                {rejectId === req.id ? (
                  <div className="mt-4 space-y-2">
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleReject(req.id)} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90">
                        Confirm Reject
                      </button>
                      <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRejectId(req.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </motion.button>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">All caught up</p>
          <p className="text-sm text-muted-foreground/70">No pending activity requests</p>
        </div>
      )}
    </div>
  );
}
