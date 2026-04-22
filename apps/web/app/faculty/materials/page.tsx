'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { BookOpen, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Material {
  id: string; subject_id: string; title: string; description: string | null;
  material_type: string; url: string; topic: string | null; created_at: string;
}

const materialTypes = ['notes', 'ppt', 'pdf', 'video', 'drive_link', 'assignment', 'reference', 'other'];

export default function FacultyMaterialsPage() {
  const [showForm, setShowForm] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState('notes');
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const qc = useQueryClient();

  const { data: materials, isLoading } = useQuery({
    queryKey: ['faculty', 'materials'],
    queryFn: () => api.get<Material[]>('/faculty/materials'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { subject_id: string; title: string; description?: string; material_type: string; url: string; topic?: string }) =>
      api.post('/faculty/materials', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculty', 'materials'] }); setShowForm(false); setTitle(''); setUrl(''); setDescription(''); setTopic(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/faculty/materials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'materials'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <BookOpen className="mr-2 inline-block h-6 w-6 text-primary" />
          Study Materials
        </motion.h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Upload Material
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Upload Study Material</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject ID</label>
              <input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Subject UUID" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize">
                {materialTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unit 1 - Introduction to ML" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">URL (Google Drive link, PDF link, etc.)</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic (optional)</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Unit 1" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes for..." className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => createMutation.mutate({
                subject_id: subjectId, title, material_type: materialType, url,
                ...(description && { description }),
                ...(topic && { topic }),
              })}
              disabled={!subjectId || !title || !url}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Upload
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (materials ?? []).length > 0 ? (
        <StaggerList className="space-y-2">
          {(materials ?? []).map((mat) => (
            <StaggerItem key={mat.id}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{mat.title}</p>
                  {mat.description && <p className="text-sm text-muted-foreground truncate">{mat.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground capitalize">{mat.material_type.replace('_', ' ')} {mat.topic ? `· ${mat.topic}` : ''}</p>
                </div>
                <a href={mat.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-border p-2 hover:bg-accent">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => deleteMutation.mutate(mat.id)} className="shrink-0 rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No materials uploaded</p>
          <p className="text-sm text-muted-foreground/70">Click &quot;Upload Material&quot; to share notes with students</p>
        </div>
      )}
    </div>
  );
}
