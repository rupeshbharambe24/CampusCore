'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { ClipboardList, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import { useSemesters } from '@/lib/lookup-hooks';

interface ExamItem { id: string; name: string; exam_type: string; max_marks: number; is_published: boolean }
interface ScheduleItem { id: string; subject_id: string; exam_date: string; start_time: string; end_time: string; sections: string | null }

export default function ExamsPage() {
  const [semesterId, setSemesterId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [examType, setExamType] = useState('class_test');
  const [maxMarks, setMaxMarks] = useState(20);
  const qc = useQueryClient();
  const { data: semOpts, isLoading: semLoading } = useSemesters();

  const { data: exams, isLoading } = useQuery({
    queryKey: ['admin', 'exams', semesterId],
    queryFn: () => api.get<ExamItem[]>(`/admin/exams?semester_id=${semesterId}`),
    enabled: !!semesterId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { semester_id: string; name: string; exam_type: string; max_marks: number }) =>
      api.post('/admin/exams', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'exams'] }); setShowCreate(false); },
  });

  const publishMutation = useMutation({
    mutationFn: (examId: string) => api.post(`/admin/exams/${examId}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'exams'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <ClipboardList className="mr-2 inline-block h-6 w-6 text-primary" />
          Exam Management
        </motion.h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Create Exam
        </button>
      </div>

      {/* Semester selector */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Semester</label>
        <LookupSelect items={semOpts} isLoading={semLoading} value={semesterId} onChange={setSemesterId} placeholder="Select semester..." className="max-w-sm" />
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Create Exam</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Class Test 1" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select value={examType} onChange={(e) => setExamType(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="class_test">Class Test</option>
                <option value="mid_sem">Mid Semester</option>
                <option value="end_sem">End Semester</option>
                <option value="practical">Practical</option>
                <option value="viva">Viva</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Marks</label>
              <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => createMutation.mutate({ semester_id: semesterId, name, exam_type: examType, max_marks: maxMarks })} disabled={!semesterId || !name} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Create</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Exam list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : exams && exams.length > 0 ? (
        <StaggerList className="space-y-3">
          {exams.map((exam) => (
            <StaggerItem key={exam.id}>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
                <div>
                  <h3 className="font-semibold">{exam.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{exam.exam_type.replace('_', ' ')} · Max: {exam.max_marks} marks</p>
                </div>
                <div className="flex items-center gap-3">
                  {exam.is_published ? (
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">Published</span>
                  ) : (
                    <button
                      onClick={() => publishMutation.mutate(exam.id)}
                      className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      Publish Results
                    </button>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      ) : semesterId ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No exams created yet</p>
        </div>
      ) : null}
    </div>
  );
}
