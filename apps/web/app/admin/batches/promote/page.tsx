'use client';

import { motion } from '@/components/motion';
import { ArrowRight, ArrowLeft, GraduationCap, AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LookupSelect } from '@/components/lookup-select';
import { useBatches } from '@/lib/lookup-hooks';
import Link from 'next/link';

interface PreviewData {
  batch_id: string; batch_label: string; current_semester: number; next_semester: number;
  current_year: number; next_year: number; student_count: number; detained_count: number; action: string;
}

interface PromotionResult {
  success: boolean; message: string; students_promoted: number; students_detained: number; students_graduated: number;
}

const YEAR_LABELS: Record<number, string> = { 1: 'FY', 2: 'SY', 3: 'TY', 4: 'Final Year' };

export default function PromotePage() {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [result, setResult] = useState<PromotionResult | null>(null);
  const qc = useQueryClient();

  const { data: batchOpts, isLoading: batchLoading } = useBatches();

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['promotion', 'preview', selectedBatch],
    queryFn: () => api.get<PreviewData>(`/promotion/preview/${selectedBatch}`),
    enabled: !!selectedBatch,
    retry: false,
  });

  const executeMutation = useMutation({
    mutationFn: (batchId: string) => api.post<PromotionResult>(`/promotion/execute/${batchId}`, { detained_student_ids: [] }),
    onSuccess: (data) => { setResult(data); qc.invalidateQueries({ queryKey: ['batches'] }); },
  });

  if (result) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-16">
          <CheckCircle2 className="h-16 w-16 text-success" />
          <h1 className="text-2xl font-bold">Promotion Complete</h1>
          <p className="text-center text-muted-foreground max-w-md">{result.message}</p>
          <div className="flex gap-6 text-center">
            {result.students_promoted > 0 && (
              <div><p className="text-3xl font-bold text-success">{result.students_promoted}</p><p className="text-xs text-muted-foreground">Promoted</p></div>
            )}
            {result.students_detained > 0 && (
              <div><p className="text-3xl font-bold text-warning">{result.students_detained}</p><p className="text-xs text-muted-foreground">Detained</p></div>
            )}
            {result.students_graduated > 0 && (
              <div><p className="text-3xl font-bold text-primary">{result.students_graduated}</p><p className="text-xs text-muted-foreground">Graduated</p></div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setResult(null); setSelectedBatch(''); }} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Promote Another</button>
            <Link href={'/admin/batches' as '/'} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Back to Batches</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/batches" className="rounded-lg p-1.5 hover:bg-accent"><ArrowLeft className="h-5 w-5" /></Link>
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <ArrowRight className="mr-2 inline-block h-6 w-6 text-primary" />
          Semester / Year Promotion
        </motion.h1>
      </div>

      {/* Select batch */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Batch to Promote</label>
        <LookupSelect items={batchOpts} isLoading={batchLoading} value={selectedBatch} onChange={setSelectedBatch} placeholder="Select a batch..." className="max-w-md" />
      </div>

      {/* Preview */}
      {previewLoading && selectedBatch && (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}

      {preview && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Current state */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Current State</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">Batch</p>
                <p className="text-lg font-bold">{preview.batch_label}</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">Students</p>
                <p className="text-lg font-bold">{preview.student_count}</p>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">Currently Detained</p>
                <p className={cn('text-lg font-bold', preview.detained_count > 0 ? 'text-warning' : 'text-success')}>{preview.detained_count}</p>
              </div>
            </div>
          </div>

          {/* What will happen */}
          <div className={cn(
            'rounded-xl border p-6',
            preview.action === 'graduate' ? 'border-primary/30 bg-primary/5' :
            preview.action === 'next_year' ? 'border-warning/30 bg-warning/5' :
            'border-success/30 bg-success/5',
          )}>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              {preview.action === 'graduate' && <><GraduationCap className="h-5 w-5 text-primary" /> Graduation</>}
              {preview.action === 'next_year' && <><ArrowRight className="h-5 w-5 text-warning" /> Year-End Promotion</>}
              {preview.action === 'next_semester' && <><ArrowRight className="h-5 w-5 text-success" /> Semester Promotion</>}
            </h2>

            <div className="flex items-center gap-4 text-sm">
              <div className="rounded-lg bg-background/80 px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="font-bold">{YEAR_LABELS[preview.current_year]} · Sem {preview.current_semester}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="rounded-lg bg-background/80 px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">After Promotion</p>
                <p className="font-bold">
                  {preview.action === 'graduate' ? 'Graduated' : `${YEAR_LABELS[preview.next_year]} · Sem ${preview.next_semester}`}
                </p>
              </div>
            </div>

            {preview.action === 'graduate' && (
              <p className="mt-3 text-sm text-muted-foreground">
                All non-detained students will be marked as graduated. This cannot be undone.
              </p>
            )}

            {preview.action === 'next_year' && (
              <p className="mt-3 text-sm text-muted-foreground">
                Students move from {YEAR_LABELS[preview.current_year]} to {YEAR_LABELS[preview.next_year]}.
                Detained students remain in the current year.
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Before promoting:</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• Ensure all exam results are entered and published</li>
                <li>• Ensure attendance records are finalized</li>
                <li>• Mark detained students before promoting (can be done later too)</li>
                <li>• This action sends notifications to all students in the batch</li>
              </ul>
            </div>
          </div>

          {/* Execute button */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => executeMutation.mutate(preview.batch_id)}
              disabled={executeMutation.isPending}
              className={cn(
                'flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold shadow-lg transition-colors',
                preview.action === 'graduate'
                  ? 'bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90'
                  : 'bg-success text-white shadow-success/25 hover:bg-success/90',
                executeMutation.isPending && 'opacity-50',
              )}
            >
              {executeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : preview.action === 'graduate' ? (
                <><GraduationCap className="h-4 w-4" /> Graduate Batch</>
              ) : (
                <><ArrowRight className="h-4 w-4" /> Promote to Sem {preview.next_semester}</>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
