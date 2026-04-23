'use client';

import { Calendar, CheckSquare, ClipboardList, Clock, Users, Building2, FileText, GraduationCap, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { StaggerList, StaggerItem, motion } from '@/components/motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMe, useFacultyToday } from '@/lib/hooks';
import { useHodOverview } from '@/lib/hod-hooks';

export default function FacultyDashboard() {
  const { data: me } = useMe();
  const { data: todayEntries } = useFacultyToday();
  const isHod = me?.user.role === 'hod';
  const { data: hodOverview } = useHodOverview();

  const todayClasses = todayEntries ?? [];
  const name = me?.user.full_name?.split(' ')[0] ?? 'Professor';

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Good morning, {name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-1 text-muted-foreground"
        >
          {isHod ? `HOD · ${hodOverview?.department_name ?? 'Department'}` : `You have ${todayClasses.length} classes today`}
        </motion.p>
      </div>

      {/* HOD-specific stats */}
      {isHod && hodOverview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Department Faculty" value={hodOverview.total_faculty} icon={Users} color="primary" delay={0} />
          <StatCard title="Department Students" value={hodOverview.total_students} icon={GraduationCap} color="info" delay={0.08} />
          <StatCard title="Divisions" value={hodOverview.total_divisions ?? 0} icon={Building2} color="success" delay={0.16} />
          <StatCard title="Pending Leaves" value={hodOverview.pending_leaves} icon={FileText} color={hodOverview.pending_leaves > 0 ? 'warning' : 'success'} delay={0.24} />
        </div>
      )}

      {/* Regular faculty stats */}
      {!isHod && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Today's Classes" value={todayClasses.length} icon={Calendar} color="primary" delay={0} />
          <StatCard title="Attendance Marked" value="—" icon={CheckSquare} color="success" delay={0.08} />
          <StatCard title="Pending Approvals" value="—" icon={ClipboardList} color="warning" delay={0.16} />
          <StatCard title="Total Students" value="—" icon={Users} color="info" delay={0.24} />
        </div>
      )}

      {/* HOD quick links */}
      {isHod && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/faculty/leaves" className="group">
            <motion.div whileHover={{ y: -4 }} className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary/30 group-hover:shadow-lg">
              <FileText className="h-8 w-8 text-warning" />
              <h3 className="mt-3 font-semibold">Leave Approvals</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hodOverview?.pending_leaves ?? 0} pending leave applications
              </p>
            </motion.div>
          </Link>
          <Link href="/faculty/dept-faculty" className="group">
            <motion.div whileHover={{ y: -4 }} className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary/30 group-hover:shadow-lg">
              <Users className="h-8 w-8 text-info" />
              <h3 className="mt-3 font-semibold">Department Faculty</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hodOverview?.total_faculty ?? 0} faculty members
              </p>
            </motion.div>
          </Link>
          <Link href="/faculty/dept-students" className="group">
            <motion.div whileHover={{ y: -4 }} className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary/30 group-hover:shadow-lg">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-semibold">Department Students</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hodOverview?.total_students ?? 0} students
              </p>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Today's classes (both HOD and faculty) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Today&apos;s Schedule</h2>
        {todayClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No classes scheduled for today</p>
        ) : (
          <StaggerList className="space-y-3">
            {todayClasses.map((cls) => (
              <StaggerItem key={cls.period_id}>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="text-center min-w-[50px]">
                    <p className="text-xs font-medium text-muted-foreground">{cls.start_time}</p>
                    <p className="text-xs text-muted-foreground">{cls.slot_label}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{cls.subject_name}</p>
                    <p className="text-xs text-muted-foreground">{cls.subject_code} · {cls.room_name ?? 'TBA'}</p>
                  </div>
                  <Link
                    href="/faculty/today"
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Mark Attendance
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
