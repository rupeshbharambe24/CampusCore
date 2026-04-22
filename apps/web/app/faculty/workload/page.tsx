'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { BarChart3, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface WorkloadItem {
  user_id: string; full_name: string; employee_id: string; designation: string | null;
  lectures_per_week: number; labs_per_week: number; tutorials_per_week: number; total_periods: number;
}

export default function WorkloadPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['hod', 'workload'],
    queryFn: () => api.get<WorkloadItem[]>('/hod/workload'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const items = data ?? [];
  const maxPeriods = Math.max(...items.map((i) => i.total_periods), 1);

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <BarChart3 className="mr-2 inline-block h-6 w-6 text-primary" />
        Faculty Workload
      </motion.h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No timetable data</p>
          <p className="text-sm text-muted-foreground/70">Workload appears once timetable periods are assigned</p>
        </div>
      ) : (
        <StaggerList className="space-y-3">
          {items.map((fac, i) => (
            <StaggerItem key={fac.user_id}>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{fac.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{fac.employee_id} · {fac.designation ?? 'Faculty'}</p>
                  </div>
                  <span className={cn(
                    'rounded-full px-3 py-1 text-sm font-bold',
                    fac.total_periods > 20 ? 'bg-destructive/10 text-destructive' :
                    fac.total_periods > 15 ? 'bg-warning/10 text-warning' :
                    'bg-success/10 text-success',
                  )}>
                    {fac.total_periods} periods/week
                  </span>
                </div>

                {/* Bar */}
                <div className="h-4 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(fac.total_periods / maxPeriods) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                    className="flex h-full rounded-full overflow-hidden"
                  >
                    {fac.lectures_per_week > 0 && (
                      <div className="bg-primary h-full" style={{ flex: fac.lectures_per_week }} />
                    )}
                    {fac.labs_per_week > 0 && (
                      <div className="bg-info h-full" style={{ flex: fac.labs_per_week }} />
                    )}
                    {fac.tutorials_per_week > 0 && (
                      <div className="bg-success h-full" style={{ flex: fac.tutorials_per_week }} />
                    )}
                  </motion.div>
                </div>

                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Lectures: {fac.lectures_per_week}</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-info" /> Labs: {fac.labs_per_week}</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Tutorials: {fac.tutorials_per_week}</span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
