'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { AttendanceRing } from '@/components/attendance-ring';
import { CheckSquare, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const subjects = [
  { code: 'CS301', name: 'Data Structures', total: 40, present: 35, activity: 0, absent: 5, pct: 88 },
  { code: 'EC302', name: 'Digital Electronics', total: 38, present: 25, activity: 2, absent: 11, pct: 72 },
  { code: 'MA303', name: 'Mathematics III', total: 42, present: 32, activity: 2, absent: 8, pct: 81 },
  { code: 'CS391', name: 'DS Lab', total: 20, present: 19, activity: 0, absent: 1, pct: 95 },
  { code: 'APT301', name: 'Aptitude', total: 30, present: 18, activity: 2, absent: 10, pct: 66 },
  { code: 'EC392', name: 'DE Lab', total: 18, present: 16, activity: 0, absent: 2, pct: 89 },
];

export default function AttendancePage() {
  const total = subjects.reduce((a, s) => a + s.total, 0);
  const present = subjects.reduce((a, s) => a + s.present, 0);
  const activity = subjects.reduce((a, s) => a + s.activity, 0);
  const overall = Math.round(((present + activity) / total) * 100);
  const lectureOnly = Math.round((present / total) * 100);
  const below75 = subjects.filter((s) => s.pct < 75);

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
              <span>Absent: <strong>{total - present - activity}</strong></span>
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
              {below75.length} subject{below75.length > 1 ? 's' : ''} below 75%:{' '}
              {below75.map((s) => s.code).join(', ')}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Per-subject */}
      <StaggerList className="space-y-4">
        {subjects.map((subj, i) => (
          <StaggerItem key={subj.code}>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{subj.name}</h3>
                  <p className="text-sm text-muted-foreground">{subj.code}</p>
                </div>
                <span
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    subj.pct >= 75 ? 'text-success' : subj.pct >= 50 ? 'text-warning' : 'text-destructive',
                  )}
                >
                  {subj.pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${subj.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                  className={cn(
                    'h-full rounded-full',
                    subj.pct >= 75 ? 'bg-success' : subj.pct >= 50 ? 'bg-warning' : 'bg-destructive',
                  )}
                />
              </div>

              {/* Stats row */}
              <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
                <span>
                  Total: <strong className="text-foreground">{subj.total}</strong>
                </span>
                <span>
                  Present: <strong className="text-success">{subj.present}</strong>
                </span>
                {subj.activity > 0 && (
                  <span>
                    Activity: <strong className="text-info">{subj.activity}</strong>
                  </span>
                )}
                <span>
                  Absent: <strong className="text-destructive">{subj.absent}</strong>
                </span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}
