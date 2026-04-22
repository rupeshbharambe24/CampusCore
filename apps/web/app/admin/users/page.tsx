'use client';

import { motion } from '@/components/motion';
import { Users, Upload, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBatches } from '@/lib/lookup-hooks';
import { LookupSelect } from '@/components/lookup-select';

interface StudentItem { user_id: string; full_name: string; email: string; roll_number: string; admission_year: number; lab_batch: string | null; section_name: string | null }
interface FacultyItem { user_id: string; full_name: string; email: string; employee_id: string; designation: string | null; is_hod: boolean }

const tabs = ['Students', 'Faculty'];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('Students');
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const { data: batches, isLoading: batchLoading } = useBatches();

  // Fetch real data from HOD endpoints (works for admin too via the admin list)
  const { data: students, isLoading: studLoading } = useQuery({
    queryKey: ['admin', 'students-list', search],
    queryFn: () => api.get<StudentItem[]>(`/hod/students`),
    enabled: activeTab === 'Students',
    retry: false,
  });

  const { data: faculty, isLoading: facLoading } = useQuery({
    queryKey: ['admin', 'faculty-list'],
    queryFn: () => api.get<FacultyItem[]>(`/hod/faculty`),
    enabled: activeTab === 'Faculty',
    retry: false,
  });

  const filteredStudents = (students ?? []).filter((s) => {
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase()) && !s.roll_number.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedBatch && String(s.admission_year + 4) !== selectedBatch) return false;
    return true;
  });

  const filteredFaculty = (faculty ?? []).filter((f) =>
    search ? f.full_name.toLowerCase().includes(search.toLowerCase()) || f.employee_id.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <Users className="mr-2 inline-block h-6 w-6 text-primary" />
          User Management
        </motion.h1>
        <div className="flex gap-2">
          <Link href={'/admin/users/import' as '/'}>
            <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              <Upload className="h-4 w-4" /> Import CSV
            </div>
          </Link>
        </div>
      </div>

      {/* Tabs + Search + Batch filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all', activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${activeTab.toLowerCase()}...`} className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {activeTab === 'Students' && (
          <LookupSelect items={batches} isLoading={batchLoading} value={selectedBatch} onChange={setSelectedBatch} placeholder="All batches" className="w-56" />
        )}
      </div>

      {/* Students table */}
      {activeTab === 'Students' && (
        studLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <motion.div key="students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roll</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Batch</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Division</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Lab Batch</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No students found</td></tr>
                ) : (
                  filteredStudents.map((s, i) => (
                    <motion.tr key={s.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-medium font-mono text-xs">{s.roll_number}</td>
                      <td className="px-4 py-3">{s.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.email}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{s.admission_year + 4} Batch</span></td>
                      <td className="px-4 py-3">{s.section_name ?? '—'}</td>
                      <td className="px-4 py-3">{s.lab_batch ?? '—'}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Showing {filteredStudents.length} students
            </div>
          </motion.div>
        )
      )}

      {/* Faculty table */}
      {activeTab === 'Faculty' && (
        facLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <motion.div key="faculty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Employee ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Designation</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No faculty found</td></tr>
                ) : (
                  filteredFaculty.map((f, i) => (
                    <motion.tr key={f.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-medium font-mono text-xs">{f.employee_id}</td>
                      <td className="px-4 py-3">{f.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{f.email}</td>
                      <td className="px-4 py-3">{f.designation ?? '—'}</td>
                      <td className="px-4 py-3">{f.is_hod && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">HOD</span>}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Showing {filteredFaculty.length} faculty
            </div>
          </motion.div>
        )
      )}
    </div>
  );
}
