'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Calendar, Loader2, GraduationCap, ClipboardList, PartyPopper, Clock, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CalEvent { id: string; date: string; end_date: string | null; event_type: string; title: string; description: string | null; visible_to: string }

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  holiday: { icon: PartyPopper, color: 'text-success bg-success/10 border-success/30' },
  exam_week: { icon: ClipboardList, color: 'text-destructive bg-destructive/10 border-destructive/30' },
  event: { icon: Flag, color: 'text-info bg-info/10 border-info/30' },
  deadline: { icon: Clock, color: 'text-warning bg-warning/10 border-warning/30' },
  meeting: { icon: GraduationCap, color: 'text-primary bg-primary/10 border-primary/30' },
  other: { icon: Calendar, color: 'text-muted-foreground bg-muted border-border' },
};

export default function CalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => api.get<CalEvent[]>('/calendar'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const events = data ?? [];

  // Group by month
  const byMonth: Record<string, CalEvent[]> = {};
  events.forEach((e) => {
    const month = e.date.substring(0, 7); // "2026-04"
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month]!.push(e);
  });

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
        Academic Calendar
      </motion.h1>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No events</p>
        </div>
      ) : (
        Object.entries(byMonth).map(([month, monthEvents]) => (
          <div key={month}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h2>
            <StaggerList className="space-y-2">
              {monthEvents.map((ev) => {
                const config = typeConfig[ev.event_type] ?? typeConfig.other!;
                const Icon = config.icon;
                return (
                  <StaggerItem key={ev.id}>
                    <div className={cn('flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md', config.color.split(' ').pop())}>
                      <div className={cn('shrink-0 rounded-lg p-2.5', config.color.split(' ').slice(0, 2).join(' '))}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{ev.title}</p>
                        {ev.description && <p className="text-sm text-muted-foreground">{ev.description}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(ev.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {ev.end_date && ev.end_date !== ev.date && ` → ${new Date(ev.end_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', config.color.split(' ').slice(0, 2).join(' '))}>
                        {ev.event_type.replace('_', ' ')}
                      </span>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </div>
        ))
      )}
    </div>
  );
}
