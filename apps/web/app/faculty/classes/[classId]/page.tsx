'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { ArrowLeft, Users, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Demo roster data — in production, fetched from faculty API
const demoRoster = [
  { roll: '22CS001', name: 'Aarav Patel', present: 35, total: 40, pct: 88 },
  { roll: '22CS002', name: 'Aditi Sharma', present: 27, total: 40, pct: 68 },
  { roll: '22CS003', name: 'Arjun Deshmukh', present: 38, total: 40, pct: 95 },
  { roll: '22CS004', name: 'Bhavya Joshi', present: 30, total: 40, pct: 75 },
  { roll: '22CS005', name: 'Diya Kulkarni', present: 32, total: 40, pct: 80 },
  { roll: '22CS006', name: 'Gaurav Patil', present: 23, total: 40, pct: 58 },
  { roll: '22CS007', name: 'Ishaan Reddy', present: 36, total: 40, pct: 90 },
  { roll: '22CS008', name: 'Kavya Mehta', present: 29, total: 40, pct: 73 },
  { roll: '22CS009', name: 'Manav Singh', present: 34, total: 40, pct: 85 },
  { roll: '22CS010', name: 'Nisha Verma', present: 37, total: 40, pct: 93 },
  { roll: '22CS011', name: 'Pranav Gupta', present: 26, total: 40, pct: 65 },
  { roll: '22CS012', name: 'Riya Thakur', present: 39, total: 40, pct: 98 },
];

export default function ClassDetailPage() {
  const params = useParams();
  const below75 = demoRoster.filter((s) => s.pct < 75);
  const avgPct = Math.round(demoRoster.reduce((a, s) => a + s.pct, 0) / demoRoster.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/faculty/classes" className="rounded-lg p-1.5 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">
            <Users className="mr-2 inline-block h-6 w-6 text-primary" />
            Class Attendance
          </h1>
          <p className="text-sm text-muted-foreground">{demoRoster.length} students &middot; {avgPct}% average</p>
        </motion.div>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{demoRoster.length}</p>
          <p className="text-xs text-muted-foreground">Total Students</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
          <p className="text-2xl font-bold text-success">{avgPct}%</p>
          <p className="text-xs text-muted-foreground">Average Attendance</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-center">
          <p className="text-2xl font-bold text-warning">{below75.length}</p>
          <p className="text-xs text-muted-foreground">Below 75%</p>
        </div>
      </motion.div>

      {/* Roster table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="overflow-hidden rounded-xl border border-border"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roll</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Present</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {demoRoster.map((s, i) => (
              <motion.tr
                key={s.roll}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className={cn(
                  'border-b last:border-0 transition-colors',
                  s.pct < 75 ? 'bg-destructive/[0.03] hover:bg-destructive/[0.06]' : 'hover:bg-accent/50',
                )}
              >
                <td className="px-4 py-3 font-medium">{s.roll}</td>
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 text-center">{s.present}</td>
                <td className="px-4 py-3 text-center">{s.total}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 0.6, delay: 0.3 + i * 0.03 }}
                        className={cn(
                          'h-full rounded-full',
                          s.pct >= 75 ? 'bg-success' : s.pct >= 50 ? 'bg-warning' : 'bg-destructive',
                        )}
                      />
                    </div>
                    <span className={cn(
                      'w-12 text-right font-bold tabular-nums text-sm',
                      s.pct >= 75 ? 'text-success' : s.pct >= 50 ? 'text-warning' : 'text-destructive',
                    )}>
                      {s.pct}%
                    </span>
                    {s.pct < 75 && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
