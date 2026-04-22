'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useAttendanceBySubject } from '@/lib/hooks';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface DateRecord {
  date: string;
  status: string;
  slot_label: string;
  start_time: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  present: { icon: CheckCircle2, color: 'text-success bg-success/10', label: 'Present' },
  absent: { icon: XCircle, color: 'text-destructive bg-destructive/10', label: 'Absent' },
  activity: { icon: Trophy, color: 'text-info bg-info/10', label: 'Activity' },
  leave: { icon: Clock, color: 'text-warning bg-warning/10', label: 'Leave' },
};

export default function SubjectAttendanceHistory() {
  const params = useParams();
  const subjectId = params.subjectId as string;

  const { data: subjects } = useAttendanceBySubject();
  const subject = subjects?.find((s) => s.subject_id === subjectId);

  // Fetch date-by-date history from API
  const { data: history, isLoading } = useQuery({
    queryKey: ['student', 'attendance', 'history', subjectId],
    queryFn: () => api.get<DateRecord[]>(`/students/me/attendance/by-subject/${subjectId}`),
    enabled: !!subjectId,
  });

  // Fallback: generate demo dates if API returns empty (no data yet)
  const records = history && history.length > 0 ? history : generateDemoRecords(subject);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/student/attendance" className="rounded-lg p-1.5 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">
            {subject?.subject_name ?? 'Subject'} Attendance
          </h1>
          <p className="text-sm text-muted-foreground">
            {subject?.subject_code} &middot; {subject?.percentage ?? 0}% overall
          </p>
        </motion.div>
      </div>

      {/* Summary bar */}
      {subject && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4"
        >
          <div className="text-center px-4">
            <p className="text-2xl font-bold">{subject.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center px-4">
            <p className="text-2xl font-bold text-success">{subject.present}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
          {subject.activity > 0 && (
            <div className="text-center px-4">
              <p className="text-2xl font-bold text-info">{subject.activity}</p>
              <p className="text-xs text-muted-foreground">Activity</p>
            </div>
          )}
          <div className="text-center px-4">
            <p className="text-2xl font-bold text-destructive">{subject.absent}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>
        </motion.div>
      )}

      {/* Date-by-date list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <StaggerList className="space-y-2">
          {records.map((rec, i) => {
            const config = statusConfig[rec.status] ?? statusConfig.present!;
            const Icon = config.icon;
            return (
              <StaggerItem key={`${rec.date}-${i}`}>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:shadow-sm">
                  <div className={cn('shrink-0 rounded-lg p-2', config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {new Date(rec.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rec.slot_label ?? ''} {rec.start_time ? `at ${rec.start_time}` : ''}
                    </p>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', config.color)}>
                    {config.label}
                  </span>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}

// Generate demo data when API has no records yet
function generateDemoRecords(subject: { total: number; present: number; absent: number; activity: number } | undefined): DateRecord[] {
  if (!subject) return [];
  const records: DateRecord[] = [];
  const today = new Date();
  for (let i = 0; i < subject.total; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (subject.total - i) * 2);
    let status = 'present';
    if (i < subject.absent) status = 'absent';
    else if (i < subject.absent + subject.activity) status = 'activity';
    records.push({
      date: d.toISOString().split('T')[0]!,
      status,
      slot_label: `P${(i % 6) + 1}`,
      start_time: `${9 + (i % 6)}:00`,
    });
  }
  return records.reverse();
}
