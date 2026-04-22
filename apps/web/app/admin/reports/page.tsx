'use client';

import { motion } from '@/components/motion';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useReport } from '@/lib/hooks';

const reportTypes = [
  { id: 'attendance/by-section', label: 'Section Attendance' },
  { id: 'attendance/below-threshold', label: 'Below 75% Watchlist' },
  { id: 'faculty-compliance', label: 'Faculty Compliance' },
  { id: 'activity-summary', label: 'Activity Summary' },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('attendance/below-threshold');
  const [sectionId, setSectionId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [threshold, setThreshold] = useState('75');

  const params: Record<string, string> = {};
  if (activeReport === 'attendance/by-section' && sectionId) params.section_id = sectionId;
  if (activeReport === 'attendance/below-threshold') {
    if (sectionId) params.section_id = sectionId;
    params.threshold = threshold;
  }
  if (activeReport === 'faculty-compliance' && semesterId) params.semester_id = semesterId;

  const { data: reportData, isLoading } = useReport(activeReport, params);

  const handleExport = () => {
    if (!reportData?.length) return;
    const headers = Object.keys(reportData[0]!);
    const csv = [headers.join(','), ...reportData.map((row) => headers.map((h) => String(row[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport.replace('/', '_')}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <BarChart3 className="mr-2 inline-block h-6 w-6 text-primary" />
          Reports
        </motion.h1>
        <button onClick={handleExport} disabled={!reportData?.length} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {reportTypes.map((rt) => (
          <button key={rt.id} onClick={() => setActiveReport(rt.id)} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap', activeReport === rt.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card border border-border text-muted-foreground hover:bg-accent')}>
            {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {(activeReport.includes('section') || activeReport.includes('threshold')) && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Section ID</label>
            <input type="text" value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="UUID" className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64" />
          </div>
        )}
        {activeReport.includes('threshold') && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Threshold %</label>
            <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} min={0} max={100} className="flex h-9 w-20 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}
        {activeReport === 'faculty-compliance' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Semester ID</label>
            <input type="text" value={semesterId} onChange={(e) => setSemesterId(e.target.value)} placeholder="UUID" className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : reportData && reportData.length > 0 ? (
        <motion.div key={activeReport} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {Object.keys(reportData[0]!).map((key) => (
                  <th key={key} className="px-4 py-3 text-left font-semibold text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-4 py-3">{String(val ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            {activeReport === 'activity-summary' ? 'No activity data yet' : 'Enter filters to generate report'}
          </p>
        </div>
      )}
    </div>
  );
}
