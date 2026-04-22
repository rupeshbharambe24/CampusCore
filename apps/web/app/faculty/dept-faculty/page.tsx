'use client';

import { motion } from '@/components/motion';
import { Users, Loader2 } from 'lucide-react';
import { useHodFaculty } from '@/lib/hod-hooks';
import { cn } from '@/lib/utils';

export default function DeptFacultyPage() {
  const { data, isLoading } = useHodFaculty();

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <Users className="mr-2 inline-block h-6 w-6 text-primary" />
        Department Faculty
      </motion.h1>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Employee ID</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Designation</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Role</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((f, i) => (
              <motion.tr key={f.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 font-medium">{f.full_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{f.employee_id}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.email}</td>
                <td className="px-4 py-3">{f.designation ?? '—'}</td>
                <td className="px-4 py-3">
                  {f.is_hod && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">HOD</span>}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
