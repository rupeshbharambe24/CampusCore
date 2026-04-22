'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { AttendanceRing } from '@/components/attendance-ring';
import { CheckSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAttendanceSummary, useAttendanceBySubject } from '@/lib/hooks';

export default function AttendancePage() {
  const { data: summary, isLoading: loadingSummary } = useAttendanceSummary();
  const { data: subjects, isLoading: loadingSubjects } = useAttendanceBySubject();

  if (loadingSummary || loadingSubjects) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const total = summary?.total_classes ?? 0;
  const present = summary?.present ?? 0;
  const activity = summary?.activity ?? 0;
  const absent = summary?.absent ?? 0;
  const overall = summary?.overall_percentage ?? 0;
  const lectureOnly = summary?.lecture_only_percentage ?? 0;
  const below75 = summary?.subjects_below_75 ?? [];

  return (
    <div className="space-y-8">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight"
      >
        <CheckSquare className="mr-2 inline-block h-6 w-6 text-primary" />
        Attendance
      </motion.h1>

      {/* Summary rings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          <AttendanceRing percentage={overall} size={150} strokeWidth={12} label="Overall" delay={0.2} />
          <AttendanceRing percentage={lectureOnly} size={120} strokeWidth={10} label="Lectures Only" delay={0.4} />
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-success" />
              <span>Present: <strong>{present}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-info" />
              <span>Activity: <strong>{activity}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-destructive" />
              <span>Absent: <strong>{absent}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-muted-foreground" />
              <span>Total classes: <strong>{total}</strong></span>
            </div>
          </div>
        </div>

        {below75.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.8 }}
            className="mt-5 rounded-lg border border-warning/30 bg-warning/5 p-3"
          >
            <p className="text-sm font-medium text-warning">
              {below75.length} subject{below75.length > 1 ? 's' : ''} below 75%: {below75.join(', ')}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Per-subject */}
      {subjects && subjects.length > 0 ? (
        <StaggerList className="space-y-4">
          {subjects.map((subj, i) => (
            <StaggerItem key={subj.subject_id}>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{subj.subject_name}</h3>
                    <p className="text-sm text-muted-foreground">{subj.subject_code}</p>
                  </div>
                  <span className={cn(
                    'text-2xl font-bold tabular-nums',
                    subj.percentage >= 75 ? 'text-success' : subj.percentage >= 50 ? 'text-warning' : 'text-destructive',
                  )}>
                    {subj.percentage}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${subj.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                    className={cn(
                      'h-full rounded-full',
                      subj.percentage >= 75 ? 'bg-success' : subj.percentage >= 50 ? 'bg-warning' : 'bg-destructive',
                    )}
                  />
                </div>

                <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
                  <span>Total: <strong className="text-foreground">{subj.total}</strong></span>
                  <span>Present: <strong className="text-success">{subj.present}</strong></span>
                  {subj.activity > 0 && (
                    <span>Activity: <strong className="text-info">{subj.activity}</strong></span>
                  )}
                  <span>Absent: <strong className="text-destructive">{subj.absent}</strong></span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <CheckSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No attendance data yet</p>
          <p className="text-sm text-muted-foreground/70">Attendance will appear once your faculty starts marking</p>
        </div>
      )}
    </div>
  );
}
