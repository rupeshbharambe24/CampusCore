'use client';

import {
  Calendar,
  CheckSquare,
  Clock,
  AlertTriangle,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { StaggerList, StaggerItem, motion } from '@/components/motion';
import { StatCard } from '@/components/stat-card';
import { AttendanceRing } from '@/components/attendance-ring';
import Link from 'next/link';

// Demo data — in production these come from the API
const todayClasses = [
  { time: '09:00 - 09:50', subject: 'Data Structures', room: 'LT-1', faculty: 'Dr. Sharma', status: 'completed' },
  { time: '10:00 - 10:50', subject: 'Digital Electronics', room: 'LT-3', faculty: 'Prof. Patel', status: 'ongoing' },
  { time: '11:00 - 11:50', subject: 'Mathematics III', room: 'LT-1', faculty: 'Dr. Gupta', status: 'upcoming' },
  { time: '14:00 - 15:50', subject: 'DS Lab', room: 'Lab-201', faculty: 'Dr. Sharma', status: 'upcoming' },
];

const subjectAttendance = [
  { name: 'Data Structures', code: 'CS301', percentage: 88 },
  { name: 'Digital Electronics', code: 'EC302', percentage: 72 },
  { name: 'Mathematics III', code: 'MA303', percentage: 81 },
  { name: 'DS Lab', code: 'CS391', percentage: 95 },
  { name: 'Aptitude', code: 'APT301', percentage: 66 },
];

export default function StudentDashboard() {
  const overallPct = 82;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Good morning, Student
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-1 text-muted-foreground"
        >
          Here&apos;s your day at a glance
        </motion.p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Classes" value={4} icon={Calendar} color="primary" delay={0} />
        <StatCard title="Overall Attendance" value={`${overallPct}%`} icon={CheckSquare} color="success" delay={0.08} />
        <StatCard
          title="Subjects Below 75%"
          value={2}
          subtitle="Digital Elec., Aptitude"
          icon={AlertTriangle}
          color="warning"
          delay={0.16}
        />
        <StatCard
          title="Activity Requests"
          value={1}
          subtitle="1 pending approval"
          icon={Trophy}
          color="info"
          delay={0.24}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's timetable */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today&apos;s Timetable</h2>
            <Link
              href="/student/timetable"
              className="text-sm font-medium text-primary hover:underline"
            >
              View full week
            </Link>
          </div>
          <StaggerList className="space-y-3">
            {todayClasses.map((cls) => (
              <StaggerItem key={cls.time}>
                <div
                  className={`flex items-center gap-4 rounded-lg border p-3 transition-all ${
                    cls.status === 'ongoing'
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : cls.status === 'completed'
                        ? 'border-border bg-muted/30 opacity-60'
                        : 'border-border hover:border-primary/30 hover:bg-accent/50'
                  }`}
                >
                  <div className="text-center">
                    <Clock className={`mx-auto h-4 w-4 ${cls.status === 'ongoing' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="mt-1 text-xs font-medium text-muted-foreground">{cls.time.split(' - ')[0]}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{cls.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {cls.faculty} &middot; {cls.room}
                    </p>
                  </div>
                  {cls.status === 'ongoing' && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Now
                    </span>
                  )}
                  {cls.status === 'completed' && (
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                      Done
                    </span>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>

        {/* Attendance overview */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Attendance Overview</h2>
          <div className="flex justify-center py-2">
            <AttendanceRing percentage={overallPct} size={140} label="Overall" delay={0.3} />
          </div>
          <div className="mt-5 space-y-3">
            {subjectAttendance.map((subj, i) => (
              <motion.div
                key={subj.code}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{subj.code}</p>
                  <p className="text-xs text-muted-foreground">{subj.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subj.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.6 + i * 0.08 }}
                      className={`h-full rounded-full ${
                        subj.percentage >= 75
                          ? 'bg-success'
                          : subj.percentage >= 50
                            ? 'bg-warning'
                            : 'bg-destructive'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      subj.percentage >= 75
                        ? 'text-success'
                        : subj.percentage >= 50
                          ? 'text-warning'
                          : 'text-destructive'
                    }`}
                  >
                    {subj.percentage}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <Link
            href="/student/attendance"
            className="mt-4 block text-center text-sm font-medium text-primary hover:underline"
          >
            View detailed breakdown
          </Link>
        </div>
      </div>
    </div>
  );
}
