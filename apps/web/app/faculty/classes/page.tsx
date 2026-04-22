'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { BookOpen, Users, TrendingUp } from 'lucide-react';
import { AttendanceRing } from '@/components/attendance-ring';

const classes = [
  { subject: 'Data Structures', code: 'CS301', sections: ['CSE-A', 'CSE-B'], year: 2, students: 120, avgAttendance: 84 },
  { subject: 'DS Lab', code: 'CS391', sections: ['CSE-A B1'], year: 2, students: 21, avgAttendance: 92 },
  { subject: 'Algorithms', code: 'CS401', sections: ['CSE-A'], year: 3, students: 58, avgAttendance: 78 },
];

export default function ClassesPage() {
  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight"
      >
        <BookOpen className="mr-2 inline-block h-6 w-6 text-primary" />
        My Classes
      </motion.h1>

      <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls, i) => (
          <StaggerItem key={cls.code}>
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{cls.subject}</h3>
                  <p className="text-sm text-muted-foreground">{cls.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cls.sections.join(', ')} &middot; Year {cls.year}
                  </p>
                </div>
                <AttendanceRing percentage={cls.avgAttendance} size={60} strokeWidth={5} delay={0.3 + i * 0.1} />
              </div>
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {cls.students} students
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> {cls.avgAttendance}% avg
                </span>
              </div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}
