'use client';

import { motion } from '@/components/motion';
import { AlertTriangle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import { useSections } from '@/lib/lookup-hooks';

interface DefaulterItem { student_id: string; roll_number: string; full_name: string; total_classes: number; attended: number; percentage: number }

export default function DefaultersPage() {
  const [sectionId, setSectionId] = useState('');
  const [threshold, setThreshold] = useState('75');
  const { data: sectionOpts, isLoading: secLoading } = useSections();

  const params: Record<string, string> = { threshold };
  if (sectionId) params.section_id = sectionId;
  const qs = new URLSearchParams(params).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['defaulters', sectionId, threshold],
    queryFn: () => api.get<DefaulterItem[]>(`/admin/reports/attendance/below-threshold?${qs}`),
    enabled: true,
  });

  const items = data ?? [];

  const handleExport = () => {
    if (!items.length) return;
    const csv = ['Roll,Name,Total,Attended,Percentage', ...items.map((r) => `${r.roll_number},${r.full_name},${r.total_classes},${r.attended},${r.percentage}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'defaulters.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <AlertTriangle className="mr-2 inline-block h-6 w-6 text-warning" />
          Attendance Defaulters
        </motion.h1>
        <button onClick={handleExport} disabled={!items.length} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Section</label>
          <LookupSelect items={sectionOpts} isLoading={secLoading} value={sectionId} onChange={setSectionId} placeholder="All sections" className="w-56" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Threshold %</label>
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} min={0} max={100} className="flex h-10 w-20 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
      </div>

      <div className="rounded-lg bg-warning/5 border border-warning/20 px-4 py-3 text-sm">
        <strong className="text-warning">{items.length}</strong> student{items.length !== 1 ? 's' : ''} below {threshold}% attendance
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roll</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Attended</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <motion.tr key={r.student_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className={cn('border-b last:border-0 transition-colors', r.percentage < 50 ? 'bg-destructive/[0.03]' : 'hover:bg-accent/50')}>
                  <td className="px-4 py-3 font-medium font-mono text-xs">{r.roll_number}</td>
                  <td className="px-4 py-3">{r.full_name}</td>
                  <td className="px-4 py-3 text-center">{r.total_classes}</td>
                  <td className="px-4 py-3 text-center">{r.attended}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('font-bold tabular-nums', r.percentage >= 60 ? 'text-warning' : 'text-destructive')}>{r.percentage}%</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No defaulters found</p>
          <p className="text-sm text-muted-foreground/70">All students are above {threshold}% attendance</p>
        </div>
      )}
    </div>
  );
}
