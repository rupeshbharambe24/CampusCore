'use client';

import { Calendar, CheckSquare, AlertTriangle, Trophy } from 'lucide-react';
import { StaggerList, StaggerItem, motion } from '@/components/motion';
import { StatCard } from '@/components/stat-card';
import { AttendanceRing } from '@/components/attendance-ring';
import { useMe, useAttendanceSummary, useAttendanceBySubject, useStudentTimetable } from '@/lib/hooks';
import Link from 'next/link';
import { Clock } from 'lucide-react';

export default function StudentDashboard() {
  const { data: me } = useMe();
  const { data: summary } = useAttendanceSummary();
  const { data: subjects } = useAttendanceBySubject();
  const { data: timetable } = useStudentTimetable();

  const overallPct = summary?.overall_percentage ?? 0;
  const todayClasses = timetable?.filter(() => true) ?? [];
  const below75Count = summary?.subjects_below_75_count ?? 0;
  const below75Names = summary?.subjects_below_75?.join(', ') ?? '';

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Good morning{me?.user.full_name ? `, ${me.user.full_name.split(' ')[0]}` : ''}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Classes" value={todayClasses.length} icon={Calendar} color="primary" delay={0} />
        <StatCard title="Overall Attendance" value={`${overallPct}%`} icon={CheckSquare} color={overallPct >= 75 ? 'success' : 'warning'} delay={0.08} />
        <StatCard
          title="Subjects Below 75%"
          value={below75Count}
          subtitle={below75Names || 'None'}
          icon={AlertTriangle}
          color={below75Count > 0 ? 'warning' : 'success'}
          delay={0.16}
        />
        <StatCard title="Activity Requests" value="—" subtitle="View requests" icon={Trophy} color="info" delay={0.24} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's timetable */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today&apos;s Timetable</h2>
            <Link href="/student/timetable" className="text-sm font-medium text-primary hover:underline">
              View full week
            </Link>
          </div>
          {todayClasses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No timetable data yet. Your section needs to be assigned in the admin panel.
            </p>
          ) : (
            <StaggerList className="space-y-3">
              {todayClasses.map((cls) => (
                <StaggerItem key={cls.period_id}>
                  <div className="flex items-center gap-4 rounded-lg border border-border p-3 hover:border-primary/30 hover:bg-accent/50 transition-all">
                    <div className="text-center">
                      <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{cls.start_time}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{cls.subject_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.faculty_name} &middot; {cls.room_name ?? 'TBA'}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                      {cls.period_type}
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </div>

        {/* Attendance overview */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Attendance Overview</h2>
          <div className="flex justify-center py-2">
            <AttendanceRing percentage={overallPct} size={140} label="Overall" delay={0.3} />
          </div>
          {subjects && subjects.length > 0 ? (
            <div className="mt-5 space-y-3">
              {subjects.map((subj, i) => (
                <motion.div
                  key={subj.subject_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{subj.subject_code}</p>
                    <p className="text-xs text-muted-foreground">{subj.subject_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${subj.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + i * 0.08 }}
                        className={`h-full rounded-full ${
                          subj.percentage >= 75 ? 'bg-success' : subj.percentage >= 50 ? 'bg-warning' : 'bg-destructive'
                        }`}
                      />
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${
                      subj.percentage >= 75 ? 'text-success' : subj.percentage >= 50 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {subj.percentage}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground">No attendance data yet</p>
          )}
          <Link href="/student/attendance" className="mt-4 block text-center text-sm font-medium text-primary hover:underline">
            View detailed breakdown
          </Link>
        </div>
      </div>
    </div>
  );
}
