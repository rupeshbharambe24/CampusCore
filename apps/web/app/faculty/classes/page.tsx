'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { BookOpen, Users, TrendingUp, Loader2 } from 'lucide-react';
import { AttendanceRing } from '@/components/attendance-ring';
import Link from 'next/link';
import { useFacultyTimetable } from '@/lib/hooks';

export default function ClassesPage() {
  const { data: timetable, isLoading } = useFacultyTimetable();

  // Group by subject to get unique classes
  const classMap = new Map<string, { subject_code: string; subject_name: string; period_type: string; count: number }>();
  (timetable ?? []).forEach((entry) => {
    if (!classMap.has(entry.subject_code)) {
      classMap.set(entry.subject_code, {
        subject_code: entry.subject_code,
        subject_name: entry.subject_name,
        period_type: entry.period_type,
        count: 1,
      });
    } else {
      classMap.get(entry.subject_code)!.count++;
    }
  });
  const classes = Array.from(classMap.values());

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <BookOpen className="mr-2 inline-block h-6 w-6 text-primary" />
        My Classes
      </motion.h1>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No classes assigned</p>
          <p className="text-sm text-muted-foreground/70">Timetable needs to be set up first</p>
        </div>
      ) : (
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls, i) => (
            <StaggerItem key={cls.subject_code}>
              <Link href={`/faculty/classes/${cls.subject_code}` as '/'}>
                <motion.div whileHover={{ y: -4 }} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-lg cursor-pointer">
                  <h3 className="font-semibold">{cls.subject_name}</h3>
                  <p className="text-sm text-muted-foreground">{cls.subject_code}</p>
                  <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 capitalize">
                      <BookOpen className="h-3.5 w-3.5" /> {cls.period_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> {cls.count} periods/week
                    </span>
                  </div>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
