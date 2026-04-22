'use client';

import { motion } from '@/components/motion';
import { Building2, Plus, Search, Download, Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAdminList, type PaginatedResponse } from '@/lib/hooks';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Wand2 } from 'lucide-react';

const tabs = ['departments', 'branches', 'sections', 'subjects', 'rooms', 'activities'] as const;

const tabColumns: Record<string, string[]> = {
  departments: ['code', 'name'],
  branches: ['code', 'name', 'department_id', 'duration_years'],
  sections: ['name', 'branch_id', 'year_of_study', 'lab_batch_count'],
  subjects: ['code', 'name', 'credits', 'kind'],
  rooms: ['building', 'name', 'capacity'],
  activities: ['name', 'kind', 'is_active'],
};

// Fields for each entity's create form
const tabFields: Record<string, { name: string; type: string; placeholder: string; required?: boolean; options?: string[] }[]> = {
  departments: [
    { name: 'code', type: 'text', placeholder: 'CSE', required: true },
    { name: 'name', type: 'text', placeholder: 'Computer Science & Engineering', required: true },
  ],
  branches: [
    { name: 'department_id', type: 'text', placeholder: 'Department UUID', required: true },
    { name: 'code', type: 'text', placeholder: 'CSE-AI', required: true },
    { name: 'name', type: 'text', placeholder: 'CSE (AI & ML)', required: true },
    { name: 'duration_years', type: 'number', placeholder: '4' },
  ],
  sections: [
    { name: 'semester_id', type: 'text', placeholder: 'Semester UUID', required: true },
    { name: 'branch_id', type: 'text', placeholder: 'Branch UUID', required: true },
    { name: 'year_of_study', type: 'number', placeholder: '2', required: true },
    { name: 'name', type: 'text', placeholder: 'A', required: true },
    { name: 'lab_batch_count', type: 'number', placeholder: '3' },
  ],
  subjects: [
    { name: 'code', type: 'text', placeholder: 'CS301', required: true },
    { name: 'name', type: 'text', placeholder: 'Data Structures', required: true },
    { name: 'credits', type: 'number', placeholder: '3' },
    { name: 'kind', type: 'select', placeholder: 'lecture', options: ['lecture', 'lab', 'tutorial', 'aptitude'] },
    { name: 'department_id', type: 'text', placeholder: 'Department UUID', required: true },
  ],
  rooms: [
    { name: 'building', type: 'text', placeholder: 'Main Block', required: true },
    { name: 'name', type: 'text', placeholder: 'LT-1', required: true },
    { name: 'capacity', type: 'number', placeholder: '120' },
  ],
  activities: [
    { name: 'name', type: 'text', placeholder: 'Baja SAE', required: true },
    { name: 'kind', type: 'select', placeholder: 'club', options: ['club', 'team', 'competition', 'nss', 'sports', 'cultural', 'other'] },
    { name: 'coordinator_id', type: 'text', placeholder: 'Faculty UUID (optional)' },
  ],
};

export default function AcademicPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('departments');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useAdminList<Record<string, unknown>>(activeTab, page, 50);
  const columns = tabColumns[activeTab] ?? [];
  const fields = tabFields[activeTab] ?? [];

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/admin/${activeTab}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', activeTab] });
      setShowCreate(false);
      setFormData({});
      setCreateError(null);
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/${activeTab}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', activeTab] }),
  });

  const handleCreate = () => {
    setCreateError(null);
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const val = formData[field.name];
      if (field.required && !val) {
        setCreateError(`${field.name} is required`);
        return;
      }
      if (val) {
        body[field.name] = field.type === 'number' ? Number(val) : val;
      }
    }
    createMutation.mutate(body);
  };

  const handleExport = () => {
    if (!data?.items.length) return;
    const headers = ['id', ...columns];
    const csv = [headers.join(','), ...data.items.map((row) => headers.map((h) => String(row[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const items = data?.items ?? [];
  const filtered = search
    ? items.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(search.toLowerCase())))
    : items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
          <Building2 className="mr-2 inline-block h-6 w-6 text-primary" />
          Academic Structure
        </motion.h1>
        <div className="flex gap-2">
          <Link href={'/admin/academic/new-semester' as '/'} className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
            <Wand2 className="h-4 w-4" /> New Semester
          </Link>
          <button onClick={handleExport} disabled={!items.length} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setFormData({}); setCreateError(null); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20"
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? 'Close' : `Add ${activeTab.slice(0, -1)}`}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); setSearch(''); setShowCreate(false); setFormData({}); }}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap capitalize',
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold capitalize">Add {activeTab.slice(0, -1)}</h2>

          {createError && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {createError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-sm font-medium capitalize">{field.name.replace(/_/g, ' ')}{field.required ? ' *' : ''}</label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] ?? field.options?.[0] ?? ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setFormData({}); setCreateError(null); }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeTab}...`}
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-semibold text-muted-foreground capitalize">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {items.length === 0 ? `No ${activeTab} yet. Click "Add" above to create one.` : 'No matches found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <motion.tr
                    key={String(row.id)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    {columns.map((col, j) => (
                      <td key={col} className="px-4 py-3">
                        {j === 0 ? <span className="font-medium">{String(row[col] ?? '')}</span> : String(row[col] ?? '')}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(String(row.id))}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Page {data.page} of {data.pages} ({data.total} total)</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50">Previous</button>
                <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="rounded-md px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
