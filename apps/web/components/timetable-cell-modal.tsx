'use client';

import { motion } from '@/components/motion';
import { X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import type { LookupItem } from '@/lib/lookup-hooks';

interface TimetableOption {
  subject_id: string; subject_code: string; subject_name: string; kind: string;
  faculty_id: string | null; faculty_name: string | null; lab_batch: string | null;
}

export function TimetableCellModal({
  divisionId,
  day,
  slot,
  semesterId,
  sectionId,
  onClose,
}: {
  divisionId: string;
  day: number;
  slot: string;
  semesterId: string;
  sectionId: string;
  onClose: () => void;
}) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  // Get subject+faculty options for this division
  const { data: options, isLoading } = useQuery({
    queryKey: ['timetable-options', divisionId],
    queryFn: () => api.get<TimetableOption[]>(`/divisions/${divisionId}/timetable-options`),
  });

  // Get rooms
  const { data: roomData } = useQuery({
    queryKey: ['admin', 'rooms'],
    queryFn: () => api.get<{ items: { id: string; name: string; building: string }[] }>('/admin/rooms?page=1&size=100'),
  });
  const roomOpts: LookupItem[] = (roomData?.items ?? []).map((r) => ({ id: r.id, label: `${r.building}${r.name}`, extra: null }));

  // Get timetable slots to find the slot UUID
  const { data: slotsData } = useQuery({
    queryKey: ['admin', 'timetable-slots'],
    queryFn: () => api.get<{ items: { id: string; day_of_week: number; start_time: string }[] }>('/admin/timetable-slots?page=1&size=100'),
  });

  const selectedOption = options?.find((o) => o.subject_id === selectedSubject);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const createPeriod = useMutation({
    mutationFn: async () => {
      if (!selectedOption) throw new Error('Select a subject');
      if (!selectedOption.faculty_id) throw new Error('No faculty assigned for this subject. Go to division faculty assignments first.');

      // Find matching timetable slot
      const matchingSlot = slotsData?.items?.find((s) => s.day_of_week === day && s.start_time === slot);
      if (!matchingSlot) throw new Error(`No timetable slot found for ${dayNames[day]} ${slot}. Create slots in Academic Setup → Timetable Slots.`);

      const today = new Date().toISOString().split('T')[0];
      return api.post('/admin/periods', {
        semester_id: semesterId,
        section_id: sectionId,
        timetable_slot_id: matchingSlot.id,
        subject_id: selectedOption.subject_id,
        faculty_id: selectedOption.faculty_id,
        room_id: selectedRoom || null,
        period_type: selectedOption.kind,
        lab_batch: selectedOption.lab_batch,
        is_elective_bundle: false,
        valid_from: today,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timetable'] }); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  // Convert options to dropdown items
  const subjectOpts: LookupItem[] = (options ?? []).map((o) => ({
    id: o.subject_id,
    label: `${o.subject_code} — ${o.subject_name}${o.lab_batch ? ` (${o.lab_batch})` : ''}${o.faculty_name ? ` → ${o.faculty_name}` : ' (no faculty)'}`,
    extra: o.kind,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Period — {dayNames[day]} {slot}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : subjectOpts.length === 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
            No subjects with faculty assignments found for this division. Complete Step 1 (assign subjects) and Step 2 (assign faculty) first.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject (with assigned faculty)</label>
              <LookupSelect items={subjectOpts} isLoading={false} value={selectedSubject} onChange={setSelectedSubject} placeholder="Select subject..." />
            </div>

            {selectedOption && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                <p><strong>Subject:</strong> {selectedOption.subject_code} — {selectedOption.subject_name}</p>
                <p><strong>Faculty:</strong> {selectedOption.faculty_name ?? 'Not assigned'}</p>
                <p><strong>Type:</strong> <span className="capitalize">{selectedOption.kind}</span></p>
                {selectedOption.lab_batch && <p><strong>Lab Batch:</strong> {selectedOption.lab_batch}</p>}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Room (optional)</label>
              <LookupSelect items={roomOpts} isLoading={false} value={selectedRoom} onChange={setSelectedRoom} placeholder="Select room..." />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setError(null); createPeriod.mutate(); }}
                disabled={!selectedSubject || createPeriod.isPending}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createPeriod.isPending ? 'Creating...' : 'Create Period'}
              </button>
              <button onClick={onClose} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
