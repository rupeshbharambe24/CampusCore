'use client';

import { motion } from '@/components/motion';
import { ScrollText, Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  created_at: string;
}

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-log', actionFilter, dateFrom],
    queryFn: () => api.get<AuditEntry[]>('/admin/audit-log'),
    retry: false,
  });

  const entries: AuditEntry[] = data ?? [];

  const filtered = entries.filter((e) => {
    if (actionFilter && !e.action.includes(actionFilter)) return false;
    if (dateFrom && e.created_at < dateFrom) return false;
    return true;
  });

  const actionColors: Record<string, string> = {
    'attendance.edit': 'bg-warning/10 text-warning',
    'attendance.submit': 'bg-success/10 text-success',
    'timetable.change': 'bg-info/10 text-info',
    'user.import': 'bg-primary/10 text-primary',
    'user.password_reset': 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold tracking-tight"
      >
        <ScrollText className="mr-2 inline-block h-6 w-6 text-primary" />
        Audit Log
      </motion.h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g., attendance.edit"
              className="flex h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-56"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Actor</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColors[entry.action] ?? 'bg-muted text-muted-foreground'}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {entry.target_type && (
                      <span className="text-muted-foreground">{entry.target_type}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {entry.actor_id?.slice(0, 8) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {entry.ip ?? '—'}
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No entries match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
