'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { BarChart3, Download, Filter } from 'lucide-react';
import { AttendanceRing } from '@/components/attendance-ring';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const reportTypes = [
  { id: 'section', label: 'Section Attendance' },
  { id: 'below75', label: 'Below 75% Watchlist' },
  { id: 'compliance', label: 'Faculty Compliance' },
  { id: 'activity', label: 'Activity Summary' },
];

const below75Data = [
  { roll: '22CS002', name: 'Aditi Sharma', branch: 'CSE', section: 'A', pct: 68 },
  { roll: '22EC015', name: 'Rahul Yadav', branch: 'E&TC', section: 'A', pct: 62 },
  { roll: '22CS045', name: 'Priya Patil', branch: 'CSE', section: 'B', pct: 71 },
  { roll: '22ME008', name: 'Vikram Joshi', branch: 'MECH', section: 'A', pct: 58 },
  { roll: '22IT023', name: 'Sneha Reddy', branch: 'IT', section: 'A', pct: 73 },
  { roll: '22CS067', name: 'Aryan Kumar', branch: 'CSE', section: 'C', pct: 69 },
];

const complianceData = [
  { name: 'Dr. Mehta', dept: 'MECH', total: 40, marked: 28, pct: 70 },
  { name: 'Prof. Desai', dept: 'CIVIL', total: 35, marked: 26, pct: 74 },
  { name: 'Prof. Patel', dept: 'E&TC', total: 42, marked: 38, pct: 90 },
  { name: 'Dr. Sharma', dept: 'CSE', total: 45, marked: 43, pct: 96 },
  { name: 'Dr. Gupta', dept: 'Applied', total: 50, marked: 49, pct: 98 },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('below75');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          <BarChart3 className="mr-2 inline-block h-6 w-6 text-primary" />
          Reports
        </motion.h1>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Download className="h-4 w-4" /> Export CSV
        </motion.button>
      </div>

      {/* Report type selector */}
      <div className="flex gap-2 overflow-x-auto">
        {reportTypes.map((rt) => (
          <button
            key={rt.id}
            onClick={() => setActiveReport(rt.id)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
              activeReport === rt.id
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-card border border-border text-muted-foreground hover:bg-accent',
            )}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Below 75% report */}
      {activeReport === 'below75' && (
        <motion.div
          key="below75"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{below75Data.length}</strong> students below 75% attendance threshold
          </p>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roll No</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Branch</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Section</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {below75Data.map((row, i) => (
                  <motion.tr
                    key={row.roll}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{row.roll}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.branch}</td>
                    <td className="px-4 py-3">{row.section}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-bold tabular-nums',
                        row.pct >= 70 ? 'text-warning' : 'text-destructive',
                      )}>
                        {row.pct}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Faculty compliance */}
      {activeReport === 'compliance' && (
        <motion.div
          key="compliance"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <StaggerList className="space-y-3">
            {complianceData.map((fac, i) => (
              <StaggerItem key={fac.name}>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex-1">
                    <p className="font-semibold">{fac.name}</p>
                    <p className="text-xs text-muted-foreground">{fac.dept} &middot; {fac.marked}/{fac.total} marked</p>
                  </div>
                  <div className="h-3 w-32 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fac.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
                      className={cn(
                        'h-full rounded-full',
                        fac.pct >= 90 ? 'bg-success' : fac.pct >= 75 ? 'bg-warning' : 'bg-destructive',
                      )}
                    />
                  </div>
                  <span className={cn(
                    'w-12 text-right font-bold tabular-nums',
                    fac.pct >= 90 ? 'text-success' : fac.pct >= 75 ? 'text-warning' : 'text-destructive',
                  )}>
                    {fac.pct}%
                  </span>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </motion.div>
      )}

      {/* Section + Activity — simplified for now */}
      {(activeReport === 'section' || activeReport === 'activity') && (
        <motion.div
          key={activeReport}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed border-border bg-card p-12 text-center"
        >
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Select filters to generate the {activeReport === 'section' ? 'section attendance' : 'activity summary'} report
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Use the API at <code className="text-primary">/api/v1/admin/reports</code> for full data
          </p>
        </motion.div>
      )}
    </div>
  );
}
