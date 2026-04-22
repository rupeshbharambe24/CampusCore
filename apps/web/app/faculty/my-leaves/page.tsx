'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { FileText, Plus, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FacLeave { id: string; leave_type: string; start_date: string; end_date: string; reason: string; status: string; reject_reason: string | null; created_at: string }

const leaveTypes = ['casual', 'sick', 'earned', 'duty', 'other'];
const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-warning bg-warning/10', label: 'Pending' },
  approved: { icon: CheckCircle2, color: 'text-success bg-success/10', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-destructive bg-destructive/10', label: 'Rejected' },
};

export default function MyLeavesPage() {
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['faculty', 'my-leaves'], queryFn: () => api.get<FacLeave[]>('/faculty/me/leaves') });
  const submitMutation = useMutation({
    mutationFn: (d: { leave_type: string; start_date: string; end_date: string; reason: string }) => api.post('/faculty/me/leaves', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculty', 'my-leaves'] }); setShowForm(false); setReason(''); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <FileText className="mr-2 inline-block h-6 w-6 text-primary" /> My Leaves
        </motion.h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Apply Leave
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize">
                {leaveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">End</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => submitMutation.mutate({ leave_type: leaveType, start_date: startDate, end_date: endDate, reason })} disabled={!startDate || !endDate || !reason} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Submit</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
          </div>
        </motion.div>
      )}

      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (data ?? []).length > 0 ? (
        <StaggerList className="space-y-3">
          {(data ?? []).map((l) => {
            const config = statusConfig[l.status] ?? statusConfig.pending!;
            const Icon = config.icon;
            return (
              <StaggerItem key={l.id}>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={cn('mt-0.5 rounded-lg p-2', config.color)}><Icon className="h-4 w-4" /></div>
                      <div>
                        <h3 className="font-semibold capitalize">{l.leave_type} Leave</h3>
                        <p className="text-sm text-muted-foreground">{l.start_date} → {l.end_date}</p>
                        <p className="mt-1 text-sm">{l.reason}</p>
                        {l.reject_reason && <p className="mt-1 text-sm text-destructive">Rejected: {l.reject_reason}</p>}
                      </div>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', config.color)}>{config.label}</span>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No leave applications</p>
        </div>
      )}
    </div>
  );
}
