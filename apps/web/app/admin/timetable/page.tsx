'use client';

import { motion } from '@/components/motion';
import { Calendar, Plus, Users, LayoutGrid, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { LookupSelect } from '@/components/lookup-select';
import { useDivisions, useFacultyLookup } from '@/lib/lookup-hooks';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TimetableEntry } from '@/lib/hooks';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const slots = ['10:00', '11:00', '12:00', '13:30', '14:30', '15:30', '16:30'];

const typeColors: Record<string, string> = {
  lecture: 'bg-primary/10 border-primary/30 text-primary',
  lab: 'bg-info/10 border-info/30 text-info',
  aptitude: 'bg-warning/10 border-warning/30 text-warning',
};

export default function TimetableEditorPage() {
  const [viewMode, setViewMode] = useState<'division' | 'faculty'>('division');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  const { data: divisionOpts, isLoading: divLoading } = useDivisions();
  const { data: facultyOpts, isLoading: facLoading } = useFacultyLookup();

  // Fetch real timetable data when a division/faculty is selected
  // For now show empty grid — periods must be created via API
  const hasSelection = viewMode === 'division' ? !!selectedDivision : !!selectedFaculty;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
          Timetable Editor
        </motion.h1>
      </div>

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
            Select a {viewMode === 'division' ? 'division' : 'faculty member'} to view timetable
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto rounded-xl border border-border">
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
                  {days.map((day) => (
                    <td key={day + slot} className="px-1 py-1">
                      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground/30 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all">
                        <Plus className="h-4 w-4" />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground">
        Periods are created via the API (POST /admin/periods). This grid will display them once assigned.
        {viewMode === 'division' ? ' Showing division timetable.' : ` Showing faculty timetable.`}
      </p>
    </div>
  );
}
