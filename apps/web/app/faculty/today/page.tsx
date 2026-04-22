'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Calendar, CheckSquare, UserCheck, UserX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useFacultyToday, useRoster, useSubmitAttendance } from '@/lib/hooks';
import { EditAttendanceModal } from '@/components/edit-attendance-modal';

export default function TodayPage() {
  const { data: todayEntries, isLoading: loadingToday } = useFacultyToday();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // Pick the first entry with an instance_id for marking, or allow user to select
  const activeInstance = selectedInstanceId ?? todayEntries?.find((e) => e.instance_id)?.instance_id ?? null;

  if (loadingToday) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!todayEntries || todayEntries.length === 0) {
    return (
      <div className="space-y-6">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
          Today&apos;s Classes
        </motion.h1>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No classes today</p>
          <p className="text-sm text-muted-foreground/70">Your timetable shows no periods for today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
        Today&apos;s Classes
      </motion.h1>

      <p className="text-sm text-muted-foreground">
        You have <strong className="text-foreground">{todayEntries.length}</strong> class{todayEntries.length !== 1 ? 'es' : ''} today. Select one to mark attendance.
      </p>

      {/* Class list */}
      <StaggerList className="space-y-3">
        {todayEntries.map((entry) => (
          <StaggerItem key={entry.period_id}>
            <button
              type="button"
              onClick={() => entry.instance_id && setSelectedInstanceId(entry.instance_id)}
              className={cn(
                'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
                activeInstance === entry.instance_id
                  ? 'border-primary/50 bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/30',
                entry.status === 'cancelled' && 'opacity-50',
              )}
            >
              <div className="text-center min-w-[50px]">
                <p className="text-xs font-medium text-muted-foreground">{entry.start_time}</p>
                <p className="text-xs text-muted-foreground">{entry.slot_label}</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{entry.subject_name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.subject_code} &middot; {entry.room_name ?? 'TBA'}
                  {entry.lab_batch && ` &middot; ${entry.lab_batch}`}
                </p>
              </div>
              {entry.status === 'cancelled' ? (
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Cancelled</span>
              ) : activeInstance === entry.instance_id ? (
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Selected</span>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {entry.period_type}
                </span>
              )}
            </button>
          </StaggerItem>
        ))}
      </StaggerList>

      {/* Roster for selected instance */}
      {activeInstance && <RosterPanel instanceId={activeInstance} />}
    </div>
  );
}

function RosterPanel({ instanceId }: { instanceId: string }) {
  const { data: roster, isLoading } = useRoster(instanceId);
  const submitMutation = useSubmitAttendance();
  const [marks, setMarks] = useState<Record<string, 'present' | 'absent'>>({});
  const [submitted, setSubmitted] = useState(false);
  const [editRecord, setEditRecord] = useState<{ id: string; name: string; status: string } | null>(null);

  // Initialize marks from roster when it loads
  const effectiveMarks = roster?.reduce((acc, s) => {
    if (!marks[s.student_id]) {
      acc[s.student_id] = (s.status as 'present' | 'absent') ?? 'present';
    } else {
      acc[s.student_id] = marks[s.student_id]!;
    }
    return acc;
  }, {} as Record<string, 'present' | 'absent'>) ?? marks;

  const toggleMark = (id: string) => {
    if (submitted) return;
    setMarks((prev) => ({
      ...prev,
      [id]: (effectiveMarks[id] === 'present' ? 'absent' : 'present'),
    }));
  };

  const presentCount = Object.values(effectiveMarks).filter((m) => m === 'present').length;
  const absentCount = Object.values(effectiveMarks).filter((m) => m === 'absent').length;

  const handleSubmit = async () => {
    const markList = Object.entries(effectiveMarks).map(([student_id, status]) => ({ student_id, status }));
    await submitMutation.mutateAsync({ instanceId, marks: markList });
    setSubmitted(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Student Roster ({roster?.length ?? 0})</h2>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1 text-success font-medium"><UserCheck className="h-4 w-4" /> {presentCount}</span>
          <span className="flex items-center gap-1 text-destructive font-medium"><UserX className="h-4 w-4" /> {absentCount}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        All students default to <strong className="text-success">present</strong>. Tap to mark <strong className="text-destructive">absent</strong>.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {roster?.map((student) => {
          const isAbsent = effectiveMarks[student.student_id] === 'absent';
          return (
            <motion.button
              key={student.student_id}
              type="button"
              onClick={() => toggleMark(student.student_id)}
              whileTap={!submitted ? { scale: 0.97 } : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                isAbsent ? 'border-destructive/40 bg-destructive/5' : 'border-success/40 bg-success/5',
                submitted && 'opacity-70 cursor-default',
              )}
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', isAbsent ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                {isAbsent ? 'A' : 'P'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{student.full_name}</p>
                <p className="text-xs text-muted-foreground">{student.roll_number}</p>
              </div>
              {isAbsent ? <UserX className="h-4 w-4 shrink-0 text-destructive" /> : <UserCheck className="h-4 w-4 shrink-0 text-success" />}
            </motion.button>
          );
        })}
      </div>

      {/* Submit */}
      <div className="sticky bottom-4 flex justify-center">
        {submitted ? (
          <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/30 px-6 py-3 text-success font-medium shadow-lg">
            <CheckSquare className="h-5 w-5" /> Attendance submitted
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
          >
            {submitMutation.isPending ? 'Submitting...' : `Submit (${presentCount}P / ${absentCount}A)`}
          </motion.button>
        )}
      </div>

      {editRecord && (
        <EditAttendanceModal
          recordId={editRecord.id}
          studentName={editRecord.name}
          currentStatus={editRecord.status}
          onClose={() => setEditRecord(null)}
        />
      )}
    </motion.div>
  );
}
