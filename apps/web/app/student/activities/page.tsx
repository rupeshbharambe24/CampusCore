'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Trophy, Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { activityRequestSchema, type ActivityRequestInput } from '@/lib/schemas';
import { useActivityRequests, useSubmitActivityRequest, useCancelActivityRequest } from '@/lib/hooks';

const statusConfig = {
  pending: { icon: Loader2, color: 'text-warning bg-warning/10 border-warning/30', label: 'Pending' },
  approved: { icon: CheckCircle2, color: 'text-success bg-success/10 border-success/30', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-destructive bg-destructive/10 border-destructive/30', label: 'Rejected' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground bg-muted border-border', label: 'Cancelled' },
};

export default function ActivitiesPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: requests, isLoading } = useActivityRequests();
  const submitMutation = useSubmitActivityRequest();
  const cancelMutation = useCancelActivityRequest();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityRequestInput>({
    resolver: zodResolver(activityRequestSchema),
  });

  async function onSubmit(data: ActivityRequestInput) {
    await submitMutation.mutateAsync(data);
    reset();
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          <Trophy className="mr-2 inline-block h-6 w-6 text-primary" />
          Activity Attendance
        </motion.h1>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Request
        </motion.button>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border border-primary/20 bg-card p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold">Submit Activity Attendance Request</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Activity ID</label>
                <input
                  {...register('activity_id')}
                  placeholder="Activity UUID"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.activity_id && <p className="text-xs text-destructive">{errors.activity_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <input type="date" {...register('start_date')} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <input type="date" {...register('end_date')} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  {errors.end_date && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <textarea
                rows={3}
                {...register('reason')}
                placeholder="Explain why you need activity attendance..."
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Request list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests && requests.length > 0 ? (
        <StaggerList className="space-y-4">
          {requests.map((req) => {
            const config = statusConfig[req.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const Icon = config.icon;
            return (
              <StaggerItem key={req.id}>
                <div className={cn('rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md', config.color.split(' ').slice(1).join(' '))}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 rounded-lg p-2', config.color.split(' ').slice(0, 2).join(' '))}>
                        <Icon className={cn('h-4 w-4', req.status === 'pending' && 'animate-spin')} />
                      </div>
                      <div>
                        <h3 className="font-semibold">Activity Request</h3>
                        <p className="text-sm text-muted-foreground">
                          {req.start_date === req.end_date ? req.start_date : `${req.start_date} → ${req.end_date}`}
                        </p>
                        <p className="mt-1 text-sm">{req.reason}</p>
                        {req.reject_reason && (
                          <p className="mt-2 text-sm text-destructive">Rejected: {req.reject_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn('rounded-full px-3 py-1 text-xs font-medium capitalize', config.color.split(' ').slice(0, 2).join(' '))}>
                        {config.label}
                      </span>
                      {req.status === 'pending' && (
                        <button
                          onClick={() => cancelMutation.mutate(req.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Submitted {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No activity requests yet</p>
          <p className="text-sm text-muted-foreground/70">Submit your first request using the button above</p>
        </div>
      )}
    </div>
  );
}
