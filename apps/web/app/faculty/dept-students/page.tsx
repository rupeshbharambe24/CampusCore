'use client';

import { motion } from '@/components/motion';
import { GraduationCap, Search, Loader2 } from 'lucide-react';
import { useHodStudents } from '@/lib/hod-hooks';
import { useState } from 'react';

export default function DeptStudentsPage() {
  const { data, isLoading } = useHodStudents();
  const [search, setSearch] = useState('');

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const students = (data ?? []).filter((s) =>
    search ? s.full_name.toLowerCase().includes(search.toLowerCase()) || s.roll_number.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <GraduationCap className="mr-2 inline-block h-6 w-6 text-primary" />
        Department Students ({data?.length ?? 0})
      </motion.h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or roll number..." className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roll</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Year</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Division</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Batch</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <motion.tr key={s.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 font-medium">{s.roll_number}</td>
                <td className="px-4 py-3">{s.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{s.email}</td>
                <td className="px-4 py-3">{s.admission_year}</td>
                <td className="px-4 py-3">{s.section_name ?? '—'}</td>
                <td className="px-4 py-3">{s.lab_batch ?? '—'}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
