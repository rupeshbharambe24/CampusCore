'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { AttendanceRing } from '@/components/attendance-ring';
import {
  User, Mail, Hash, BookOpen, Calendar, Shield, Loader2,
  Phone, GraduationCap, Clock, CheckSquare, IndianRupee,
  Trophy, FileCheck, MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useMe, useAttendanceSummary, useAttendanceBySubject, useActivityRequests } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FeeSummary {
  total_fees: number;
  total_paid: number;
  total_pending: number;
}

export default function ProfilePage() {
  const { data, isLoading } = useMe();
  const { data: attendance } = useAttendanceSummary();
  const { data: subjects } = useAttendanceBySubject();
  const { data: activities } = useActivityRequests();
  const { data: fees } = useQuery({
    queryKey: ['student', 'fees-summary'],
    queryFn: () => api.get<FeeSummary>('/students/me/fees'),
    retry: false,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const user = data?.user;
  const student = data?.student;
  const overallPct = attendance?.overall_percentage ?? 0;
  const lectureOnlyPct = attendance?.lecture_only_percentage ?? 0;

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <User className="mr-2 inline-block h-6 w-6 text-primary" />
        My Profile
      </motion.h1>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-4xl font-bold shadow-lg shadow-primary/20">
            {user?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>

          {/* Name + role */}
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold">{user?.full_name}</h2>
            <p className="text-sm text-muted-foreground capitalize">
              {user?.role} · AI & Data Science
              {student && ` · ${student.admission_year + 4} Batch`}
            </p>
            {student && (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm font-mono text-primary">{student.roll_number}</p>
                {student.is_graduated && <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">Graduated</span>}
                {student.is_detained && <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">Detained</span>}
              </div>
            )}
          </div>

          {/* Attendance ring */}
          <AttendanceRing percentage={overallPct} size={100} strokeWidth={8} label="Attendance" delay={0.3} />
        </div>
      </motion.div>

      {/* Personal details */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={Mail} label="Email" value={user?.email ?? '—'} />
          <InfoItem icon={Phone} label="Phone" value={user?.phone ?? 'Not added'} />
          <InfoItem icon={Hash} label="Roll Number" value={student?.roll_number ?? '—'} />
          <InfoItem icon={Hash} label="PRN (University)" value={student?.prn ?? 'Not assigned'} />
          <InfoItem icon={BookOpen} label="Branch" value={student?.branch_id ? 'AI & Data Science' : '—'} />
          <InfoItem icon={GraduationCap} label="Admission Year" value={String(student?.admission_year ?? '—')} />
          <InfoItem icon={Calendar} label="Current Year" value={student ? `Year ${new Date().getFullYear() - student.admission_year + 1}` : '—'} />
          <InfoItem icon={Shield} label="Lab Batch" value={student?.lab_batch ?? '—'} />
          <InfoItem icon={MapPin} label="Division" value={student?.current_section_id ? 'Assigned' : 'Not assigned'} />
          <InfoItem icon={User} label="Gender" value={student?.gender ?? '—'} />
          <InfoItem icon={Calendar} label="Date of Birth" value={student?.date_of_birth ?? '—'} />
          <InfoItem icon={Shield} label="Blood Group" value={student?.blood_group ?? '—'} />
          <InfoItem icon={Shield} label="Category" value={student?.category ?? '—'} />
        </div>
      </motion.div>

      {/* Guardian details */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Guardian / Parent Details</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={User} label="Guardian Name" value={student?.guardian_name ?? 'Not added'} />
          <InfoItem icon={Phone} label="Guardian Phone" value={student?.guardian_phone ?? 'Not added'} />
          <InfoItem icon={User} label="Relation" value={student?.guardian_relation ?? '—'} />
          <InfoItem icon={MapPin} label="Address" value={student?.address ?? 'Not added'} />
        </div>
      </motion.div>

      {/* Academic overview */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Academic Overview</h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Attendance */}
          <div className="rounded-lg border border-border p-4 text-center">
            <CheckSquare className="mx-auto h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{overallPct}%</p>
            <p className="text-xs text-muted-foreground">Overall Attendance</p>
            <p className="text-xs text-muted-foreground mt-1">Lecture only: {lectureOnlyPct}%</p>
          </div>

          {/* Subjects below 75 */}
          <div className="rounded-lg border border-border p-4 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-warning mb-2" />
            <p className="text-2xl font-bold">{attendance?.subjects_below_75_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Subjects Below 75%</p>
            {attendance?.subjects_below_75 && attendance.subjects_below_75.length > 0 && (
              <p className="text-xs text-warning mt-1">{attendance.subjects_below_75.join(', ')}</p>
            )}
          </div>

          {/* Fees */}
          <div className="rounded-lg border border-border p-4 text-center">
            <IndianRupee className="mx-auto h-6 w-6 text-success mb-2" />
            <p className="text-2xl font-bold">₹{(fees?.total_paid ?? 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">Fees Paid</p>
            {fees && fees.total_pending > 0 && (
              <p className="text-xs text-warning mt-1">₹{fees.total_pending.toLocaleString('en-IN')} pending</p>
            )}
          </div>

          {/* Activities */}
          <div className="rounded-lg border border-border p-4 text-center">
            <Trophy className="mx-auto h-6 w-6 text-info mb-2" />
            <p className="text-2xl font-bold">{activities?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Activity Requests</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activities?.filter((a) => a.status === 'approved').length ?? 0} approved
            </p>
          </div>
        </div>
      </motion.div>

      {/* Subject-wise attendance */}
      {subjects && subjects.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Subject-wise Attendance</h3>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Subject</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">Present</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">Total</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">%</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <motion.tr
                    key={s.subject_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.03 }}
                    className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{s.subject_code}</p>
                      <p className="text-xs text-muted-foreground">{s.subject_name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">{s.present + s.activity}</td>
                    <td className="px-4 py-2.5 text-center">{s.total}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn(
                        'font-bold tabular-nums',
                        s.percentage >= 75 ? 'text-success' : s.percentage >= 50 ? 'text-warning' : 'text-destructive',
                      )}>
                        {s.percentage}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/student/attendance" icon={CheckSquare} label="Detailed Attendance" />
        <QuickLink href="/student/fees" icon={IndianRupee} label="Fee Details" />
        <QuickLink href="/student/exams" icon={FileCheck} label="Exam Results" />
        <QuickLink href="/change-password" icon={Shield} label="Change Password" />
      </motion.div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href as '/'} className="group">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all group-hover:border-primary/30 group-hover:shadow-md">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </Link>
  );
}
