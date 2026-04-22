'use client';

import { motion } from '@/components/motion';
import { Upload, FileText, CheckCircle2, AlertTriangle, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import Link from 'next/link';

type ImportStage = 'upload' | 'preview' | 'importing' | 'done';

interface PreviewResult {
  total: number;
  valid: number;
  errors: { row: number; field: string; message: string }[];
  duplicates: number;
  sample: Record<string, string>[];
}

// Simulated preview for demo — in production, this POSTs to /admin/users/import-students
function parseCSV(text: string): PreviewResult {
  const lines = text.trim().split('\n');
  const headers = lines[0]?.split(',').map((h) => h.trim()) ?? [];
  const rows = lines.slice(1);
  const errors: PreviewResult['errors'] = [];
  const sample: Record<string, string>[] = [];

  rows.forEach((line, i) => {
    const cells = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? '';
    });
    if (!row['email']?.includes('@')) {
      errors.push({ row: i + 2, field: 'email', message: 'Invalid email format' });
    }
    if (!row['full_name'] || row['full_name'].length < 2) {
      errors.push({ row: i + 2, field: 'full_name', message: 'Name too short' });
    }
    if (sample.length < 5) sample.push(row);
  });

  return {
    total: rows.length,
    valid: rows.length - errors.length,
    errors: errors.slice(0, 20),
    duplicates: 0,
    sample,
  };
}

export default function ImportPage() {
  const [stage, setStage] = useState<ImportStage>('upload');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importType, setImportType] = useState<'students' | 'faculty'>('students');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      setPreview(result);
      setStage('preview');
    };
    reader.readAsText(file);
  }

  function handleConfirm() {
    setStage('importing');
    // Simulate import delay
    setTimeout(() => setStage('done'), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="rounded-lg p-1.5 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          <Upload className="mr-2 inline-block h-6 w-6 text-primary" />
          Bulk Import Users
        </motion.h1>
      </div>

      {/* Type selector */}
      {stage === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex gap-2">
            {(['students', 'faculty'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setImportType(t)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all',
                  importType === t
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'bg-card border border-border hover:bg-accent',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card p-12 transition-all hover:border-primary/50 hover:bg-primary/5"
          >
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium">Click to upload CSV file</p>
            <p className="text-xs text-muted-foreground">
              Required columns: email, full_name, {importType === 'students' ? 'roll_number, branch_code, admission_year' : 'employee_id, department_code, designation'}
            </p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="text-sm font-semibold mb-2">CSV Template</h3>
            <code className="text-xs text-muted-foreground">
              {importType === 'students'
                ? 'email,full_name,roll_number,branch_code,admission_year\nstudent@college.edu,Aarav Patel,22CS001,CSE,2022'
                : 'email,full_name,employee_id,department_code,designation\nfaculty@college.edu,Dr. Sharma,F001,CSE,Professor'}
            </code>
          </div>
        </motion.div>
      )}

      {/* Preview */}
      {stage === 'preview' && preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{preview.total}</p>
              <p className="text-xs text-muted-foreground">Total rows</p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
              <p className="text-2xl font-bold text-success">{preview.valid}</p>
              <p className="text-xs text-muted-foreground">Valid</p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{preview.errors.length}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" /> Errors found
              </h3>
              <ul className="mt-2 space-y-1">
                {preview.errors.map((err, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    Row {err.row}: <strong>{err.field}</strong> — {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.sample.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {Object.keys(preview.sample[0]!).map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-3 py-2 text-xs text-muted-foreground">Showing first {preview.sample.length} of {preview.total} rows</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Confirm Import ({preview.valid} users)
            </button>
            <button
              onClick={() => { setStage('upload'); setPreview(null); }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Importing */}
      {stage === 'importing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium">Importing users...</p>
          <p className="text-sm text-muted-foreground">Creating accounts and generating temporary passwords</p>
        </motion.div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-16">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <h2 className="text-xl font-bold">Import Complete</h2>
          <p className="text-sm text-muted-foreground">{preview?.valid} user accounts created successfully</p>
          <button
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Download Credentials CSV
          </button>
          <Link href="/admin/users" className="text-sm font-medium text-primary hover:underline">
            Back to Users
          </Link>
        </motion.div>
      )}
    </div>
  );
}
