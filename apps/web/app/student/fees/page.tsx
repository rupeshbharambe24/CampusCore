'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { IndianRupee, Download, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FeeRecord {
  id: string; fee_type: string; description: string; amount: number;
  amount_paid: number; due_date: string | null; status: string; paid_date: string | null;
}
interface Receipt {
  id: string; receipt_number: string; amount: number; payment_date: string;
  payment_mode: string; receipt_url: string | null; remarks: string | null;
}
interface FeeSummary {
  total_fees: number; total_paid: number; total_pending: number;
  records: FeeRecord[]; receipts: Receipt[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  paid: { icon: CheckCircle2, color: 'text-success bg-success/10' },
  pending: { icon: Clock, color: 'text-warning bg-warning/10' },
  partial: { icon: AlertTriangle, color: 'text-info bg-info/10' },
  overdue: { icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
  waived: { icon: CheckCircle2, color: 'text-muted-foreground bg-muted' },
};

export default function StudentFeesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'fees'],
    queryFn: () => api.get<FeeSummary>('/students/me/fees'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const summary = data ?? { total_fees: 0, total_paid: 0, total_pending: 0, records: [], receipts: [] };

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <IndianRupee className="mr-2 inline-block h-6 w-6 text-primary" />
        Fees & Payments
      </motion.h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Total Fees</p>
          <p className="mt-1 text-2xl font-bold">₹{summary.total_fees.toLocaleString('en-IN')}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-xl border border-success/30 bg-success/5 p-5 text-center">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="mt-1 text-2xl font-bold text-success">₹{summary.total_paid.toLocaleString('en-IN')}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className={cn('rounded-xl border p-5 text-center', summary.total_pending > 0 ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5')}>
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className={cn('mt-1 text-2xl font-bold', summary.total_pending > 0 ? 'text-warning' : 'text-success')}>
            ₹{summary.total_pending.toLocaleString('en-IN')}
          </p>
        </motion.div>
      </div>

      {/* Fee records */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Fee Records</h2>
        {summary.records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No fee records yet</p>
          </div>
        ) : (
          <StaggerList className="space-y-3">
            {summary.records.map((rec) => {
              const config = statusConfig[rec.status] ?? statusConfig.pending!;
              const Icon = config.icon;
              return (
                <StaggerItem key={rec.id}>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className={cn('rounded-lg p-2', config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{rec.fee_type} Fee</p>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                        {rec.due_date && <p className="text-xs text-muted-foreground">Due: {rec.due_date}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{rec.amount.toLocaleString('en-IN')}</p>
                      {rec.amount_paid > 0 && rec.amount_paid < rec.amount && (
                        <p className="text-xs text-success">Paid: ₹{rec.amount_paid.toLocaleString('en-IN')}</p>
                      )}
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', config.color)}>
                        {rec.status}
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </div>

      {/* Receipts */}
      {summary.receipts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Payment Receipts</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Receipt #</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Mode</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {summary.receipts.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{r.receipt_number}</td>
                    <td className="px-4 py-3">{r.payment_date}</td>
                    <td className="px-4 py-3 capitalize">{r.payment_mode}</td>
                    <td className="px-4 py-3 text-right font-bold">₹{r.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">
                      {r.receipt_url ? (
                        <a href={r.receipt_url} target="_blank" rel="noreferrer" className="flex items-center justify-end gap-1 text-xs text-primary hover:underline">
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
