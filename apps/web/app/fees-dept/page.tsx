'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { IndianRupee, Plus, Search, Upload, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FeeRecord {
  id: string; student_id: string; fee_type: string; description: string;
  amount: number; amount_paid: number; status: string; due_date: string | null;
}

export default function FeesDeptPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [feeType, setFeeType] = useState('tuition');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const qc = useQueryClient();

  const { data: records, isLoading } = useQuery({
    queryKey: ['fees', 'records', filterStatus],
    queryFn: () => api.get<FeeRecord[]>(`/fees/records${filterStatus ? `?status=${filterStatus}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: { student_id: string; fee_type: string; description: string; amount: number }) =>
      api.post('/fees/records', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); setShowCreate(false); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <IndianRupee className="mr-2 inline-block h-6 w-6 text-primary" />
          Fees Department
        </motion.h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Fee Record
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Create Fee Record</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Student ID (UUID)</label>
              <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student UUID" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fee Type</label>
              <select value={feeType} onChange={(e) => setFeeType(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                {['tuition', 'exam', 'lab', 'library', 'development', 'sports', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sem 4 Tuition Fee" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₹)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => createMutation.mutate({ student_id: studentId, fee_type: feeType, description, amount })} disabled={!studentId || !amount} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Create</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'pending', 'partial', 'paid', 'overdue'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (records ?? []).length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Paid</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {(records ?? []).map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{r.student_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 capitalize">{r.fee_type}</td>
                  <td className="px-4 py-3">{r.description}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-success">₹{r.amount_paid.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      r.status === 'paid' ? 'bg-success/10 text-success' : r.status === 'overdue' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <IndianRupee className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No fee records</p>
        </div>
      )}
    </div>
  );
}
