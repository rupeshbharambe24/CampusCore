'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Award, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ResultItem { exam_name: string; exam_type: string; max_marks: number; subject_code: string; subject_name: string; marks_obtained: number; is_absent: boolean; rank_in_branch: number | null }

export default function ResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'all-results'],
    queryFn: () => api.get<ResultItem[]>('/students/me/results'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const results = data ?? [];

  // Group by exam_name
  const byExam: Record<string, ResultItem[]> = {};
  results.forEach((r) => {
    if (!byExam[r.exam_name]) byExam[r.exam_name] = [];
    byExam[r.exam_name]!.push(r);
  });

  // Compute totals per exam
  const examSummaries = Object.entries(byExam).map(([examName, items]) => {
    const totalMax = items.reduce((a, r) => a + r.max_marks, 0);
    const totalObtained = items.reduce((a, r) => a + (r.is_absent ? 0 : r.marks_obtained), 0);
    const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    return { examName, items, totalMax, totalObtained, pct, type: items[0]?.exam_type ?? '' };
  });

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <Award className="mr-2 inline-block h-6 w-6 text-primary" />
        All Results
      </motion.h1>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No results published yet</p>
        </div>
      ) : (
        examSummaries.map(({ examName, items, totalMax, totalObtained, pct, type }) => (
          <motion.div key={examName} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card shadow-sm">
            {/* Exam header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{examName}</h2>
                <p className="text-xs text-muted-foreground capitalize">{type.replace('_', ' ')}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-2xl font-bold', pct >= 60 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-destructive')}>
                  {totalObtained}/{totalMax}
                </p>
                <p className="text-xs text-muted-foreground">{pct}% overall</p>
              </div>
            </div>

            {/* Subject rows */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="px-5 py-2.5 text-center font-medium text-muted-foreground">Marks</th>
                  <th className="px-5 py-2.5 text-center font-medium text-muted-foreground">Rank</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.subject_code} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium">{r.subject_name}</p>
                      <p className="text-xs text-muted-foreground">{r.subject_code}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {r.is_absent ? (
                        <span className="text-destructive font-medium">Absent</span>
                      ) : (
                        <span className={cn('font-bold', r.marks_obtained >= r.max_marks * 0.6 ? 'text-success' : r.marks_obtained >= r.max_marks * 0.4 ? 'text-warning' : 'text-destructive')}>
                          {r.marks_obtained}/{r.max_marks}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {r.rank_in_branch ? <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">#{r.rank_in_branch}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ))
      )}
    </div>
  );
}
