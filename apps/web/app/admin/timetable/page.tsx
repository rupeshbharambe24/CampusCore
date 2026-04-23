'use client';

import { motion } from '@/components/motion';
import { Calendar, Plus, Users, LayoutGrid, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { LookupSelect } from '@/components/lookup-select';
import { useDivisions, useFacultyLookup } from '@/lib/lookup-hooks';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TimetableCellModal } from '@/components/timetable-cell-modal';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const slots = ['10:00', '11:00', '12:00', '13:30', '14:30', '15:30', '16:30'];

const typeColors: Record<string, string> = {
  lecture: 'bg-primary/10 border-primary/30 text-primary',
  lab: 'bg-info/10 border-info/30 text-info',
  aptitude: 'bg-warning/10 border-warning/30 text-warning',
  tutorial: 'bg-success/10 border-success/30 text-success',
};

interface PeriodEntry {
  id: string; subject_id: string; faculty_id: string; room_id: string | null;
  period_type: string; lab_batch: string | null;
  timetable_slot_id: string; section_id: string; semester_id: string;
}

interface SlotEntry { id: string; day_of_week: number; start_time: string; end_time: string; slot_label: string }

// Build grid from periods + slots
function buildGrid(periods: PeriodEntry[], timetableSlots: SlotEntry[], subjectMap: Record<string, string>, facultyMap: Record<string, string>) {
  const grid: Record<string, Record<string, { subject: string; faculty: string; type: string } | null>> = {};
  for (const day of days) grid[day] = {};
  for (const day of days) for (const slot of slots) grid[day]![slot] = null;

  for (const p of periods) {
    const slot = timetableSlots.find((s) => s.id === p.timetable_slot_id);
    if (!slot) continue;
    const dayName = days[slot.day_of_week];
    if (!dayName) continue;
    grid[dayName]![slot.start_time] = {
      subject: subjectMap[p.subject_id] ?? p.subject_id.slice(0, 8),
      faculty: facultyMap[p.faculty_id] ?? '',
      type: p.period_type,
    };
  }
  return grid;
}

export default function TimetableEditorPage() {
  const [viewMode, setViewMode] = useState<'division' | 'faculty'>('division');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [cellModal, setCellModal] = useState<{ day: number; slot: string } | null>(null);

  const { data: divisionOpts, isLoading: divLoading } = useDivisions();
  const { data: facultyOpts, isLoading: facLoading } = useFacultyLookup();

  // Get division details to find section_id and semester_id
  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get<{ id: string; divisions: { id: string; section_id: string | null }[] }[]>('/batches'),
  });
  const selectedDivData = batchesData?.flatMap((b) => b.divisions).find((d) => d.id === selectedDivision);
  const sectionId = selectedDivData?.section_id ?? '';

  // Get current semester
  const { data: semData } = useQuery({
    queryKey: ['lookup', 'semesters'],
    queryFn: () => api.get<{ id: string; label: string }[]>('/lookups/semesters'),
  });
  const currentSem = semData?.find((s) => s.label.includes('Current'));
  const semesterId = currentSem?.id ?? '';

  // Fetch periods for selected division's section
  const { data: periods } = useQuery({
    queryKey: ['admin', 'periods', semesterId, sectionId],
    queryFn: () => api.get<PeriodEntry[]>(`/admin/periods?semester_id=${semesterId}&section_id=${sectionId}`),
    enabled: !!semesterId && !!sectionId,
  });

  // Fetch timetable slots
  const { data: slotsData } = useQuery({
    queryKey: ['admin', 'timetable-slots-all'],
    queryFn: () => api.get<{ items: SlotEntry[] }>('/admin/timetable-slots?page=1&size=100'),
  });

  // Fetch subject + faculty names for display
  const { data: subjectLookup } = useQuery({
    queryKey: ['lookup', 'subjects-all'],
    queryFn: () => api.get<{ id: string; label: string }[]>('/lookups/subjects'),
  });
  const { data: facLookup } = useQuery({
    queryKey: ['lookup', 'faculty-all'],
    queryFn: () => api.get<{ id: string; label: string }[]>('/lookups/faculty'),
  });

  const subjectMap: Record<string, string> = {};
  subjectLookup?.forEach((s) => { subjectMap[s.id] = s.label.split(' — ')[0] ?? s.label; });
  const facultyMap: Record<string, string> = {};
  facLookup?.forEach((f) => { facultyMap[f.id] = f.label.split(' (')[0] ?? f.label; });

  const grid = periods && slotsData?.items ? buildGrid(periods, slotsData.items, subjectMap, facultyMap) : null;
  const hasSelection = viewMode === 'division' ? !!selectedDivision : !!selectedFaculty;

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
        Timetable Editor
      </motion.h1>

      {/* View mode + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          <button onClick={() => setViewMode('division')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all', viewMode === 'division' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
            <LayoutGrid className="h-3.5 w-3.5" /> By Division
          </button>
          <button onClick={() => setViewMode('faculty')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all', viewMode === 'faculty' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
            <Users className="h-3.5 w-3.5" /> By Faculty
          </button>
        </div>

        {viewMode === 'division' && (
          <LookupSelect items={divisionOpts} isLoading={divLoading} value={selectedDivision} onChange={setSelectedDivision} placeholder="Select division..." className="w-72" />
        )}
        {viewMode === 'faculty' && (
          <LookupSelect items={facultyOpts} isLoading={facLoading} value={selectedFaculty} onChange={setSelectedFaculty} placeholder="Select faculty..." className="w-72" />
        )}
      </div>

      {!hasSelection ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            Select a {viewMode === 'division' ? 'division' : 'faculty member'} to view/edit timetable
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Before creating periods: 1) Assign subjects to batch, 2) Assign faculty to division
          </p>
        </div>
      ) : (
        <motion.div key={selectedDivision + selectedFaculty} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-20 px-3 py-3 text-left font-semibold text-muted-foreground">Time</th>
                {days.map((day) => (
                  <th key={day} className="px-2 py-3 text-center font-semibold text-muted-foreground">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs font-medium text-muted-foreground">{slot}</td>
                  {days.map((day, dayIdx) => {
                    const cell = grid?.[day]?.[slot];
                    return (
                      <td key={day + slot} className="px-1 py-1">
                        {cell ? (
                          <div className={cn('rounded-lg border p-2 text-xs', typeColors[cell.type] ?? typeColors.lecture)}>
                            <p className="font-bold">{cell.subject}</p>
                            <p className="opacity-70">{cell.faculty}</p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => viewMode === 'division' && sectionId && setCellModal({ day: dayIdx, slot })}
                            className="flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground/30 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {viewMode === 'division' && selectedDivision && !sectionId && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          This division has no linked section yet. Create it by going to Batch Management → Add Divisions.
        </div>
      )}

      {/* Cell editor modal */}
      {cellModal && sectionId && semesterId && (
        <TimetableCellModal
          divisionId={selectedDivision}
          day={cellModal.day}
          slot={cellModal.slot}
          semesterId={semesterId}
          sectionId={sectionId}
          onClose={() => setCellModal(null)}
        />
      )}
    </div>
  );
}
