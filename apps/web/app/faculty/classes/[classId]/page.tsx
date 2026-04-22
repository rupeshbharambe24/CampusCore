'use client';

import { motion } from '@/components/motion';
import { ArrowLeft, Users, Loader2, BookOpen } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFacultyTimetable } from '@/lib/hooks';

export default function ClassDetailPage() {
  const params = useParams();
  const classId = params.classId as string;
  const { data: timetable, isLoading } = useFacultyTimetable();

  // Find class entries matching this subject code
  const classEntries = (timetable ?? []).filter((e) => e.subject_code === classId);
  const subjectName = classEntries[0]?.subject_name ?? classId;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/faculty/classes" className="rounded-lg p-1.5 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">
            <Users className="mr-2 inline-block h-6 w-6 text-primary" />
            {subjectName}
          </h1>
          <p className="text-sm text-muted-foreground">{classId} · {classEntries.length} periods/week</p>
        </motion.div>
      </div>

      {/* Schedule for this subject */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Weekly Schedule</h2>
        {classEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No periods found for this subject</p>
        ) : (
          <div className="space-y-2">
            {classEntries.map((entry, i) => {
              const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              return (
                <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <span className="w-10 text-sm font-semibold text-primary">{dayNames[entry.day_of_week]}</span>
                  <span className="text-sm">{entry.start_time} - {entry.end_time}</span>
                  <span className="text-sm text-muted-foreground">{entry.room_name ?? 'TBA'}</span>
                  <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">{entry.period_type}</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          Student-wise attendance for this class will be available once attendance is marked via the &quot;Mark Attendance&quot; feature.
        </p>
        <Link href="/faculty/today" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Go to Mark Attendance
        </Link>
      </div>
    </div>
  );
}
