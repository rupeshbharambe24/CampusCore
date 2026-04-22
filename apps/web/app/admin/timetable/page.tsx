'use client';

import { motion } from '@/components/motion';
import { Calendar, Plus, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { LookupSelect } from '@/components/lookup-select';
import { useDivisions } from '@/lib/lookup-hooks';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// College timing: 10:00 AM to 5:00 PM, lunch 1:00-1:30
const slots = ['10:00', '11:00', '12:00', '13:30', '14:30', '15:30', '16:30'];

// Demo grid data (AI&DS dept)
const sectionGrid: Record<string, Record<string, { subject: string; faculty: string; room: string; type: string } | null>> = {
  Mon: { '10:00': { subject: 'AI301', faculty: 'Dr. Zanwar', room: 'LT-101', type: 'lecture' }, '11:00': { subject: 'AI302', faculty: 'Dr. Mehta', room: 'LT-102', type: 'lecture' }, '12:00': { subject: 'MA305', faculty: 'Prof. Deshmukh', room: 'LT-101', type: 'lecture' }, '13:30': null, '14:30': { subject: 'AI391', faculty: 'Dr. Kavita', room: 'AI Lab-201', type: 'lab' }, '15:30': { subject: 'AI391', faculty: 'Dr. Kavita', room: 'AI Lab-201', type: 'lab' }, '16:30': null },
  Tue: { '10:00': { subject: 'AI303', faculty: 'Prof. Kulkarni', room: 'LT-101', type: 'lecture' }, '11:00': { subject: 'DS304', faculty: 'Dr. Patil', room: 'LT-102', type: 'lecture' }, '12:00': { subject: 'AI301', faculty: 'Dr. Zanwar', room: 'LT-101', type: 'lecture' }, '13:30': { subject: 'APT301', faculty: 'Prof. Kulkarni', room: 'LT-5', type: 'aptitude' }, '14:30': null, '15:30': null, '16:30': null },
  Wed: { '10:00': { subject: 'MA305', faculty: 'Prof. Deshmukh', room: 'LT-101', type: 'lecture' }, '11:00': { subject: 'AI302', faculty: 'Dr. Mehta', room: 'LT-102', type: 'lecture' }, '12:00': { subject: 'AI303', faculty: 'Prof. Kulkarni', room: 'LT-101', type: 'lecture' }, '13:30': null, '14:30': { subject: 'AI392', faculty: 'Dr. Kavita', room: 'AI Lab-202', type: 'lab' }, '15:30': { subject: 'AI392', faculty: 'Dr. Kavita', room: 'AI Lab-202', type: 'lab' }, '16:30': null },
  Thu: { '10:00': { subject: 'DS304', faculty: 'Dr. Patil', room: 'LT-102', type: 'lecture' }, '11:00': { subject: 'AI301', faculty: 'Dr. Zanwar', room: 'LT-101', type: 'lecture' }, '12:00': { subject: 'AI302', faculty: 'Dr. Mehta', room: 'LT-102', type: 'lecture' }, '13:30': { subject: 'MA305', faculty: 'Prof. Deshmukh', room: 'LT-101', type: 'lecture' }, '14:30': null, '15:30': null, '16:30': null },
  Fri: { '10:00': { subject: 'APT301', faculty: 'Prof. Kulkarni', room: 'LT-5', type: 'aptitude' }, '11:00': { subject: 'AI303', faculty: 'Prof. Kulkarni', room: 'LT-101', type: 'lecture' }, '12:00': { subject: 'DS304', faculty: 'Dr. Patil', room: 'LT-102', type: 'lecture' }, '13:30': null, '14:30': { subject: 'AI391', faculty: 'Dr. Kavita', room: 'AI Lab-201', type: 'lab' }, '15:30': { subject: 'AI391', faculty: 'Dr. Kavita', room: 'AI Lab-201', type: 'lab' }, '16:30': null },
  Sat: { '10:00': null, '11:00': null, '12:00': null, '13:30': null, '14:30': null, '15:30': null, '16:30': null },
};

// Derive faculty view from section grid
function buildFacultyGrid(grid: typeof sectionGrid, facultyName: string) {
  const result: typeof sectionGrid = {};
  for (const day of days) {
    result[day] = {};
    for (const slot of slots) {
      const cell = grid[day]?.[slot];
      result[day]![slot] = cell?.faculty === facultyName ? cell : null;
    }
  }
  return result;
}

const faculties = ['Dr. Sharma', 'Prof. Patel', 'Dr. Gupta', 'Prof. Singh'];

const typeColors: Record<string, string> = {
  lecture: 'bg-primary/10 border-primary/30 text-primary',
  lab: 'bg-info/10 border-info/30 text-info',
  aptitude: 'bg-warning/10 border-warning/30 text-warning',
};

export default function TimetableEditorPage() {
  const [viewMode, setViewMode] = useState<'section' | 'faculty'>('section');
  const [selectedFaculty, setSelectedFaculty] = useState(faculties[0]!);
  const [selectedDivision, setSelectedDivision] = useState('');
  const { data: divisionOpts, isLoading: divLoading } = useDivisions();

  const grid = viewMode === 'faculty' ? buildFacultyGrid(sectionGrid, selectedFaculty) : sectionGrid;

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
          <button
            onClick={() => setViewMode('section')}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all', viewMode === 'section' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> By Division
          </button>
          <button
            onClick={() => setViewMode('faculty')}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all', viewMode === 'faculty' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            <Users className="h-3.5 w-3.5" /> By Faculty
          </button>
        </div>

        {viewMode === 'section' && (
          <LookupSelect items={divisionOpts} isLoading={divLoading} value={selectedDivision} onChange={setSelectedDivision} placeholder="Select division..." className="w-64" />
        )}

        {viewMode === 'faculty' && (
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {faculties.map((f) => <option key={f}>{f}</option>)}
          </select>
        )}
      </div>

      {/* Grid */}
      <motion.div key={`${viewMode}-${selectedFaculty}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto rounded-xl border border-border">
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
            {slots.map((slot, si) => (
              <tr key={slot} className="border-b last:border-0">
                <td className="px-3 py-2 text-xs font-medium text-muted-foreground">{slot}</td>
                {days.map((day) => {
                  const cell = grid[day]?.[slot];
                  return (
                    <td key={day + slot} className="px-1 py-1">
                      {cell ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: si * 0.02 }}
                          className={cn('rounded-lg border p-2 text-xs cursor-pointer transition-all hover:shadow-md', typeColors[cell.type] ?? typeColors.lecture)}
                        >
                          <p className="font-bold">{cell.subject}</p>
                          <p className="opacity-70">{viewMode === 'section' ? cell.faculty : cell.room}</p>
                          <p className="opacity-50">{viewMode === 'section' ? cell.room : ''}</p>
                        </motion.div>
                      ) : (
                        <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground/30 hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all">
                          <Plus className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <p className="text-xs text-muted-foreground">
        {viewMode === 'section'
          ? 'Showing division timetable. Click a cell to assign or edit a period.'
          : `Showing ${selectedFaculty}'s timetable across all sections. Empty slots are free.`}
      </p>
    </div>
  );
}
