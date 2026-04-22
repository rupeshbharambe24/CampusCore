'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { GraduationCap, Plus, Trash2, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import { useDepartments } from '@/lib/lookup-hooks';

interface DivisionItem { id: string; batch_id: string; department_id: string; department_code: string; name: string; display_name: string; lab_batch_count: number; student_count: number }
interface BatchItem { id: string; admission_year: number; graduation_year: number; current_year: number; year_label: string; label: string; divisions: DivisionItem[]; student_count: number }

const yearColors: Record<number, string> = {
  1: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  2: 'from-primary/20 to-primary/10 border-primary/30',
  3: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  4: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
};

export default function BatchManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [admissionYear, setAdmissionYear] = useState(new Date().getFullYear());
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [showAddDiv, setShowAddDiv] = useState<string | null>(null);
  const [divDeptId, setDivDeptId] = useState('');
  const [divNames, setDivNames] = useState('A, B');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: deptOpts, isLoading: deptLoading } = useDepartments();
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get<BatchItem[]>('/batches'),
  });

  const createBatch = useMutation({
    mutationFn: (data: { admission_year: number }) => api.post('/batches', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setShowCreate(false); },
    onError: (err: Error) => { const m = err.message.match(/"detail"\s*:\s*"([^"]+)"/); setDeleteError(m ? m[1]! : err.message); setTimeout(() => setDeleteError(null), 5000); },
  });

  const createDivisions = useMutation({
    mutationFn: (data: { batch_id: string; department_id: string; division_names: string[]; lab_batch_count: number }) => api.post('/batches/divisions', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setShowAddDiv(null); setDivNames('A, B'); },
  });

  const deleteBatch = useMutation({
    mutationFn: (id: string) => api.delete(`/batches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });

  const deleteDiv = useMutation({
    mutationFn: (id: string) => api.delete(`/batches/divisions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <GraduationCap className="mr-2 inline-block h-6 w-6 text-primary" />
          Batch Management
        </motion.h1>
        <div className="flex gap-2">
          <Link href={'/admin/batches/promote' as '/'} className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-2 text-sm font-medium text-success hover:bg-success/10">
            <ChevronRight className="h-4 w-4" /> Promote Batch
          </Link>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> New Batch
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        A batch = students admitted in the same year. The system auto-calculates which year they&apos;re currently in.
      </p>

      {deleteError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{deleteError}</div>
      )}

      {/* Create batch */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Create New Batch</h2>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Admission Year</label>
              <input type="number" value={admissionYear} onChange={(e) => setAdmissionYear(Number(e.target.value))} min={2020} max={2035} className="flex h-10 w-32 rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="text-sm text-muted-foreground pb-2">
              → Graduates in <strong>{admissionYear + 4}</strong>
            </div>
            <button onClick={() => createBatch.mutate({ admission_year: admissionYear })} disabled={createBatch.isPending} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {createBatch.isPending ? 'Creating...' : 'Create Batch'}
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Batch cards */}
      {(batches ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No batches created</p>
          <p className="text-sm text-muted-foreground/70">Click &quot;New Batch&quot; to create one (e.g., admission year 2024)</p>
        </div>
      ) : (
        <StaggerList className="space-y-4">
          {(batches ?? []).map((batch, i) => {
            const isExpanded = expandedBatch === batch.id;
            const color = yearColors[batch.current_year] ?? yearColors[1]!;
            return (
              <StaggerItem key={batch.id}>
                <div className={cn('rounded-xl border bg-gradient-to-r shadow-sm transition-all', color)}>
                  {/* Batch header */}
                  <button
                    type="button"
                    onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <div>
                      <h2 className="text-xl font-bold">{batch.label}</h2>
                      <p className="text-sm text-muted-foreground">
                        Admitted {batch.admission_year} · Graduates {batch.graduation_year} · {batch.student_count} students · {batch.divisions.length} divisions
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-background/80 px-3 py-1 text-sm font-semibold">{batch.year_label}</span>
                      <ChevronRight className={cn('h-5 w-5 transition-transform', isExpanded && 'rotate-90')} />
                    </div>
                  </button>

                  {/* Expanded: divisions */}
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-border/50 p-5 space-y-3">
                      {batch.divisions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No divisions yet. Add divisions below.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {batch.divisions.map((div) => (
                            <div key={div.id} className="flex items-center justify-between rounded-lg border border-border bg-background/80 p-3">
                              <div>
                                <p className="font-medium">{div.display_name}</p>
                                <p className="text-xs text-muted-foreground">{div.lab_batch_count} lab batches · {div.student_count} students</p>
                              </div>
                              <button onClick={() => deleteDiv.mutate(div.id)} className="rounded-md p-1 text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add divisions form */}
                      {showAddDiv === batch.id ? (
                        <div className="rounded-lg border border-border bg-background/80 p-4 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs font-medium">Department</label>
                              <LookupSelect items={deptOpts} isLoading={deptLoading} value={divDeptId} onChange={setDivDeptId} placeholder="Select department..." />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium">Division Names (comma separated)</label>
                              <input value={divNames} onChange={(e) => setDivNames(e.target.value)} placeholder="A, B, C" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => createDivisions.mutate({
                                batch_id: batch.id,
                                department_id: divDeptId,
                                division_names: divNames.split(',').map((s) => s.trim()).filter(Boolean),
                                lab_batch_count: 3,
                              })}
                              disabled={!divDeptId || !divNames}
                              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                            >
                              Add Divisions
                            </button>
                            <button onClick={() => setShowAddDiv(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setShowAddDiv(batch.id); setDivDeptId(''); }} className="flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm font-medium hover:bg-accent">
                            <Plus className="h-3.5 w-3.5" /> Add Divisions
                          </button>
                          <button onClick={() => deleteBatch.mutate(batch.id)} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Batch
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}
