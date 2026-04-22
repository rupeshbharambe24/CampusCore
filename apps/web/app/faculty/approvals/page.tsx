'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { ClipboardList, CheckCircle2, XCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const initialRequests = [
  { id: '1', student: 'Aarav Patel', roll: '22CS001', activity: 'Baja SAE', dates: 'Apr 20-22', reason: 'Inter-college Baja competition at VIT Pune', status: 'pending' },
  { id: '2', student: 'Diya Kulkarni', roll: '22CS005', activity: 'Hackathon', dates: 'Apr 25', reason: 'Smart India Hackathon finals at IIT Delhi', status: 'pending' },
  { id: '3', student: 'Manav Singh', roll: '22CS009', activity: 'Sports', dates: 'Apr 18', reason: 'Inter-college cricket tournament', status: 'approved' },
];

export default function ApprovalsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
  };

  const handleReject = (id: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)));
    setRejectId(null);
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

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

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Pending ({pending.length})
          </h2>
          <StaggerList className="space-y-3">
            {pending.map((req) => (
              <StaggerItem key={req.id}>
                <div className="rounded-xl border border-warning/30 bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {req.student.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{req.student}</h3>
                        <p className="text-xs text-muted-foreground">{req.roll} &middot; {req.activity}</p>
                        <p className="mt-1 text-sm">{req.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Dates: {req.dates}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success/90"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleReject(req.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive/90"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </motion.button>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Resolved
          </h2>
          <StaggerList className="space-y-3">
            {resolved.map((req) => (
              <StaggerItem key={req.id}>
                <div className={cn(
                  'rounded-xl border bg-card p-4 opacity-70',
                  req.status === 'approved' ? 'border-success/20' : 'border-destructive/20',
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{req.student} &middot; {req.activity}</p>
                        <p className="text-xs text-muted-foreground">{req.dates}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium capitalize',
                      req.status === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                    )}>
                      {req.status}
                    </span>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      )}
    </div>
  );
}
