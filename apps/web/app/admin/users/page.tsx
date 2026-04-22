'use client';

import { motion } from '@/components/motion';
import { Users, Upload, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';

const tabs = ['Students', 'Faculty'];

const studentsData = [
  { roll: '22CS001', name: 'Aarav Patel', email: 'aarav@college.edu', branch: 'CSE', year: 2, section: 'A', status: 'active' },
  { roll: '22CS002', name: 'Aditi Sharma', email: 'aditi@college.edu', branch: 'CSE', year: 2, section: 'A', status: 'active' },
  { roll: '22CS003', name: 'Arjun Deshmukh', email: 'arjun@college.edu', branch: 'CSE', year: 2, section: 'A', status: 'active' },
  { roll: '22ME001', name: 'Bhavya Joshi', email: 'bhavya@college.edu', branch: 'MECH', year: 2, section: 'A', status: 'active' },
  { roll: '22EC001', name: 'Diya Kulkarni', email: 'diya@college.edu', branch: 'E&TC', year: 2, section: 'A', status: 'inactive' },
];

const facultyData = [
  { id: 'F001', name: 'Dr. Sharma', email: 'sharma@college.edu', dept: 'CSE', designation: 'Professor', hod: false },
  { id: 'F002', name: 'Prof. Patel', email: 'patel@college.edu', dept: 'E&TC', designation: 'Assoc. Professor', hod: false },
  { id: 'F003', name: 'Dr. Gupta', email: 'gupta@college.edu', dept: 'Applied Sci', designation: 'Professor', hod: true },
  { id: 'F004', name: 'Prof. Singh', email: 'singh@college.edu', dept: 'Applied Sci', designation: 'Asst. Professor', hod: false },
];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('Students');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          <Users className="mr-2 inline-block h-6 w-6 text-primary" />
          User Management
        </motion.h1>
        <div className="flex gap-2">
          <Link href={'/admin/users/import' as '/'}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Upload className="h-4 w-4" /> Import CSV
            </motion.div>
          </Link>
          <motion.button
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Add User
          </motion.button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-border"
      >
        {activeTab === 'Students' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roll</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Branch</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Year</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Section</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {studentsData.map((s, i) => (
                <motion.tr
                  key={s.roll}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{s.roll}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.branch}</td>
                  <td className="px-4 py-3">{s.year}</td>
                  <td className="px-4 py-3">{s.section}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      s.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                    )}>
                      {s.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Designation</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">HOD</th>
              </tr>
            </thead>
            <tbody>
              {facultyData.map((f, i) => (
                <motion.tr
                  key={f.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{f.id}</td>
                  <td className="px-4 py-3">{f.name}</td>
                  <td className="px-4 py-3">{f.dept}</td>
                  <td className="px-4 py-3">{f.designation}</td>
                  <td className="px-4 py-3">
                    {f.hod && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">HOD</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
