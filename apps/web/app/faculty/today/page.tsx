'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Calendar, CheckSquare, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const roster = [
  { id: '1', roll: '22CS001', name: 'Aarav Patel', batch: 'B1' },
  { id: '2', roll: '22CS002', name: 'Aditi Sharma', batch: 'B1' },
  { id: '3', roll: '22CS003', name: 'Arjun Deshmukh', batch: 'B1' },
  { id: '4', roll: '22CS004', name: 'Bhavya Joshi', batch: 'B1' },
  { id: '5', roll: '22CS005', name: 'Diya Kulkarni', batch: 'B1' },
  { id: '6', roll: '22CS006', name: 'Gaurav Patil', batch: 'B1' },
  { id: '7', roll: '22CS007', name: 'Ishaan Reddy', batch: 'B1' },
  { id: '8', roll: '22CS008', name: 'Kavya Mehta', batch: 'B1' },
  { id: '9', roll: '22CS009', name: 'Manav Singh', batch: 'B1' },
  { id: '10', roll: '22CS010', name: 'Nisha Verma', batch: 'B1' },
  { id: '11', roll: '22CS011', name: 'Pranav Gupta', batch: 'B1' },
  { id: '12', roll: '22CS012', name: 'Riya Thakur', batch: 'B1' },
];

export default function TodayPage() {
  const [marks, setMarks] = useState<Record<string, 'present' | 'absent'>>(
    Object.fromEntries(roster.map((s) => [s.id, 'present'])),
  );
  const [submitted, setSubmitted] = useState(false);

  const toggleMark = (id: string) => {
    setMarks((prev) => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present',
    }));
  };

  const presentCount = Object.values(marks).filter((m) => m === 'present').length;
  const absentCount = Object.values(marks).filter((m) => m === 'absent').length;

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight"
      >
        <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
        Mark Attendance
      </motion.h1>

      {/* Class info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Data Structures &middot; CSE-B (Year 2)</h2>
            <p className="text-sm text-muted-foreground">10:00 - 10:50 &middot; LT-2 &middot; {roster.length} students</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-1 text-success font-medium">
              <UserCheck className="h-4 w-4" /> {presentCount}
            </span>
            <span className="flex items-center gap-1 text-destructive font-medium">
              <UserX className="h-4 w-4" /> {absentCount}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Tip */}
      <p className="text-sm text-muted-foreground">
        All students default to <strong className="text-success">present</strong>. Tap to mark <strong className="text-destructive">absent</strong>.
      </p>

      {/* Roster */}
      <StaggerList className="grid gap-2 sm:grid-cols-2">
        {roster.map((student) => {
          const isAbsent = marks[student.id] === 'absent';
          return (
            <StaggerItem key={student.id}>
              <motion.button
                type="button"
                onClick={() => !submitted && toggleMark(student.id)}
                whileTap={!submitted ? { scale: 0.97 } : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  isAbsent
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-success/40 bg-success/5',
                  submitted && 'opacity-70 cursor-default',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    isAbsent ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success',
                  )}
                >
                  {isAbsent ? 'A' : 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.roll}</p>
                </div>
                {isAbsent ? (
                  <UserX className="h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <UserCheck className="h-4 w-4 shrink-0 text-success" />
                )}
              </motion.button>
            </StaggerItem>
          );
        })}
      </StaggerList>

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="sticky bottom-4 flex justify-center"
      >
        {submitted ? (
          <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/30 px-6 py-3 text-success font-medium shadow-lg">
            <CheckSquare className="h-5 w-5" />
            Attendance submitted successfully
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSubmitted(true)}
            className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
          >
            Submit Attendance ({presentCount} present, {absentCount} absent)
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
