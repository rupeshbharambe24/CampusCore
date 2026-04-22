'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { ClipboardList, Calendar, MapPin, Award, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface ScheduleEntry {
  exam_name: string;
  subject_code: string;
  subject_name: string;
  date: string;
  start_time: string;
  end_time: string;
  room?: string;
  seat_number?: number;
  bench_number?: number;
}

interface ResultEntry {
  exam_name: string;
  exam_type: string;
  max_marks: number;
  subject_code: string;
  subject_name: string;
  marks_obtained: number;
  is_absent: boolean;
  rank_in_section: number | null;
  rank_in_branch: number | null;
}

export default function StudentExamsPage() {
  const [tab, setTab] = useState<'schedule' | 'results'>('schedule');

  const { data: schedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ['student', 'exam-schedule'],
    queryFn: () => api.get<ScheduleEntry[]>('/students/me/exam-schedule'),
  });

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ['student', 'results'],
    queryFn: () => api.get<ResultEntry[]>('/students/me/results'),
  });

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <ClipboardList className="mr-2 inline-block h-6 w-6 text-primary" />
        Exams
      </motion.h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        <button onClick={() => setTab('schedule')} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all', tab === 'schedule' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
          <Calendar className="mr-1.5 inline-block h-4 w-4" /> Schedule
        </button>
        <button onClick={() => setTab('results')} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all', tab === 'results' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
          <Award className="mr-1.5 inline-block h-4 w-4" /> Results
        </button>
      </div>

      {/* Schedule tab */}
      {tab === 'schedule' && (
        loadingSchedule ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (schedule ?? []).length > 0 ? (
          <StaggerList className="space-y-3">
            {(schedule ?? []).map((s, i) => (
              <StaggerItem key={`${s.subject_code}-${s.date}`}>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{s.subject_name}</h3>
                      <p className="text-sm text-muted-foreground">{s.subject_code} · {s.exam_name}</p>
                    </div>
                    <span className="text-sm font-medium text-primary">{s.date}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {s.start_time} - {s.end_time}</span>
                    {s.room && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {s.room}</span>}
                    {s.seat_number && (
                      <span className="flex items-center gap-1.5 font-medium text-primary">
                        Seat #{s.seat_number} {s.bench_number ? `(Bench ${s.bench_number})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-lg font-medium text-muted-foreground">No exam schedule published</p>
          </div>
        )
      )}

      {/* Results tab */}
      {tab === 'results' && (
        loadingResults ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (results ?? []).length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Exam</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Subject</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Marks</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Rank</th>
                </tr>
              </thead>
              <tbody>
                {(results ?? []).map((r, i) => (
                  <motion.tr key={`${r.exam_name}-${r.subject_code}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.exam_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.exam_type.replace('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{r.subject_name}</p>
                      <p className="text-xs text-muted-foreground">{r.subject_code}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_absent ? (
                        <span className="text-destructive font-medium">Absent</span>
                      ) : (
                        <span className={cn('font-bold', r.marks_obtained >= r.max_marks * 0.6 ? 'text-success' : r.marks_obtained >= r.max_marks * 0.4 ? 'text-warning' : 'text-destructive')}>
                          {r.marks_obtained}/{r.max_marks}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.rank_in_branch ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          #{r.rank_in_branch}
                        </span>
                      ) : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-lg font-medium text-muted-foreground">No results published yet</p>
          </div>
        )
      )}
    </div>
  );
}
