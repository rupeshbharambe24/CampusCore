'use client';

import { motion } from '@/components/motion';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';

type Step = 'year' | 'semester' | 'sections' | 'confirm' | 'done';

const steps: { id: Step; label: string }[] = [
  { id: 'year', label: 'Academic Year' },
  { id: 'semester', label: 'Semester' },
  { id: 'sections', label: 'Roll Sections' },
  { id: 'confirm', label: 'Confirm' },
];

export default function NewSemesterWizard() {
  const [step, setStep] = useState<Step>('year');
  const [yearLabel, setYearLabel] = useState('2026-27');
  const [yearStart, setYearStart] = useState('2026-06-01');
  const [yearEnd, setYearEnd] = useState('2027-05-31');
  const [semNumber, setSemNumber] = useState(1);
  const [semStart, setSemStart] = useState('2026-06-15');
  const [semEnd, setSemEnd] = useState('2026-11-30');
  const [rollSections, setRollSections] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentStepIdx = steps.findIndex((s) => s.id === step);

  function nextStep() {
    const idx = steps.findIndex((s) => s.id === step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]!.id);
    else {
      setIsProcessing(true);
      setTimeout(() => { setIsProcessing(false); setStep('done'); }, 2000);
    }
  }

  function prevStep() {
    const idx = steps.findIndex((s) => s.id === step);
    if (idx > 0) setStep(steps[idx - 1]!.id);
  }

  if (step === 'done') {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-16">
          <CheckCircle2 className="h-16 w-16 text-success" />
          <h1 className="text-2xl font-bold">Semester Created</h1>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Academic year {yearLabel}, Semester {semNumber} has been set up.
            {rollSections && ' Sections have been rolled over with year increments.'}
          </p>
          <div className="flex gap-3">
            <Link href={'/admin/timetable' as '/'} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Set Up Timetable
            </Link>
            <Link href={'/admin/academic' as '/'} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">
              Back to Academic Structure
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/academic" className="rounded-lg p-1.5 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <Calendar className="mr-2 inline-block h-6 w-6 text-primary" />
          Start New Semester
        </motion.h1>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
              i <= currentStepIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              {i + 1}
            </div>
            <span className={cn('text-sm font-medium hidden sm:inline', i <= currentStepIdx ? 'text-foreground' : 'text-muted-foreground')}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className={cn('h-0.5 w-8', i < currentStepIdx ? 'bg-primary' : 'bg-muted')} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-border bg-card p-6">
        {step === 'year' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Academic Year</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <input value={yearLabel} onChange={(e) => setYearLabel(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input type="date" value={yearStart} onChange={(e) => setYearStart(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input type="date" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
        )}

        {step === 'semester' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Semester Details</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Semester Number</label>
                <select value={semNumber} onChange={(e) => setSemNumber(Number(e.target.value))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring">
                  <option value={1}>Semester 1 (Odd)</option>
                  <option value={2}>Semester 2 (Even)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input type="date" value={semStart} onChange={(e) => setSemStart(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input type="date" value={semEnd} onChange={(e) => setSemEnd(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
        )}

        {step === 'sections' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Roll Over Sections</h2>
            <p className="text-sm text-muted-foreground">
              This will increment year_of_study for all existing sections and clone them into the new semester.
              Year 4 students will be graduated (sections removed).
            </p>
            <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-accent/50">
              <input type="checkbox" checked={rollSections} onChange={(e) => setRollSections(e.target.checked)} className="h-4 w-4 rounded border-input" />
              <div>
                <p className="text-sm font-medium">Auto-roll sections</p>
                <p className="text-xs text-muted-foreground">Clone sections from previous semester with incremented years</p>
              </div>
            </label>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirm</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Academic Year</p>
                <p className="text-sm font-medium">{yearLabel} ({yearStart} → {yearEnd})</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Semester</p>
                <p className="text-sm font-medium">Semester {semNumber} ({semStart} → {semEnd})</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Sections</p>
                <p className="text-sm font-medium">{rollSections ? 'Auto-roll from previous' : 'Manual setup'}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStepIdx === 0}
          className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </button>
        <button
          onClick={nextStep}
          disabled={isProcessing}
          className="flex items-center gap-1 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isProcessing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
          ) : step === 'confirm' ? (
            <><CheckCircle2 className="h-4 w-4" /> Create Semester</>
          ) : (
            <>Next <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
