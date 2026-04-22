'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editAttendanceSchema, type EditAttendanceInput } from '@/lib/schemas';
import { useEditAttendance } from '@/lib/hooks';
import { motion } from '@/components/motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EditAttendanceModal({
  recordId,
  studentName,
  currentStatus,
  onClose,
}: {
  recordId: string;
  studentName: string;
  currentStatus: string;
  onClose: () => void;
}) {
  const editMutation = useEditAttendance();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditAttendanceInput>({
    resolver: zodResolver(editAttendanceSchema),
    defaultValues: { status: currentStatus as EditAttendanceInput['status'] },
  });

  async function onSubmit(data: EditAttendanceInput) {
    await editMutation.mutateAsync({
      recordId,
      status: data.status,
      reason: data.reason,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Attendance</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Editing attendance for <strong>{studentName}</strong>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              {...register('status')}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="activity">Activity</option>
              <option value="leave">Leave</option>
            </select>
            {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for edit</label>
            <textarea
              rows={3}
              {...register('reason')}
              placeholder="Why are you editing this record?"
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
              {isSubmitting ? 'Saving...' : 'Save Edit'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
