'use client';

import { BarChart3, Building2, Calendar, CheckSquare, GraduationCap, Users, AlertTriangle, ClipboardList } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { motion, StaggerList, StaggerItem } from '@/components/motion';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const recentGaps = [
  { faculty: 'Prof. Patel', class: 'EC302 - CSE-A', time: '11:00 - 11:50', gap: '3h ago' },
  { faculty: 'Dr. Mehta', class: 'ME201 - MECH-B', time: '10:00 - 10:50', gap: '4h ago' },
];

interface DashStats { total_students: number; total_faculty: number; total_departments: number; total_sections: number; total_subjects: number }

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => api.get<DashStats>('/admin/dashboard-stats'),
  });

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Admin Dashboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-1 text-muted-foreground"
        >
          College overview for today
        </motion.p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={stats?.total_students ?? '—'} icon={GraduationCap} color="primary" delay={0} />
        <StatCard title="Total Faculty" value={stats?.total_faculty ?? '—'} icon={Users} color="info" delay={0.08} />
        <StatCard title="Departments" value={stats?.total_departments ?? '—'} icon={Building2} color="success" delay={0.16} />
        <StatCard title="Subjects" value={stats?.total_subjects ?? '—'} icon={CheckSquare} color="warning" delay={0.24} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Branch-wise attendance */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Branch-wise Attendance Today</h2>
          <StaggerList className="space-y-3">
            {[
              { branch: 'CSE', attendance: 86, students: 1200 },
              { branch: 'MECH', attendance: 79, students: 600 },
              { branch: 'CIVIL', attendance: 82, students: 480 },
              { branch: 'E&TC', attendance: 74, students: 540 },
              { branch: 'IT', attendance: 88, students: 420 },
              { branch: 'AI&DS', attendance: 91, students: 360 },
            ].map((item, i) => (
              <StaggerItem key={item.branch}>
                <div className="flex items-center gap-4">
                  <span className="w-16 text-sm font-semibold">{item.branch}</span>
                  <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.attendance}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                      className={`h-full rounded-full ${
                        item.attendance >= 80 ? 'bg-success' : item.attendance >= 70 ? 'bg-warning' : 'bg-destructive'
                      }`}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-bold tabular-nums">
                    {item.attendance}%
                  </span>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>

        {/* Unmarked periods */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Unmarked Periods
          </h2>
          {recentGaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">All periods marked today!</p>
          ) : (
            <div className="space-y-3">
              {recentGaps.map((gap, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="rounded-lg border border-warning/20 bg-warning/5 p-3"
                >
                  <p className="text-sm font-medium">{gap.faculty}</p>
                  <p className="text-xs text-muted-foreground">{gap.class} &middot; {gap.time}</p>
                  <p className="text-xs text-warning">{gap.gap} since class ended</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/admin/batches', icon: GraduationCap, label: 'Batch Management', desc: 'Manage batches, divisions, students' },
          { href: '/admin/timetable', icon: Calendar, label: 'Timetable', desc: 'Manage periods and schedules' },
          { href: '/admin/reports', icon: BarChart3, label: 'Reports', desc: 'Attendance reports and analytics' },
          { href: '/admin/users', icon: Users, label: 'Users', desc: 'Manage students and faculty' },
        ].map((item, i) => (
          <Link key={item.href} href={item.href as '/'} className="group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary/30 group-hover:shadow-lg"
            >
              <item.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-semibold">{item.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
