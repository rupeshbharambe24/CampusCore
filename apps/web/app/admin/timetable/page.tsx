'use client';

import { motion } from '@/components/motion';
import { Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const slots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'];

const grid: Record<string, Record<string, { subject: string; faculty: string; room: string; type: string } | null>> = {
  Mon: { '09:00': { subject: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' }, '10:00': { subject: 'EC302', faculty: 'Prof. Patel', room: 'LT-3', type: 'lecture' }, '11:00': { subject: 'MA303', faculty: 'Dr. Gupta', room: 'LT-1', type: 'lecture' }, '12:00': null, '14:00': { subject: 'CS391', faculty: 'Dr. Sharma', room: 'Lab-201', type: 'lab' }, '15:00': { subject: 'CS391', faculty: 'Dr. Sharma', room: 'Lab-201', type: 'lab' } },
  Tue: { '09:00': { subject: 'MA303', faculty: 'Dr. Gupta', room: 'LT-2', type: 'lecture' }, '10:00': { subject: 'APT301', faculty: 'Prof. Singh', room: 'LT-5', type: 'aptitude' }, '11:00': { subject: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' }, '12:00': null, '14:00': null, '15:00': null },
  Wed: { '09:00': { subject: 'EC302', faculty: 'Prof. Patel', room: 'LT-3', type: 'lecture' }, '10:00': { subject: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' }, '11:00': null, '12:00': null, '14:00': { subject: 'EC392', faculty: 'Prof. Patel', room: 'Lab-105', type: 'lab' }, '15:00': { subject: 'EC392', faculty: 'Prof. Patel', room: 'Lab-105', type: 'lab' } },
  Thu: { '09:00': { subject: 'MA303', faculty: 'Dr. Gupta', room: 'LT-1', type: 'lecture' }, '10:00': { subject: 'EC302', faculty: 'Prof. Patel', room: 'LT-3', type: 'lecture' }, '11:00': { subject: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' }, '12:00': null, '14:00': null, '15:00': null },
  Fri: { '09:00': { subject: 'APT301', faculty: 'Prof. Singh', room: 'LT-5', type: 'aptitude' }, '10:00': { subject: 'MA303', faculty: 'Dr. Gupta', room: 'LT-2', type: 'lecture' }, '11:00': null, '12:00': null, '14:00': { subject: 'CS391', faculty: 'Dr. Sharma', room: 'Lab-201', type: 'lab' }, '15:00': { subject: 'CS391', faculty: 'Dr. Sharma', room: 'Lab-201', type: 'lab' } },
  Sat: { '09:00': null, '10:00': null, '11:00': null, '12:00': null, '14:00': null, '15:00': null },
};

const typeColors: Record<string, string> = {
  lecture: 'bg-primary/10 border-primary/30 text-primary',
  lab: 'bg-info/10 border-info/30 text-info',
  aptitude: 'bg-warning/10 border-warning/30 text-warning',
};

export default function TimetableEditorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
          Timetable Editor
        </motion.h1>
        <div className="flex gap-2">
          <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option>CSE-A (Year 2)</option>
            <option>CSE-B (Year 2)</option>
            <option>CSE-C (Year 2)</option>
            <option>MECH-A (Year 2)</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-x-auto rounded-xl border border-border"
      >
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-20 px-3 py-3 text-left font-semibold text-muted-foreground">Time</th>
              {days.map((day) => (
                <th key={day} className="px-2 py-3 text-center font-semibold text-muted-foreground">
                  {day}
                </th>
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
                          className={cn(
                            'rounded-lg border p-2 text-xs cursor-pointer transition-all hover:shadow-md',
                            typeColors[cell.type] ?? typeColors.lecture,
                          )}
                        >
                          <p className="font-bold">{cell.subject}</p>
                          <p className="opacity-70">{cell.faculty}</p>
                          <p className="opacity-50">{cell.room}</p>
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
        Click a cell to assign or edit a period. Empty cells can be filled by clicking the + icon.
      </p>
    </div>
  );
}
