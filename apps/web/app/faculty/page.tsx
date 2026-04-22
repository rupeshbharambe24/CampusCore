'use client';

import { Calendar, CheckSquare, ClipboardList, Clock, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { StaggerList, StaggerItem, motion } from '@/components/motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const todayClasses = [
  { time: '09:00 - 09:50', subject: 'Data Structures', section: 'CSE-A (Year 2)', room: 'LT-1', students: 62, marked: true, status: 'completed' },
  { time: '10:00 - 10:50', subject: 'Data Structures', section: 'CSE-B (Year 2)', room: 'LT-2', students: 58, marked: false, status: 'ongoing' },
  { time: '14:00 - 15:50', subject: 'DS Lab', section: 'CSE-A B1 (Year 2)', room: 'Lab-201', students: 21, marked: false, status: 'upcoming' },
];

export default function FacultyDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Good morning, Professor
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-1 text-muted-foreground"
        >
          You have 3 classes today
        </motion.p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Classes" value={3} icon={Calendar} color="primary" delay={0} />
        <StatCard title="Attendance Marked" value="1 / 3" icon={CheckSquare} color="success" delay={0.08} />
        <StatCard title="Pending Approvals" value={2} subtitle="Activity requests" icon={ClipboardList} color="warning" delay={0.16} />
        <StatCard title="Total Students" value={141} subtitle="Across 3 sections" icon={Users} color="info" delay={0.24} />
      </div>

      {/* Now + Today's classes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Today&apos;s Schedule</h2>
        <StaggerList className="space-y-3">
          {todayClasses.map((cls) => (
            <StaggerItem key={cls.time + cls.section}>
              <div
                className={cn(
                  'flex items-center gap-4 rounded-xl border p-4 transition-all',
                  cls.status === 'ongoing'
                    ? 'border-primary/50 bg-primary/5 shadow-md'
                    : cls.status === 'completed'
                      ? 'border-border bg-muted/30 opacity-70'
                      : 'border-border bg-card hover:border-primary/30 hover:shadow-sm',
                )}
              >
                <div className="text-center min-w-[60px]">
                  <Clock className={cn('mx-auto h-4 w-4', cls.status === 'ongoing' ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{cls.time.split(' - ')[0]}</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{cls.subject}</p>
                  <p className="text-sm text-muted-foreground">{cls.section} &middot; {cls.room}</p>
                  <p className="text-xs text-muted-foreground">{cls.students} students</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {cls.status === 'ongoing' && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground animate-pulse">
                      NOW
                    </span>
                  )}
                  {cls.marked ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <CheckSquare className="h-3.5 w-3.5" /> Marked
                    </span>
                  ) : cls.status !== 'completed' ? (
                    <Link
                      href="/faculty/today"
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Mark Attendance
                    </Link>
                  ) : null}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/faculty/approvals" className="group">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary/30 group-hover:shadow-md"
          >
            <ClipboardList className="h-8 w-8 text-warning" />
            <h3 className="mt-3 font-semibold">Activity Approvals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              2 pending requests from students
            </p>
          </motion.div>
        </Link>
        <Link href="/faculty/classes" className="group">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary/30 group-hover:shadow-md"
          >
            <Users className="h-8 w-8 text-info" />
            <h3 className="mt-3 font-semibold">My Classes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              View attendance history for all your sections
            </p>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
