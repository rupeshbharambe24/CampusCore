'use client';

import { motion } from '@/components/motion';
import { Building2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const tabs = ['Departments', 'Branches', 'Sections', 'Subjects', 'Rooms', 'Activities'];

const demoData: Record<string, { columns: string[]; rows: string[][] }> = {
  Departments: {
    columns: ['Code', 'Name', 'Branches', 'Faculty'],
    rows: [
      ['CSE', 'Computer Science & Engineering', '3', '85'],
      ['MECH', 'Mechanical Engineering', '1', '62'],
      ['CIVIL', 'Civil Engineering', '1', '48'],
      ['E&TC', 'Electronics & Telecom', '2', '56'],
      ['IT', 'Information Technology', '1', '42'],
      ['AI&DS', 'AI & Data Science', '1', '38'],
    ],
  },
  Branches: {
    columns: ['Code', 'Name', 'Department', 'Duration'],
    rows: [
      ['CSE', 'Computer Science & Engineering', 'CSE', '4 years'],
      ['CSE-AI', 'CSE (AI & ML)', 'CSE', '4 years'],
      ['CSE-DS', 'CSE (Data Science)', 'CSE', '4 years'],
      ['MECH', 'Mechanical Engineering', 'MECH', '4 years'],
      ['CIVIL', 'Civil Engineering', 'CIVIL', '4 years'],
      ['E&TC', 'Electronics & Telecom', 'E&TC', '4 years'],
    ],
  },
  Sections: {
    columns: ['Name', 'Branch', 'Year', 'Students', 'Lab Batches'],
    rows: [
      ['A', 'CSE', '2', '62', '3'],
      ['B', 'CSE', '2', '58', '3'],
      ['C', 'CSE', '2', '60', '3'],
      ['A', 'CSE-AI', '2', '65', '3'],
      ['A', 'MECH', '2', '55', '3'],
      ['B', 'MECH', '2', '52', '3'],
    ],
  },
  Subjects: {
    columns: ['Code', 'Name', 'Credits', 'Type', 'Department'],
    rows: [
      ['CS301', 'Data Structures', '3', 'Lecture', 'CSE'],
      ['CS391', 'DS Lab', '2', 'Lab', 'CSE'],
      ['EC302', 'Digital Electronics', '3', 'Lecture', 'E&TC'],
      ['MA303', 'Mathematics III', '4', 'Lecture', 'Applied Sci'],
      ['APT301', 'Aptitude', '2', 'Aptitude', 'Applied Sci'],
    ],
  },
  Rooms: {
    columns: ['Building', 'Name', 'Capacity'],
    rows: [
      ['Main', 'LT-1', '120'],
      ['Main', 'LT-2', '120'],
      ['Main', 'LT-3', '80'],
      ['CS Block', 'Lab-201', '60'],
      ['CS Block', 'Lab-202', '60'],
      ['EC Block', 'Lab-105', '40'],
    ],
  },
  Activities: {
    columns: ['Name', 'Type', 'Coordinator', 'Members'],
    rows: [
      ['Baja SAE', 'Team', 'Dr. Sharma', '45'],
      ['Tifan', 'Team', 'Prof. Patel', '32'],
      ['NSS', 'NSS', 'Dr. Gupta', '120'],
      ['Cultural Committee', 'Cultural', 'Prof. Singh', '65'],
      ['Sports Committee', 'Sports', 'Dr. Mehta', '80'],
    ],
  },
};

export default function AcademicPage() {
  const [activeTab, setActiveTab] = useState('Departments');
  const data = demoData[activeTab]!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          <Building2 className="mr-2 inline-block h-6 w-6 text-primary" />
          Academic Structure
        </motion.h1>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> Add {activeTab.slice(0, -1)}
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={`Search ${activeTab.toLowerCase()}...`}
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden rounded-xl border border-border"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {data.columns.map((col) => (
                <th key={col} className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  {col}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3">
                    {j === 0 ? <span className="font-medium">{cell}</span> : cell}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button className="text-xs font-medium text-primary hover:underline">Edit</button>
                  <span className="mx-2 text-border">|</span>
                  <button className="text-xs font-medium text-destructive hover:underline">Delete</button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
