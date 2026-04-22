'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { FileCheck, Plus, Loader2, Users } from 'lucide-react';
import { useState } from 'react';
import { LookupSelect } from '@/components/lookup-select';
import { useSubjects } from '@/lib/lookup-hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

interface AssignmentItem { id: string; title: string; assignment_type: string; due_date: string | null; max_marks: number | null; created_at: string }

const assignmentTypes = ['assignment', 'practical', 'lab_journal', 'project', 'other'];

export default function FacultyAssignmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('assignment');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState(10);
  const qc = useQueryClient();
  const { data: subjectOpts, isLoading: subjLoading } = useSubjects();

  const { data, isLoading } = useQuery({
    queryKey: ['faculty', 'assignments'],
    queryFn: () => api.get<AssignmentItem[]>('/faculty/assignments'),
  });

  const createMutation = useMutation({
    mutationFn: (d: { subject_id: string; title: string; assignment_type: string; due_date?: string; max_marks?: number }) =>
      api.post('/faculty/assignments', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculty', 'assignments'] }); setShowForm(false); setTitle(''); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <FileCheck className="mr-2 inline-block h-6 w-6 text-primary" />
          Assignments
        </motion.h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Create Assignment
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <LookupSelect items={subjectOpts} isLoading={subjLoading} value={subjectId} onChange={setSubjectId} placeholder="Select subject..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize">
                {assignmentTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment 1 - Linked Lists" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Marks</label>
              <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => createMutation.mutate({ subject_id: subjectId, title, assignment_type: type, ...(dueDate && { due_date: dueDate }), max_marks: maxMarks })}
              disabled={!subjectId || !title}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >Create</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (data ?? []).length > 0 ? (
        <StaggerList className="space-y-3">
          {(data ?? []).map((a) => (
            <StaggerItem key={a.id}>
              <Link href={`/faculty/assignments/${a.id}` as '/'}>
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{a.assignment_type.replace('_', ' ')} {a.due_date ? `· Due: ${a.due_date}` : ''} {a.max_marks ? `· ${a.max_marks} marks` : ''}</p>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <FileCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No assignments created</p>
        </div>
      )}
    </div>
  );
}
