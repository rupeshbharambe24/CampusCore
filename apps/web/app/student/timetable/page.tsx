'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const timetableData: Record<string, { time: string; subject: string; code: string; faculty: string; room: string; type: string }[]> = {
  Mon: [
    { time: '09:00', subject: 'Data Structures', code: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' },
    { time: '10:00', subject: 'Digital Electronics', code: 'EC302', faculty: 'Prof. Patel', room: 'LT-3', type: 'lecture' },
    { time: '11:00', subject: 'Mathematics III', code: 'MA303', faculty: 'Dr. Gupta', room: 'LT-1', type: 'lecture' },
    { time: '14:00', subject: 'DS Lab', code: 'CS391', faculty: 'Dr. Sharma', room: 'Lab-201', type: 'lab' },
  ],
  Tue: [
    { time: '09:00', subject: 'Mathematics III', code: 'MA303', faculty: 'Dr. Gupta', room: 'LT-2', type: 'lecture' },
    { time: '10:00', subject: 'Aptitude', code: 'APT301', faculty: 'Prof. Singh', room: 'LT-5', type: 'aptitude' },
    { time: '11:00', subject: 'Data Structures', code: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' },
  ],
  Wed: [
    { time: '09:00', subject: 'Digital Electronics', code: 'EC302', faculty: 'Prof. Patel', room: 'LT-3', type: 'lecture' },
    { time: '10:00', subject: 'Data Structures', code: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' },
    { time: '14:00', subject: 'DE Lab', code: 'EC392', faculty: 'Prof. Patel', room: 'Lab-105', type: 'lab' },
  ],
  Thu: [
    { time: '09:00', subject: 'Mathematics III', code: 'MA303', faculty: 'Dr. Gupta', room: 'LT-1', type: 'lecture' },
    { time: '10:00', subject: 'Digital Electronics', code: 'EC302', faculty: 'Prof. Patel', room: 'LT-3', type: 'lecture' },
    { time: '11:00', subject: 'Data Structures', code: 'CS301', faculty: 'Dr. Sharma', room: 'LT-1', type: 'lecture' },
  ],
  Fri: [
    { time: '09:00', subject: 'Aptitude', code: 'APT301', faculty: 'Prof. Singh', room: 'LT-5', type: 'aptitude' },
    { time: '10:00', subject: 'Mathematics III', code: 'MA303', faculty: 'Dr. Gupta', room: 'LT-2', type: 'lecture' },
    { time: '14:00', subject: 'DS Lab', code: 'CS391', faculty: 'Dr. Sharma', room: 'Lab-201', type: 'lab' },
  ],
  Sat: [],
};

const typeColors: Record<string, string> = {
  lecture: 'border-l-primary',
  lab: 'border-l-info',
  tutorial: 'border-l-success',
  aptitude: 'border-l-warning',
};

export default function TimetablePage() {
  const today = new Date().getDay(); // 0=Sun, 1=Mon
  const todayIdx = today === 0 ? 5 : today - 1; // Map to our 0=Mon index
  const [selectedDay, setSelectedDay] = useState(todayIdx);

  const dayName = days[selectedDay] ?? 'Mon';
  const classes = timetableData[dayName] ?? [];

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight"
      >
        <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
        Weekly Timetable
      </motion.h1>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day, i) => (
          <motion.button
            key={day}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedDay(i)}
            className={cn(
              'relative rounded-xl px-5 py-2.5 text-sm font-medium transition-all',
              selectedDay === i
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-card border border-border text-muted-foreground hover:bg-accent',
              i === todayIdx && selectedDay !== i && 'ring-2 ring-primary/30',
            )}
          >
            {day}
            {i === todayIdx && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Classes */}
      {classes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-border bg-card p-12 text-center"
        >
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No classes</p>
          <p className="text-sm text-muted-foreground/70">Enjoy your day off!</p>
        </motion.div>
      ) : (
        <StaggerList className="space-y-3">
          {classes.map((cls) => (
            <StaggerItem key={cls.time + cls.code}>
              <div
                className={cn(
                  'rounded-xl border border-border bg-card p-4 border-l-4 transition-all hover:shadow-md',
                  typeColors[cls.type] ?? 'border-l-primary',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{cls.subject}</h3>
                    <p className="text-sm text-muted-foreground">{cls.code}</p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                      cls.type === 'lab'
                        ? 'bg-info/10 text-info'
                        : cls.type === 'aptitude'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-primary/10 text-primary',
                    )}
                  >
                    {cls.type}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {cls.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {cls.faculty}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {cls.room}
                  </span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-primary" /> Lecture
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-info" /> Lab
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-warning" /> Aptitude
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-success" /> Tutorial
        </span>
      </div>
    </div>
  );
}
